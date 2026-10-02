#!/usr/bin/env node
// Trustworthy test runner and evidence recorder. Zero dependencies (Node >= 20, uses the node:test run() API).
//
// Why: `node --test` prints "ok ... # SKIP" and exits 0 when tests are skipped, so a machine without a browser
// "passes" every browser test (reproduced in run 2: 8 of 8 skipped, exit 0). This tool never lets that read as success.
//
// Outcome per run:  FAIL (any failed test or file that does not load)  >  INCOMPLETE (any skipped / todo / cancelled
// test, a suite with zero tests, or a missing required capability)  >  PASS.
// There is no CONDITIONAL for tests: a skipped test is missing evidence, not a soft warning.
//
// Evidence binding: a written report records the exact CONTENT of everything in the tested scope (sha256 per file and
// one contentHash), the environment (node, playwright, chromium, os) and the git state. `--verify` re-computes both
// and reports STALE when anything relevant changed, so an old PASS can never be reused for new content.
// The commit SHA is informational only (a report is usually written before the commit that contains it): contentHash decides.
//
// Usage:
//   node meta/tools/run-tests.mjs [--suite=skill-scripts|meta-tools|all] [--write[=path]] [--json]
//   node meta/tools/run-tests.mjs --verify=meta/evidence/tests-all.json
//   (--root=<dir> points the tool at another repository root; used by this tool's own tests)
// Exit codes: 0 PASS (or verified PASS), 1 FAIL, 2 could not run, 3 INCOMPLETE or STALE.

import { run } from 'node:test';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPORT_SCHEMA = 'test-report/0.1';
const SKIP_DIRS = new Set(['node_modules', '.git', 'evidence']);

/** Suites known to this repository. `scope` = directories whose exact content the evidence is bound to. */
export const SUITES = {
  'skill-scripts': { dir: 'persian-website-builder/scripts', scope: ['persian-website-builder'], requires: ['browser'] },
  'meta-tools': { dir: 'meta/tools', scope: ['meta/tools', 'persian-website-builder'], requires: [] },
};

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function listFiles(root, rel) {
  const base = join(root, rel);
  const out = [];
  if (!existsSync(base)) return out;
  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      if (SKIP_DIRS.has(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else out.push(p);
    }
  };
  if (statSync(base).isDirectory()) walk(base); else out.push(base);
  return out;
}

/** Hash the exact content of every file under the scope directories. */
export function scopeHash(root, scope) {
  const files = [...new Set(scope.flatMap((s) => listFiles(root, s)))].sort()
    .map((p) => ({ path: relative(root, p).split('\\').join('/'), sha256: sha256(readFileSync(p)) }));
  const contentHash = sha256(files.map((f) => `${f.path}\0${f.sha256}`).join('\n'));
  return { files, contentHash };
}

export async function captureEnv() {
  const env = { node: process.version, platform: process.platform, arch: process.arch, playwright: null, chromium: null, chromiumError: null };
  try {
    const require = createRequire(import.meta.url);
    env.playwright = require('playwright/package.json').version;
    const { chromium } = require('playwright');
    const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
    env.chromium = browser.version();
    await browser.close();
  } catch (e) { env.chromiumError = String(e.message ?? e).split('\n')[0]; }
  return env;
}

