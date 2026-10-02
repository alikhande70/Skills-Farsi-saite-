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
