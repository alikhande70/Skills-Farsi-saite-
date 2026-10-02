#!/usr/bin/env node
// HTTP-level security smoke test. Zero dependencies (Node >= 18 global fetch).
// RUN ONLY AGAINST SYSTEMS YOU OWN OR ARE EXPLICITLY AUTHORIZED TO TEST. It sends about ten GET requests.
//
// Usage: node security-smoke.mjs <baseUrl> [--json] [--timeout=5000] [--show-passes]
//
// Result model (scripts/verdict.mjs): every check ends as pass | fail | warn | info | incomplete | skipped |
// not-applicable, and the run ends as PASS | CONDITIONAL | FAIL | INCOMPLETE.
// A probe that cannot complete (connection reset, timeout, HTTP 5xx) is INCOMPLETE, never a pass: before v0.2 it was
// swallowed and the tool printed "0 error" with exit code 0 (reproduced and fixed in run 2).
// Exit codes: 0 PASS/CONDITIONAL, 1 FAIL, 2 could not run (target unreachable/invalid), 3 INCOMPLETE.
//
// Covers references/security.md: §6 headers, §2 cookie flags, §11 exposed paths, §5 CORS reflection.
// It is a smoke test, not a scanner: PASS means "these checks passed", not "the site is secure" (AP-027).
// Expected values: OWASP Cheat Sheets read on 2026-10-01 (E-042); re-check them over time.

import { pathToFileURL } from 'node:url';
import { createLedger, buildReport, renderText, exitCodeFor } from './verdict.mjs';

export const VERSION = '0.2';
export class SmokeError extends Error {}

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

const describe = (e, timeoutMs) => (e?.name === 'TimeoutError' || e?.name === 'AbortError' ? `no complete answer within ${timeoutMs} ms` : (e?.cause?.code ?? e?.cause?.message ?? e?.message ?? String(e)));

async function request(fetchImpl, url, init, timeoutMs) {
  return fetchImpl(url, { redirect: 'manual', ...init, signal: AbortSignal.timeout(timeoutMs) });
}
const drop = (res) => res.body?.cancel().catch(() => {});