export function gitInfo(root) {
  const git = (...a) => { try { return execFileSync('git', a, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; } };
  const head = git('rev-parse', 'HEAD');
  if (!head) return { head: null, branch: null, dirty: null, note: 'not a git repository or git unavailable' };
  const porcelain = git('status', '--porcelain') ?? '';
  return { head, branch: git('rev-parse', '--abbrev-ref', 'HEAD'), dirty: porcelain.length > 0, dirtyFiles: porcelain.split('\n').filter(Boolean).slice(0, 50) };
}

/** Run test files with the node:test API and classify each top-level test. */
export async function runFiles(files, { timeoutMs = 180000 } = {}) {
  const tests = [];
  // When this tool is itself started by `node --test`, NODE_TEST_CONTEXT is set and node:test silently skips a nested
  // run() ("called recursively ... skipping running files"), which would report zero tests. Clear it for the nested run.
  const savedContext = process.env.NODE_TEST_CONTEXT;
  delete process.env.NODE_TEST_CONTEXT;
  const stream = run({ files, concurrency: 1, timeout: timeoutMs });
  try { await collect(stream, tests); } finally { if (savedContext !== undefined) process.env.NODE_TEST_CONTEXT = savedContext; }
  return tests;
}

async function collect(stream, tests) {
  for await (const ev of stream) {
    if (ev.type !== 'test:pass' && ev.type !== 'test:fail' && ev.type !== 'test:cancel') continue;
    const d = ev.data;
    if (d.nesting !== 0) continue;
    let status = 'pass';
    let reason = null;
    if (ev.type === 'test:fail') { status = 'fail'; reason = d.details?.error?.message?.split('\n')[0] ?? 'test failed'; }
    else if (d.skip) { status = 'skipped'; reason = typeof d.skip === 'string' ? d.skip : 'skipped'; }
    else if (d.todo) { status = 'todo'; reason = typeof d.todo === 'string' ? d.todo : 'todo'; }
    if (ev.type === 'test:cancel') { status = 'cancelled'; reason = 'cancelled'; }
    tests.push({ file: d.file ? d.file : null, name: d.name, status, ...(reason ? { reason } : {}) });
  }
}

export function evaluate(suites, env) {
  const reasons = [];
  const count = (s) => suites.reduce((n, su) => n + su.tests.filter((t) => t.status === s).length, 0);
  const counts = { total: suites.reduce((n, su) => n + su.tests.length, 0), pass: count('pass'), fail: count('fail'), skipped: count('skipped'), todo: count('todo'), cancelled: count('cancelled') };
  let verdict = 'PASS';
  if (counts.fail > 0) { verdict = 'FAIL'; reasons.push(`${counts.fail} test(s) failed`); }
  const gaps = [];
  if (counts.skipped) gaps.push(`${counts.skipped} test(s) skipped`);
  if (counts.todo) gaps.push(`${counts.todo} test(s) marked todo`);
  if (counts.cancelled) gaps.push(`${counts.cancelled} test(s) cancelled`);
  for (const su of suites) {
    if (su.tests.length === 0) gaps.push(`suite "${su.name}" contains no tests`);
    if (su.requires?.includes('browser') && !env?.chromium) gaps.push(`suite "${su.name}" requires a browser but none could be launched (${env?.chromiumError ?? 'unknown reason'})`);
  }
  if (counts.total === 0) gaps.push('no tests were executed');
  if (gaps.length) { reasons.push(...gaps); if (verdict !== 'FAIL') verdict = 'INCOMPLETE'; }
  return { verdict, counts, reasons };
}

export async function buildTestReport({ root, suiteNames, timeoutMs }) {
  const env = await captureEnv();
  const suites = [];
  const scope = new Set();
  for (const name of suiteNames) {
    const def = SUITES[name];
    if (!def) throw new Error(`unknown suite "${name}" (known: ${Object.keys(SUITES).join(', ')})`);
    const dir = join(root, def.dir);
    const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.test.mjs')).sort().map((f) => join(dir, f)) : [];
    const tests = files.length ? await runFiles(files, { timeoutMs }) : [];
    suites.push({ name, dir: def.dir, requires: def.requires, files: files.map((f) => relative(root, f).split('\\').join('/')), tests: tests.map((t) => ({ ...t, file: t.file ? relative(root, t.file).split('\\').join('/') : null })) });
    def.scope.forEach((s) => scope.add(s));
  }
  const scopeRoots = [...scope].sort();
  const bound = scopeHash(root, scopeRoots);
  return {
    schema: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    git: gitInfo(root),
    env,
    scope: { roots: scopeRoots, contentHash: bound.contentHash, files: bound.files },
    suites,
    ...evaluate(suites, env),
  };
}

/** Compare a stored report with the CURRENT content and environment. */
export async function verifyReport(report, root) {
  const reasons = [];
  if (report.schema !== REPORT_SCHEMA) return { status: 'INVALID', reasons: [`unknown report schema ${report.schema}`] };
  const now = scopeHash(root, report.scope.roots);
  if (now.contentHash !== report.scope.contentHash) {
    const before = new Map(report.scope.files.map((f) => [f.path, f.sha256]));
    const after = new Map(now.files.map((f) => [f.path, f.sha256]));
    const changed = [...after].filter(([p, h]) => before.has(p) && before.get(p) !== h).map(([p]) => p);
    const added = [...after.keys()].filter((p) => !before.has(p));
    const removed = [...before.keys()].filter((p) => !after.has(p));
    reasons.push(`content changed since the report: ${changed.length} modified, ${added.length} added, ${removed.length} removed`);
    for (const p of [...changed, ...added.map((x) => `+${x}`), ...removed.map((x) => `-${x}`)].slice(0, 15)) reasons.push(`  ${p}`);
  }
  const env = await captureEnv();
  for (const k of ['node', 'platform', 'arch', 'playwright', 'chromium']) {
    if (env[k] !== report.env[k]) reasons.push(`environment differs: ${k} was ${report.env[k]} now ${env[k]}`);
  }
  if (reasons.length) return { status: 'STALE', reasons };
  return { status: report.verdict === 'PASS' ? 'VERIFIED' : report.verdict, reasons: report.reasons };
}

export function exitCodeFor(v) { return { PASS: 0, VERIFIED: 0, FAIL: 1, INCOMPLETE: 3, STALE: 3 }[v] ?? 2; }

export function renderTestReport(r) {
  const lines = [];
  for (const su of r.suites) {
    const c = (s) => su.tests.filter((t) => t.status === s).length;
    lines.push(`suite ${su.name}: ${su.tests.length} test(s): ${c('pass')} pass, ${c('fail')} fail, ${c('skipped')} skipped, ${c('todo')} todo, ${c('cancelled')} cancelled`);
    for (const t of su.tests) if (t.status !== 'pass') lines.push(`  ${t.status.toUpperCase().padEnd(9)} ${t.name}${t.reason ? `  [${t.reason}]` : ''}`);
  }
  lines.push('');
  lines.push(`environment: node ${r.env.node}, playwright ${r.env.playwright ?? 'MISSING'}, chromium ${r.env.chromium ?? 'MISSING'}, ${r.env.platform}/${r.env.arch}`);
  lines.push(`scope: ${r.scope.roots.join(', ')}  contentHash ${r.scope.contentHash.slice(0, 16)}…  git ${r.git.head ? r.git.head.slice(0, 10) : 'n/a'}${r.git.dirty ? ' (dirty tree)' : ''}`);
  lines.push(`VERDICT: ${r.verdict}${r.reasons.length ? ` (${r.reasons.join('; ')})` : ''}`);
  if (r.verdict === 'INCOMPLETE') lines.push('Not verified: skipped/missing evidence is not a pass. Fix the environment or the tests and re-run.');
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const val = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=').slice(1).join('=');
  const root = val('root') ? resolve(val('root')) : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
  const has = (n) => args.includes(`--${n}`) || args.some((a) => a.startsWith(`--${n}=`));
  try {
    if (val('verify')) {
      const report = JSON.parse(readFileSync(resolve(root, val('verify')), 'utf8'));
      const v = await verifyReport(report, root);
      console.log(`${v.status}${v.reasons.length ? `\n  ${v.reasons.join('\n  ')}` : ''}`);
      if (v.status === 'STALE') console.log('The stored result does not describe the current content/environment: re-run the tests.');
      process.exit(exitCodeFor(v.status));
    }
    const wanted = (val('suite') ?? 'all');
    const suiteNames = wanted === 'all' ? Object.keys(SUITES) : wanted.split(',');
    const report = await buildTestReport({ root, suiteNames });
    if (has('write')) {
      const path = resolve(root, val('write') ?? `meta/evidence/tests-${wanted}.json`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
      console.error(`report written: ${relative(root, path)}`);
    }
    console.log(has('json') ? JSON.stringify(report, null, 2) : renderTestReport(report));
    process.exit(exitCodeFor(report.verdict));
  } catch (e) { console.error(`CANNOT RUN: ${e.message}`); process.exit(2); }
}
