#!/usr/bin/env node
// HTTP-level security smoke test. Zero dependencies (Node >= 18 global fetch).
// RUN ONLY AGAINST SYSTEMS YOU OWN OR ARE EXPLICITLY AUTHORIZED TO TEST. It sends a handful of GET requests.
//
// Usage: node security-smoke.mjs <baseUrl> [--json]
// Covers (references/security.md): §6 headers, §2 cookie flags, §11 exposed paths, §5 CORS reflection.
// It is a smoke test, not a scanner: a clean result does not mean the site is secure (AP-027).
// Expected values come from OWASP Cheat Sheets read on 2026-10-01 (E-042); re-check them over time.

import { pathToFileURL } from 'node:url';

// Signature checks avoid false positives from single-page apps that answer 200 to every path.
const EXPOSED = [
  ['/.git/config', (b) => /\[core\]/.test(b), 'git repository metadata is public'],
  ['/.env', (b) => /^[A-Z][A-Z0-9_]+\s*=/m.test(b), '.env file is public (secrets)'],
  ['/backup.sql', (b) => /CREATE TABLE|INSERT INTO/i.test(b), 'database dump is public'],
  ['/dump.sql', (b) => /CREATE TABLE|INSERT INTO/i.test(b), 'database dump is public'],
  ['/phpinfo.php', (b) => /phpinfo\(\)|PHP Version/i.test(b), 'phpinfo is public'],
  ['/server-status', (b) => /Apache Server Status/i.test(b), 'server-status is public'],
  ['/.DS_Store', (b) => b.startsWith('\u0000\u0000\u0000\u0001Bud1'), '.DS_Store leaks file names'],
];

export async function smoke(baseUrl, { fetchImpl = fetch } = {}) {
  const base = new URL(baseUrl);
  const findings = [];
  const add = (id, severity, msg) => findings.push({ id, severity, msg });
  const isHttps = base.protocol === 'https:';

  const res = await fetchImpl(base, { redirect: 'manual', headers: { 'user-agent': 'security-smoke/0.1' } });
  const h = (n) => res.headers.get(n);

  if (!/nosniff/i.test(h('x-content-type-options') ?? '')) add('SEC-001', 'error', 'missing X-Content-Type-Options: nosniff');
  if (!h('referrer-policy')) add('SEC-002', 'warn', 'missing Referrer-Policy (OWASP: strict-origin-when-cross-origin)');

  const csp = h('content-security-policy');
  if (!csp) add('SEC-003', h('content-security-policy-report-only') ? 'info' : 'warn', h('content-security-policy-report-only') ? 'CSP is report-only (enforce after zero own-page violations)' : 'no Content-Security-Policy');
  else {
    if (/'unsafe-inline'|'unsafe-eval'/.test(csp)) add('SEC-003', 'warn', "CSP allows 'unsafe-inline' or 'unsafe-eval'");
    if (/(^|[\s;])\*(\s|;|$)/.test(csp)) add('SEC-003', 'warn', 'CSP contains a wildcard source');
  }

  if (isHttps) {
    const hsts = h('strict-transport-security');
    const maxAge = Number(/max-age=(\d+)/i.exec(hsts ?? '')?.[1] ?? 0);
    if (!hsts) add('SEC-004', 'error', 'missing Strict-Transport-Security on an HTTPS site');
    else if (maxAge < 31536000) add('SEC-004', 'warn', `HSTS max-age ${maxAge}s is short (OWASP: 63072000)`);
  } else add('SEC-004', 'info', 'plain HTTP target: HSTS/Secure-cookie checks skipped (production must be HTTPS)');

  if (!h('x-frame-options') && !/frame-ancestors/i.test(csp ?? '')) add('SEC-005', 'warn', 'no clickjacking protection (X-Frame-Options or CSP frame-ancestors)');
  if (h('x-powered-by')) add('SEC-006', 'warn', `X-Powered-By discloses "${h('x-powered-by')}"`);
  if (/\d/.test(h('server') ?? '')) add('SEC-006', 'warn', `Server header discloses version "${h('server')}"`);
  if (!h('permissions-policy')) add('SEC-007', 'info', 'no Permissions-Policy');
  if (!h('cross-origin-opener-policy')) add('SEC-007', 'info', 'no Cross-Origin-Opener-Policy');

  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  for (const c of cookies) {
    const name = c.split('=')[0];
    if (isHttps && !/;\s*secure/i.test(c)) add('SEC-008', 'error', `cookie "${name}" lacks Secure`);
    if (!/;\s*httponly/i.test(c)) add('SEC-008', 'warn', `cookie "${name}" lacks HttpOnly (fine only if JS must read it)`);
    if (!/;\s*samesite=/i.test(c)) add('SEC-008', 'warn', `cookie "${name}" lacks SameSite`);
  }

  for (const [path, test, msg] of EXPOSED) {
    try {
      const r = await fetchImpl(new URL(path, base), { redirect: 'manual' });
      if (r.status === 200 && test(await r.text())) add('SEC-009', 'error', `${path}: ${msg}`);
    } catch { /* unreachable path is fine */ }
  }

  try {
    const evil = 'https://evil.example';
    const r = await fetchImpl(base, { redirect: 'manual', headers: { origin: evil } });
    const acao = r.headers.get('access-control-allow-origin');
    const creds = /true/i.test(r.headers.get('access-control-allow-credentials') ?? '');
    if (acao === evil && creds) add('SEC-010', 'error', 'CORS reflects an arbitrary Origin with credentials allowed');
    else if (acao === '*') add('SEC-010', 'info', 'CORS allows any origin (acceptable only for public, credential-free resources)');
  } catch { /* ignore */ }

  return findings;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  if (!target) { console.error('Usage: node security-smoke.mjs <baseUrl> [--json]'); process.exit(2); }
  try {
    const findings = await smoke(target);
    if (args.includes('--json')) console.log(JSON.stringify(findings, null, 2));
    else {
      for (const f of findings) console.log(`${f.severity.toUpperCase().padEnd(5)} ${f.id}  ${f.msg}`);
      const n = (s) => findings.filter((f) => f.severity === s).length;
      console.log(`\n${n('error')} error, ${n('warn')} warn, ${n('info')} info. Smoke test only: see references/security.md §16 for the full gate.`);
    }
    process.exit(findings.some((f) => f.severity === 'error') ? 1 : 0);
  } catch (e) { console.error(`request failed: ${e.message}`); process.exit(2); }
}
