#!/usr/bin/env node
// RTL / Persian smell detector. Zero dependencies. Heuristic: it finds *candidates* for review,
// it does not prove a bug. Suppress a line with the comment text `rtl-ignore`.
//
// Usage: node rtl-smells.mjs <dir|file> [--json]
// Result model (scripts/verdict.mjs): PASS | CONDITIONAL | FAIL | INCOMPLETE.
// Exit codes: 0 PASS/CONDITIONAL, 1 FAIL (an error-level smell exists), 2 could not run (path unreadable),
// 3 INCOMPLETE (nothing scannable was found, or a file could not be read). A scan of zero files is never a pass.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createLedger, buildReport, renderText, exitCodeFor } from './verdict.mjs';

const EXTS = new Set(['.css', '.scss', '.sass', '.less', '.html', '.htm', '.jsx', '.tsx', '.js', '.ts', '.vue', '.svelte', '.astro', '.mdx']);
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.nuxt', '.svelte-kit', 'coverage', '.output']);

// Each rule: id, severity, regex (per line), message. Order = display order.
export const RULES = [
  { id: 'RTL001', severity: 'warn', re: /\b(margin|padding)-(left|right)\b\s*:/i, msg: 'Physical margin/padding. Use margin-inline-start/end or padding-inline-start/end.' },
  { id: 'RTL002', severity: 'warn', re: /\bborder-(left|right)(-width|-color|-style)?\b\s*:/i, msg: 'Physical border side. Use border-inline-start/end.' },
  { id: 'RTL003', severity: 'warn', re: /(^|[;{\s])(left|right)\s*:\s*(?!auto\b|inherit\b|initial\b|unset\b)[-\d.]/i, msg: 'Physical offset. Use inset-inline-start/end (unless the element is intentionally direction-independent).' },
  { id: 'RTL004', severity: 'warn', re: /\b(float|clear)\s*:\s*(left|right)\b/i, msg: 'Physical float/clear. Use inline-start/inline-end.' },
  { id: 'RTL005', severity: 'warn', re: /\btext-align\s*:\s*(left|right)\b/i, msg: 'Physical text-align. Use start/end.' },
  { id: 'RTL006', severity: 'info', re: /\bborder-(top|bottom)-(left|right)-radius\b|\bborder-radius\s*:\s*[^;]*\s[^;]*\s[^;]*\s[^;]+;/i, msg: 'Corner radii may need logical equivalents (border-start-start-radius ...) if asymmetric.' },
  { id: 'RTL007', severity: 'warn', re: /(["'`\s])(m|p)(l|r)-\d|(["'`\s])(left|right)-\d|(["'`\s])text-(left|right)\b|(["'`\s])(float|clear)-(left|right)\b|(["'`\s])rounded-(l|r|tl|tr|bl|br)\b|(["'`\s])border-(l|r)\b/, msg: 'Tailwind physical utility. Use ms-/me-/ps-/pe-/start-/end-/text-start/text-end/rounded-s/rounded-e/border-s/border-e.' },
  { id: 'RTL008', severity: 'warn', re: /letter-spacing\s*:\s*(?!(?:0|0\.0+)(?:px|em|rem)?\s*(?:[;}"'!]|$)|normal\b|inherit\b|unset\b|initial\b)/i, msg: 'Non-zero letter-spacing breaks Arabic-script joining/ligatures. Never apply to Persian text.' },
  { id: 'RTL009', severity: 'info', re: /\bfont-style\s*:\s*italic\b|<(i|em)\b/i, msg: 'Italic/slanted Persian text is not a Persian typographic convention. Check that it is not applied to Persian copy.' },
  { id: 'RTL010', severity: 'warn', re: /\b(translateX|scaleX)\(/i, msg: 'Horizontal transform: verify it mirrors in RTL (animations, drawers, carousels, progress bars).' },
  { id: 'IRN001', severity: 'warn', re: /(fonts\.googleapis\.com|fonts\.gstatic\.com|use\.typekit\.net|use\.fontawesome\.com)/i, msg: 'Third-party font host. Self-host fonts (reachability, privacy, performance).' },
  { id: 'IRN002', severity: 'warn', re: /(www\.google-analytics\.com|googletagmanager\.com|google\.com\/recaptcha|gstatic\.com\/recaptcha|maps\.googleapis\.com|connect\.facebook\.net|platform\.twitter\.com)/i, msg: 'Foreign third-party script. A critical flow must not depend on it (see references/iran-context.md, Principle I-2).' },
  { id: 'IRN003', severity: 'info', re: /(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|cdn\.tailwindcss\.com|code\.jquery\.com)/i, msg: 'Public CDN for runtime assets. Bundle and self-host production dependencies.' },
];

const HTML_TAG = /<html\b[^>]*>/i;

export function scanText(text, file = '<memory>') {
  const findings = [];
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (/rtl-ignore/.test(line)) return;
    for (const rule of RULES) {
      if (rule.re.test(line)) findings.push({ file, line: i + 1, id: rule.id, severity: rule.severity, msg: rule.msg });
    }
  });
  const tag = HTML_TAG.exec(text);
  if (tag && !/<html\b[^>]*\blang=/i.test(tag[0])) {
    findings.push({ file, line: lineOf(text, tag.index), id: 'RTL011', severity: 'error', msg: '<html> has no lang attribute. Persian pages need lang="fa" (screen readers, hyphenation, search engines).' });
  }
  if (tag && /\blang=["']?fa/i.test(tag[0]) && !/\bdir=["']?rtl/i.test(tag[0])) {
    findings.push({ file, line: lineOf(text, tag.index), id: 'RTL012', severity: 'error', msg: '<html lang="fa"> without dir="rtl".' });
  }
  return findings;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

export class ScanError extends Error {}

function* walk(path, unreadable) {
  let st;
  try { st = statSync(path); } catch (e) { unreadable.push(`${path}: ${e.code ?? e.message}`); return; }
  if (st.isFile()) {
    if (EXTS.has(extname(path))) yield path;
    return;
  }
  let names;
  try { names = readdirSync(path); } catch (e) { unreadable.push(`${path}: ${e.code ?? e.message}`); return; }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    yield* walk(join(path, name), unreadable);
  }
}

/** Findings only (kept for callers that do not need the verdict). */
export function scanPath(root) {
  return scanReport(root).checks.filter((c) => c.file).map((c) => ({ file: c.file, line: c.line, id: c.id, severity: c.status === 'fail' ? 'error' : c.status, msg: c.msg }));
}

export function scanReport(root) {
  try { statSync(root); } catch (e) { throw new ScanError(`cannot read ${root}: ${e.code ?? e.message}`); }
  const L = createLedger();
  const unreadable = [];
  const found = [];
  let files = 0;
  let htmlTags = 0;
  for (const file of walk(root, unreadable)) {
    let text;
    try { text = readFileSync(file, 'utf8'); } catch (e) { unreadable.push(`${file}: ${e.code ?? e.message}`); continue; }
    files += 1;
    if (HTML_TAG.test(text)) htmlTags += 1;
    found.push(...scanText(text, file));
  }
  for (const u of unreadable) L.add('RTL-READ', 'incomplete', 'could not read a file or directory', { detail: u });
  if (files === 0) L.add('RTL-SCAN', 'incomplete', `no scannable files under ${root} (looked for: ${[...EXTS].join(' ')})`);
  for (const f of found) L.add(f.id, f.severity === 'error' ? 'fail' : f.severity, f.msg, { file: f.file, line: f.line, detail: `${f.file}:${f.line}` });
  if (files > 0) {
    const ids = [...RULES.map((r) => r.id), 'RTL011', 'RTL012'];
    for (const id of ids) {
      if (found.some((f) => f.id === id)) continue;
      const htmlOnly = id === 'RTL011' || id === 'RTL012';
      if (htmlOnly && htmlTags === 0) L.add(id, 'not-applicable', 'no <html> tag in the scanned files');
      else L.add(id, 'pass', `no occurrence in ${files} file(s)`);
    }
  }
  return buildReport('rtl-smells', { target: root, filesScanned: files }, L.checks);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('Usage: node rtl-smells.mjs <dir|file> [--json]');
    process.exit(2);
  }
  try {
    const report = scanReport(target);
    console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : `${renderText(report)}\nFiles scanned: ${report.filesScanned}`);
    process.exit(exitCodeFor(report.verdict));
  } catch (e) {
    console.error(`CANNOT RUN: ${e.message}. Nothing was verified.`);
    process.exit(2);
  }
}
