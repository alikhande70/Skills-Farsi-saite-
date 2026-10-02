import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runFiles, evaluate, scopeHash, verifyReport, captureEnv, REPORT_SCHEMA, exitCodeFor } from './run-tests.mjs';

const CLI = fileURLToPath(new URL('./run-tests.mjs', import.meta.url));
const dir = () => mkdtempSync(join(tmpdir(), 'run-tests-'));
const put = (root, rel, content) => { const p = join(root, rel); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, content); return p; };
const cli = (args) => new Promise((resolve) => {
  const c = spawn(process.execPath, [CLI, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; let err = '';
  c.stdout.on('data', (d) => (out += d)); c.stderr.on('data', (d) => (err += d));
  c.on('close', (code) => resolve({ code, out, err }));
});

test('runFiles separates pass, skip (option and in-body), todo, fail and a file that does not load', async () => {
  const root = dir();
  const a = put(root, 'a.test.mjs', `import test from 'node:test';
test('ok', () => {});
test('skip option', { skip: 'because' }, () => {});
test('skip body', (t) => { t.skip('no browser'); });
test('todo', { todo: 'later' }, () => {});
test('boom', () => { throw new Error('boom'); });`);
  const b = put(root, 'b.test.mjs', "import './missing.mjs'; import test from 'node:test'; test('x', () => {});");
  const tests = await runFiles([a, b]);
  const by = Object.fromEntries(tests.map((t) => [t.name.split('/').pop(), t.status]));
  assert.equal(by['ok'], 'pass');
  assert.equal(by['skip option'], 'skipped');
  assert.equal(by['skip body'], 'skipped');
  assert.equal(by['todo'], 'todo');
  assert.equal(by['boom'], 'fail');
  assert.equal(by['b.test.mjs'], 'fail', 'a file that cannot load must count as a failure');
});

const suite = (...statuses) => ({ name: 's', requires: [], tests: statuses.map((status, i) => ({ name: `t${i}`, status })) });
const browserOk = { chromium: '141' };

test('verdicts: all pass is PASS; skipped/todo/cancelled/empty are INCOMPLETE; fail wins', () => {
  assert.equal(evaluate([suite('pass', 'pass')], browserOk).verdict, 'PASS');
  assert.equal(evaluate([suite('pass', 'skipped')], browserOk).verdict, 'INCOMPLETE');
  assert.equal(evaluate([suite('pass', 'todo')], browserOk).verdict, 'INCOMPLETE');
  assert.equal(evaluate([suite('pass', 'cancelled')], browserOk).verdict, 'INCOMPLETE');
  assert.equal(evaluate([suite()], browserOk).verdict, 'INCOMPLETE');
  assert.equal(evaluate([], browserOk).verdict, 'INCOMPLETE');
  assert.equal(evaluate([suite('pass', 'skipped', 'fail')], browserOk).verdict, 'FAIL');
});

test('a suite that requires a browser is INCOMPLETE without one, even if nothing was reported as skipped', () => {
  const s = { name: 'browser-suite', requires: ['browser'], tests: [{ name: 't', status: 'pass' }] };
  const r = evaluate([s], { chromium: null, chromiumError: 'launch failed' });
  assert.equal(r.verdict, 'INCOMPLETE');
  assert.match(r.reasons.join(' '), /requires a browser/);
});

test('exit codes: PASS/VERIFIED 0, FAIL 1, INCOMPLETE/STALE 3, anything else 2', () => {
  assert.deepEqual(['PASS', 'VERIFIED', 'FAIL', 'INCOMPLETE', 'STALE', 'INVALID'].map(exitCodeFor), [0, 0, 1, 3, 3, 2]);
});

test('scopeHash is stable, order-independent, content-sensitive and ignores node_modules/evidence', () => {
  const root = dir();
  put(root, 'a/one.txt', '1'); put(root, 'a/two.txt', '2');
  const h1 = scopeHash(root, ['a']);
  assert.equal(scopeHash(root, ['a']).contentHash, h1.contentHash);
  put(root, 'a/node_modules/x.js', 'ignored'); put(root, 'a/evidence/r.json', '{}');
  assert.equal(scopeHash(root, ['a']).contentHash, h1.contentHash, 'ignored folders must not affect the hash');
  put(root, 'a/two.txt', '2!');
  assert.notEqual(scopeHash(root, ['a']).contentHash, h1.contentHash);
});

async function reportFor(root, verdict = 'PASS') {
  const bound = scopeHash(root, ['a']);
  return { schema: REPORT_SCHEMA, verdict, reasons: [], env: await captureEnv(), scope: { roots: ['a'], contentHash: bound.contentHash, files: bound.files } };
}

test('verifyReport: unchanged content+environment is VERIFIED; a modified, added or removed file is STALE and named', async () => {
  const root = dir();
  put(root, 'a/one.txt', '1');
  const report = await reportFor(root);
  assert.equal((await verifyReport(report, root)).status, 'VERIFIED');
  put(root, 'a/one.txt', 'changed');
  let v = await verifyReport(report, root);
  assert.equal(v.status, 'STALE');
  assert.match(v.reasons.join('\n'), /a\/one\.txt/);
  put(root, 'a/one.txt', '1'); put(root, 'a/new.txt', 'x');
  v = await verifyReport(report, root);
  assert.equal(v.status, 'STALE');
  assert.match(v.reasons.join('\n'), /\+a\/new\.txt/);
});

test('verifyReport: an environment change makes a PASS stale; a stored FAIL stays FAIL', async () => {
  const root = dir();
  put(root, 'a/one.txt', '1');
  const report = await reportFor(root);
  const other = { ...report, env: { ...report.env, node: 'v0.0.1' } };
  const v = await verifyReport(other, root);
  assert.equal(v.status, 'STALE');
  assert.match(v.reasons.join('\n'), /node/);
  assert.equal((await verifyReport(await reportFor(root, 'FAIL'), root)).status, 'FAIL');
});

test('CLI --verify: exit 0 for a verified PASS, exit 3 and a STALE message after content changes', async () => {
  const root = dir();
  put(root, 'a/one.txt', '1');
  const reportPath = put(root, 'report.json', JSON.stringify(await reportFor(root)));
  let r = await cli([`--root=${root}`, `--verify=${reportPath}`]);
  assert.equal(r.code, 0, `${r.out}${r.err}`);
  assert.match(r.out, /VERIFIED/);
  put(root, 'a/one.txt', 'edited');
  r = await cli([`--root=${root}`, `--verify=${reportPath}`]);
  assert.equal(r.code, 3, `${r.out}${r.err}`);
  assert.match(r.out, /STALE/);
});

test('CLI: an unknown suite is "could not run" (exit 2)', async () => {
  const r = await cli(['--suite=nope']);
  assert.equal(r.code, 2);
  assert.match(r.err, /CANNOT RUN/);
});