export async function smokeReport(baseUrl, { fetchImpl = fetch, timeoutMs = 5000 } = {}) {
  let base;
  try { base = new URL(baseUrl); } catch { throw new SmokeError(`invalid URL: ${baseUrl}`); }
  if (!/^https?:$/.test(base.protocol)) throw new SmokeError(`unsupported protocol ${base.protocol}`);
  const isHttps = base.protocol === 'https:';
  const startedAt = new Date().toISOString();
  const L = createLedger();

  let res;
  try {
    res = await request(fetchImpl, base, { headers: { 'user-agent': `security-smoke/${VERSION}` } }, timeoutMs);
  } catch (e) { throw new SmokeError(`cannot reach ${base.origin}: ${describe(e, timeoutMs)}`); }
  if (res.status >= 500) { drop(res); throw new SmokeError(`${base.href} answered HTTP ${res.status}; headers of an error page are not representative`); }
  const h = (n) => res.headers.get(n);
  const cookies = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  drop(res);

  if (res.status >= 300 && res.status < 400) L.add('SEC-000', 'warn', `target answered ${res.status} (redirect to ${h('location') ?? 'unknown'}): only the redirect response was checked`, { limit: 'headers of the final page were not evaluated; re-run against the final URL' });
  else if (res.status >= 400) L.add('SEC-000', 'info', `target answered HTTP ${res.status}; headers of this response were checked`);
  else L.add('SEC-000', 'pass', `target answered HTTP ${res.status}`);

  if (/nosniff/i.test(h('x-content-type-options') ?? '')) L.add('SEC-001', 'pass', 'X-Content-Type-Options: nosniff present');
  else L.add('SEC-001', 'fail', 'missing X-Content-Type-Options: nosniff');

  if (h('referrer-policy')) L.add('SEC-002', 'pass', `Referrer-Policy present (${h('referrer-policy')})`);
  else L.add('SEC-002', 'warn', 'missing Referrer-Policy (OWASP: strict-origin-when-cross-origin)');

  const csp = h('content-security-policy');
  if (!csp) {
    if (h('content-security-policy-report-only')) L.add('SEC-003', 'info', 'CSP is report-only (enforce after zero own-page violations)');
    else L.add('SEC-003', 'warn', 'no Content-Security-Policy');
  } else {
    const weak = [];
    if (/'unsafe-inline'|'unsafe-eval'/.test(csp)) weak.push("allows 'unsafe-inline' or 'unsafe-eval'");
    if (/(^|[\s;])\*(\s|;|$)/.test(csp)) weak.push('contains a wildcard source');
    if (weak.length) for (const w of weak) L.add('SEC-003', 'warn', `CSP ${w}`);
    else L.add('SEC-003', 'pass', 'CSP present without unsafe-inline/unsafe-eval/wildcards');
  }

  if (isHttps) {
    const hsts = h('strict-transport-security');
    const maxAge = Number(/max-age=(\d+)/i.exec(hsts ?? '')?.[1] ?? 0);
    if (!hsts) L.add('SEC-004', 'fail', 'missing Strict-Transport-Security on an HTTPS site');
    else if (maxAge < 31536000) L.add('SEC-004', 'warn', `HSTS max-age ${maxAge}s is short (OWASP: 63072000)`);
    else L.add('SEC-004', 'pass', `HSTS present (max-age ${maxAge})`);
  } else L.add('SEC-004', 'skipped', 'HSTS not evaluated: target is plain HTTP (production must be HTTPS; re-run on the HTTPS staging URL)');

  if (!h('x-frame-options') && !/frame-ancestors/i.test(csp ?? '')) L.add('SEC-005', 'warn', 'no clickjacking protection (X-Frame-Options or CSP frame-ancestors)');
  else L.add('SEC-005', 'pass', 'clickjacking protection present');

  const leaks = [];
  if (h('x-powered-by')) leaks.push(`X-Powered-By discloses "${h('x-powered-by')}"`);
  if (/\d/.test(h('server') ?? '')) leaks.push(`Server header discloses version "${h('server')}"`);
  if (leaks.length) for (const m of leaks) L.add('SEC-006', 'warn', m);
  else L.add('SEC-006', 'pass', 'no technology/version disclosure headers');

  L.add('SEC-007', h('permissions-policy') ? 'pass' : 'info', h('permissions-policy') ? 'Permissions-Policy present' : 'no Permissions-Policy');
  L.add('SEC-007', h('cross-origin-opener-policy') ? 'pass' : 'info', h('cross-origin-opener-policy') ? 'Cross-Origin-Opener-Policy present' : 'no Cross-Origin-Opener-Policy');

  if (cookies.length === 0) L.add('SEC-008', 'not-applicable', 'no Set-Cookie on this response (cookie flags of other pages/logins were not examined)');
  for (const c of cookies) {
    const name = c.split('=')[0];
    if (isHttps) L.add('SEC-008', /;\s*secure/i.test(c) ? 'pass' : 'fail', /;\s*secure/i.test(c) ? `cookie "${name}" has Secure` : `cookie "${name}" lacks Secure`);
    else L.add('SEC-008', 'skipped', `cookie "${name}": Secure flag not evaluated on plain HTTP`);
    L.add('SEC-008', /;\s*httponly/i.test(c) ? 'pass' : 'warn', /;\s*httponly/i.test(c) ? `cookie "${name}" has HttpOnly` : `cookie "${name}" lacks HttpOnly (fine only if JS must read it)`);
    L.add('SEC-008', /;\s*samesite=/i.test(c) ? 'pass' : 'warn', /;\s*samesite=/i.test(c) ? `cookie "${name}" has SameSite` : `cookie "${name}" lacks SameSite`);
  }

  for (const [path, signature, msg] of EXPOSED) {
    let r;
    try { r = await request(fetchImpl, new URL(path, base), {}, timeoutMs); }
    catch (e) { L.add('SEC-009', 'incomplete', `${path}: probe could not complete`, { detail: describe(e, timeoutMs) }); continue; }
    if (r.status >= 500) { drop(r); L.add('SEC-009', 'incomplete', `${path}: server error (HTTP ${r.status}); cannot confirm the path is not exposed`); continue; }
    if (r.status !== 200) { drop(r); L.add('SEC-009', 'pass', `${path}: not exposed (HTTP ${r.status})`); continue; }
    let body;
    try { body = await r.text(); }
    catch (e) { L.add('SEC-009', 'incomplete', `${path}: response body could not be read`, { detail: describe(e, timeoutMs) }); continue; }
    if (signature(body)) L.add('SEC-009', 'fail', `${path}: ${msg}`);
    else L.add('SEC-009', 'pass', `${path}: HTTP 200 without a sensitive signature`);
  }

  const evil = 'https://evil.example';
  try {
    const r = await request(fetchImpl, base, { headers: { origin: evil } }, timeoutMs);
    const acao = r.headers.get('access-control-allow-origin');
    const creds = /true/i.test(r.headers.get('access-control-allow-credentials') ?? '');
    const status = r.status;
    drop(r);
    if (status >= 500) L.add('SEC-010', 'incomplete', `CORS probe: server error (HTTP ${status})`);
    else if (acao === evil && creds) L.add('SEC-010', 'fail', 'CORS reflects an arbitrary Origin with credentials allowed');
    else if (acao === '*') L.add('SEC-010', 'info', 'CORS allows any origin (acceptable only for public, credential-free resources)');
    else L.add('SEC-010', 'pass', 'CORS does not reflect an arbitrary Origin');
  } catch (e) { L.add('SEC-010', 'incomplete', 'CORS probe could not complete', { detail: describe(e, timeoutMs) }); }

  return buildReport('security-smoke', { version: VERSION, target: base.href, scope: isHttps ? 'https' : 'http', startedAt, timeoutMs }, L.checks);
}

/** Back-compat: findings = every check that is not a plain pass / not-applicable. */
export async function smoke(baseUrl, opts) {
  const severity = { fail: 'error', warn: 'warn', info: 'info', incomplete: 'incomplete', unknown: 'incomplete', skipped: 'skipped' };
  const report = await smokeReport(baseUrl, opts);
  return report.checks.filter((c) => severity[c.status]).map((c) => ({ id: c.id, severity: severity[c.status], msg: c.msg, ...(c.detail ? { detail: c.detail } : {}) }));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  const timeoutMs = Number(args.find((a) => a.startsWith('--timeout='))?.split('=')[1] ?? 5000);
  if (!target || !(timeoutMs > 0)) { console.error('Usage: node security-smoke.mjs <baseUrl> [--json] [--timeout=5000] [--show-passes]'); process.exit(2); }
  try {
    const report = await smokeReport(target, { timeoutMs });
    console.log(args.includes('--json') ? JSON.stringify(report, null, 2) : renderText(report, { showPasses: args.includes('--show-passes') }));
    process.exit(exitCodeFor(report.verdict));
  } catch (e) {
    console.error(`CANNOT RUN: ${e.message}. Nothing was verified.`);
    process.exit(2);
  }
}
