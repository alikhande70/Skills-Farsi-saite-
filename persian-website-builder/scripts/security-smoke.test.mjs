import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { smoke } from './security-smoke.mjs';

function serve(handler) {
  return new Promise((resolve) => {
    const srv = createServer(handler);
    srv.listen(0, '127.0.0.1', () => resolve({ srv, url: `http://127.0.0.1:${srv.address().port}/` }));
  });
}
const ids = (f, sev) => f.filter((x) => (sev ? x.severity === sev : true)).map((x) => x.id);

test('a deliberately weak server is flagged', async () => {
  const { srv, url } = await serve((req, res) => {
    if (req.url === '/.env') return res.end('DB_PASSWORD=hunter2\nSECRET_KEY=abc');
    if (req.url === '/.git/config') return res.end('[core]\n\trepositoryformatversion = 0');
    res.setHeader('X-Powered-By', 'Express 4.17');
    res.setHeader('Server', 'nginx/1.18.0');
    res.setHeader('Content-Security-Policy', "default-src * 'unsafe-inline'");
    res.setHeader('Set-Cookie', 'sid=abc123');
    if (req.headers.origin) { res.setHeader('Access-Control-Allow-Origin', req.headers.origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); }
    res.end('<html></html>');
  });
  try {
    const f = await smoke(url);
    const errors = new Set(ids(f, 'error'));
    assert.ok(errors.has('SEC-001'), 'nosniff');
    assert.ok(errors.has('SEC-009'), 'exposed paths');
    assert.ok(errors.has('SEC-010'), 'CORS reflection');
    assert.equal(f.filter((x) => x.id === 'SEC-009').length, 2);
    const warns = new Set(ids(f, 'warn'));
    for (const id of ['SEC-002', 'SEC-003', 'SEC-005', 'SEC-006', 'SEC-008']) assert.ok(warns.has(id), id);
  } finally { srv.close(); }
});

test('a hardened server has no errors and no warnings (HTTP, so HSTS/Secure are skipped)', async () => {
  const { srv, url } = await serve((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'");
    res.setHeader('Permissions-Policy', 'geolocation=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Set-Cookie', '__Host-sid=abc; Path=/; HttpOnly; SameSite=Lax');
    // a single-page app answers 200 to every path: must NOT trigger exposed-path findings
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><title>app</title>');
  });
  try {
    const f = await smoke(url);
    assert.deepEqual(ids(f, 'error'), []);
    assert.deepEqual(ids(f, 'warn'), []);
  } finally { srv.close(); }
});

test('CSP in report-only mode is reported as info, not as missing', async () => {
  const { srv, url } = await serve((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy-Report-Only', "default-src 'self'");
    res.end('ok');
  });
  try {
    const f = await smoke(url);
    const csp = f.find((x) => x.id === 'SEC-003');
    assert.equal(csp.severity, 'info');
  } finally { srv.close(); }
});

// ---------------------------------------------------------------------------------------------
// Hidden-failure regression suite (run 2). Reproduces: probes that fail silently produced
// "0 error, exit 0", and a hanging probe made the tool never finish. These use the real CLI so the
// exit code and the wording a human or CI sees are what is tested.
// ---------------------------------------------------------------------------------------------
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('./security-smoke.mjs', import.meta.url));

function runCli(args, { timeoutMs = 20000 } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, [CLI, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    child.stdout.on('data', (d) => (out += d)); child.stderr.on('data', (d) => (err += d));
    const guard = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.on('close', (code, signal) => { clearTimeout(guard); resolve({ code, signal, out, err, ms: Date.now() - started }); });
  });
}

const HARDENED = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'; frame-ancestors 'none'",
  'Permissions-Policy': 'geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};
/** Hardened main page; `probe(req,res)` decides what happens to every non-main request. */
function hostile(probe, { extra = {} } = {}) {
  return serve((req, res) => {
    const isProbe = req.url !== '/' || req.headers.origin;
    if (isProbe) return probe(req, res);
    for (const [k, v] of Object.entries({ ...HARDENED, ...extra })) res.setHeader(k, v);
    res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>x</title>');
  });
}

test('REGRESSION: probe connections destroyed -> INCOMPLETE and exit 3, never a success', async () => {
  const { srv, url } = await hostile((req) => req.socket.destroy());
  try {
    const r = await runCli([url, '--timeout=2000']);
    assert.equal(r.code, 3, `exit code was ${r.code}\n${r.out}${r.err}`);
    assert.match(r.out, /INCOMPLETE/);
    assert.doesNotMatch(r.out, /VERDICT:\s*(PASS|CONDITIONAL)/);
    assert.match(r.out, /SEC-009/, 'the failed exposed-path probes must be listed');
    assert.match(r.out, /SEC-010/, 'the failed CORS probe must be listed');
  } finally { srv.close(); }
});

