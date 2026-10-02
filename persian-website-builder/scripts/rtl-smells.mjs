#!/usr/bin/env node
// RTL / Persian smell detector. Zero dependencies. Heuristic: it finds *candidates* for review,
// it does not prove a bug. Suppress a line with the comment text `rtl-ignore`.
//
// Usage: node rtl-smells.mjs <dir|file> [--json]
// Exit code: 1 if any finding with severity "error", else 0.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

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

function* walk(path) {
  const st = statSync(path);
  if (st.isFile()) {
    if (EXTS.has(extname(path))) yield path;
    return;
  }
  for (const name of readdirSync(path)) {
    if (SKIP_DIRS.has(name)) continue;
    yield* walk(join(path, name));
  }
}

export function scanPath(root) {
  const all = [];
  for (const file of walk(root)) all.push(...scanText(readFileSync(file, 'utf8'), file));
  return all;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) {
    console.error('Usage: node rtl-smells.mjs <dir|file> [--json]');
    process.exit(2);
  }
  const findings = scanPath(target);
  if (asJson) console.log(JSON.stringify(findings, null, 2));
  else {
    for (const f of findings) console.log(`${f.file}:${f.line}  ${f.severity.toUpperCase().padEnd(5)} ${f.id}  ${f.msg}`);
    const by = (s) => findings.filter((f) => f.severity === s).length;
    console.log(`\n${findings.length} finding(s): ${by('error')} error, ${by('warn')} warn, ${by('info')} info`);
  }
  process.exit(findings.some((f) => f.severity === 'error') ? 1 : 0);
}