test('REGRESSION: probe answers 5xx -> INCOMPLETE (cannot confirm the path is not exposed)', async () => {
  const { srv, url } = await hostile((req, res) => { res.statusCode = 500; res.end('boom'); });
  try {
    const r = await runCli([url, '--timeout=2000']);
    assert.equal(r.code, 3, `${r.out}${r.err}`);
    assert.match(r.out, /INCOMPLETE/);
  } finally { srv.close(); }
});

test('REGRESSION: probe never answers -> tool finishes within the timeout bound, INCOMPLETE', async () => {
  const { srv, url } = await hostile(() => { /* hang */ });
  try {
    const r = await runCli([url, '--timeout=300'], { timeoutMs: 15000 });
    assert.notEqual(r.signal, 'SIGKILL', 'tool hung until it was killed');
    assert.equal(r.code, 3, `${r.out}${r.err}`);
    assert.ok(r.ms < 12000, `took ${r.ms} ms`);
  } finally { srv.close(); }
});

test('REGRESSION: unreachable target -> exit 2 (could not run), not a success', async () => {
  const { srv, url } = await serve((q, s) => s.end('x'));
  srv.close();
  await new Promise((r) => setTimeout(r, 50));
  const r = await runCli([url, '--timeout=1000']);
  assert.equal(r.code, 2, `${r.out}${r.err}`);
  assert.doesNotMatch(r.out, /PASS|CONDITIONAL/);
});

test('REGRESSION: only the CORS probe fails -> INCOMPLETE naming SEC-010 only', async () => {
  const { srv, url } = await serve((req, res) => {
    if (req.headers.origin) return req.socket.destroy();
    for (const [k, v] of Object.entries(HARDENED)) res.setHeader(k, v);
    res.setHeader('Content-Type', 'text/html'); res.end('<!doctype html><title>x</title>');
  });
  try {
    const r = await runCli([url, '--timeout=2000', '--json']);
    assert.equal(r.code, 3, `${r.out}${r.err}`);
    const report = JSON.parse(r.out);
    assert.equal(report.verdict, 'INCOMPLETE');
    const incomplete = report.checks.filter((c) => c.status === 'incomplete').map((c) => c.id);
    assert.deepEqual(incomplete, ['SEC-010']);
  } finally { srv.close(); }
});

test('hardened server over plain HTTP is CONDITIONAL with an explicit limit, not PASS', async () => {
  const { srv, url } = await hostile((req, res) => { res.statusCode = 404; res.end('nope'); });
  try {
    const r = await runCli([url, '--timeout=2000']);
    assert.equal(r.code, 0, `${r.out}${r.err}`);
    assert.match(r.out, /VERDICT:\s*CONDITIONAL/);
    assert.match(r.out, /HSTS|HTTPS/i);
    assert.doesNotMatch(r.out, /VERDICT:\s*PASS/);
  } finally { srv.close(); }
});

test('404/403 on probes are a pass for exposure checks (no false INCOMPLETE)', async () => {
  for (const status of [401, 403, 404]) {
    const { srv, url } = await hostile((req, res) => { res.statusCode = status; res.end('no'); });
    try {
      const r = await runCli([url, '--timeout=2000', '--json']);
      const report = JSON.parse(r.out);
      assert.equal(report.checks.filter((c) => c.status === 'incomplete').length, 0, `status ${status}`);
      assert.ok(report.checks.filter((c) => c.id === 'SEC-009' && c.status === 'pass').length >= 7, `status ${status}`);
    } finally { srv.close(); }
  }
});

test('FAIL outranks INCOMPLETE: a real exposure plus failing probes is reported FAIL, exit 1', async () => {
  let n = 0;
  const { srv, url } = await serve((req, res) => {
    if (req.url === '/.env') return res.end('DB_PASSWORD=hunter2');
    if (req.url !== '/') return req.socket.destroy();
    res.setHeader('X-Powered-By', 'Express'); res.end('<html></html>'); n++;
  });
  try {
    const r = await runCli([url, '--timeout=2000']);
    assert.equal(r.code, 1, `${r.out}${r.err}`);
    assert.match(r.out, /VERDICT:\s*FAIL/);
  } finally { srv.close(); }
});

test('JSON report records every executed check, including passes, with counts and verdict', async () => {
  const { srv, url } = await hostile((req, res) => { res.statusCode = 404; res.end('no'); });
  try {
    const r = await runCli([url, '--timeout=2000', '--json']);
    const report = JSON.parse(r.out);
    assert.equal(report.tool, 'security-smoke');
    assert.ok(report.checks.length >= 12, `only ${report.checks.length} checks recorded`);
    assert.ok(report.checks.every((c) => c.id && c.status), 'every check has id and status');
    assert.equal(report.counts.pass + report.counts.fail + report.counts.warn + report.counts.info + report.counts.incomplete + report.counts.skipped + report.counts['not-applicable'], report.checks.length);
    assert.ok(Array.isArray(report.limits) && report.limits.length > 0, 'http scope must be recorded as a limit');
  } finally { srv.close(); }
});
