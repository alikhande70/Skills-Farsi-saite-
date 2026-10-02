// Real production server, real HTTP. Fixed clock: Monday 13 Mehr 1405 (2026-10-05); bookable days start 2026-10-06, Friday 2026-10-09 is excluded.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { request } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, TEST_ENV } from './helpers/server.mjs';
import content from '../content/clinic.fa.json' with { type: 'json' };
import { REF_PATTERN } from '../lib/ref.mjs';

const DAY = '2026-10-06';
const good = (over = {}) => ({ name: 'مریم احمدی', mobile: '09123456789', service: 'consult', day: DAY, window: 'morning', consent: true, note: '', ...over });
let srv; let normal;
// The shared server gets a high per-address limit: all tests come from one address and would otherwise (correctly) hit the
// default limit of 20 requests per 10 minutes. The per-address limit itself is tested on a dedicated server below.
before(async () => { [srv, normal] = await Promise.all([startServer({ env: { ...TEST_ENV, CLINIC_RATE_LIMIT_IP: '1000' } }), startServer({ env: { CLINIC_FIXED_NOW: TEST_ENV.CLINIC_FIXED_NOW } })]); });
after(async () => { await Promise.all([srv?.stop(), normal?.stop()]); });

async function post(server, body, { key = randomUUID(), headers = {}, raw = null, ip = null } = {}) {
  const res = await fetch(`${server.url}/api/appointments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}), ...(ip ? { 'x-forwarded-for': ip } : {}), ...headers },
    body: raw ?? JSON.stringify(body),
  });
  let json = null; try { json = await res.json(); } catch { /* not JSON */ }
  return { status: res.status, json, headers: res.headers };
}

test('success: 201 with an unguessable reference, normalized record on disk, no PII in the response, no-store', async () => {
  const before = srv.records().length;
  const r = await post(srv, good({ name: 'علي كريمي', mobile: '+98 ۹۱۲ ۳۴۵ ۶۷۸۱' }));
  assert.equal(r.status, 201);
  assert.match(r.json.ref, REF_PATTERN);
  assert.deepEqual(Object.keys(r.json).sort(), ['ok', 'ref', 'status']);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  const rec = srv.records().at(-1);
  assert.equal(srv.records().length, before + 1);
  assert.equal(rec.mobile, '09123456781');
  assert.equal(rec.nameKey, 'علی کریمی');
  assert.equal(rec.ref, r.json.ref);
});

test('idempotency: the same key and payload replays (200, same ref, one record); another payload on the same key is 409', async () => {
  const key = randomUUID();
  const a = await post(srv, good({ mobile: '09120000001' }), { key });
  const b = await post(srv, good({ mobile: '09120000001' }), { key });
  assert.equal(a.status, 201);
  assert.equal(b.status, 200);
  assert.equal(b.json.status, 'replayed');
  assert.equal(b.json.ref, a.json.ref);
  const c = await post(srv, good({ mobile: '09120000001', service: 'hair' }), { key });
  assert.equal(c.status, 409);
  assert.equal(c.json.code, 'idempotency_conflict');
  assert.equal(srv.records().filter((r) => r.key === key).length, 1);
});

test('request hygiene: missing/invalid key, wrong content type, bad JSON, oversized body, non-object body', async () => {
  assert.deepEqual((await post(srv, good(), { key: null })).json, { ok: false, code: 'bad_request', reason: 'idempotency_key' });
  assert.equal((await post(srv, good(), { key: 'not-a-uuid' })).status, 400);
  const ct = await fetch(`${srv.url}/api/appointments`, { method: 'POST', headers: { 'content-type': 'text/plain', 'idempotency-key': randomUUID() }, body: '{}' });
  assert.equal(ct.status, 400);
  assert.equal((await post(srv, null, { raw: '{broken' })).json.reason, 'json');
  assert.equal((await post(srv, null, { raw: JSON.stringify(good({ note: 'x'.repeat(9000) })) })).status, 413);
  assert.equal((await post(srv, null, { raw: '[]' })).status, 422);
  assert.equal((await post(srv, null, { raw: 'null' })).status, 422);
});

test('validation: 422 with a stable code per field, and every code has a Persian message', async () => {
  const r = await post(srv, {});
  assert.equal(r.status, 422);
  assert.equal(r.json.code, 'validation');
  for (const [field, code] of Object.entries(r.json.errors)) assert.ok(content.appointment.errors[field]?.[code], `no Persian message for ${field}.${code}`);
  const friday = await post(srv, good({ day: '2026-10-09' }));
  assert.equal(friday.json.errors.day, 'invalid');
  const past = await post(srv, good({ day: '2026-10-01' }));
  assert.equal(past.json.errors.day, 'invalid');
});

test('honeypot: a filled hidden field is rejected and nothing is stored', async () => {
  const before = srv.records().length;
  const r = await post(srv, good({ website: 'http://spam.invalid' }));
  assert.equal(r.status, 400);
  assert.equal(r.json.reason, 'rejected');
  assert.equal(srv.records().length, before);
});

test('transient failure: 503 + Retry-After and nothing stored; the retry with the SAME key succeeds exactly once', async () => {
  const key = randomUUID();
  const before = srv.records().length;
  const first = await post(srv, good({ mobile: '09120000002' }), { key, headers: { 'x-test-fault': 'fail-once' } });
  assert.equal(first.status, 503);
  assert.equal(first.json.code, 'unavailable');
  assert.ok(first.headers.get('retry-after'));
  assert.equal(srv.records().length, before, 'a failed attempt must not leave a record');
  const retry = await post(srv, good({ mobile: '09120000002' }), { key, headers: { 'x-test-fault': 'fail-once' } });
  assert.equal(retry.status, 201);
  const again = await post(srv, good({ mobile: '09120000002' }), { key });
  assert.equal(again.status, 200);
  assert.equal(again.json.ref, retry.json.ref);
  assert.equal(srv.records().length, before + 1);
});

test('permanent failure and unexpected exception: JSON error, no stack trace, no internals, cause only in the server log', async () => {
  const always = await post(srv, good({ mobile: '09120000003' }), { headers: { 'x-test-fault': 'always' } });
  assert.equal(always.status, 503);
  const boom = await post(srv, good({ mobile: '09120000004' }), { headers: { 'x-test-fault': 'throw' } });
  assert.equal(boom.status, 500);
  assert.deepEqual(boom.json, { ok: false, code: 'internal' });
  assert.match(srv.logs(), /injected failure/, 'the cause must reach the server log');
});

test('HARDENING: the fault hook is inert when CLINIC_TEST_FAULTS is not set', async () => {
  const r = await post(normal, good({ mobile: '09120000005' }), { headers: { 'x-test-fault': 'always' } });
  assert.equal(r.status, 201);
  const t = await post(normal, good({ mobile: '09120000006' }), { headers: { 'x-test-fault': 'throw' } });
  assert.equal(t.status, 201);
});

test('slow backend still completes', async () => {
  const t0 = Date.now();
  const r = await post(srv, good({ mobile: '09120000007' }), { headers: { 'x-test-fault': 'slow' } });
  assert.equal(r.status, 201);
  assert.ok(Date.now() - t0 >= 1400);
});

test('concurrency: 25 simultaneous requests with one key create exactly one record', async () => {
  const key = randomUUID();
  const results = await Promise.all(Array.from({ length: 25 }, () => post(srv, good({ mobile: '09120000008' }), { key })));
  assert.equal(results.filter((r) => r.status === 201).length, 1);
  assert.equal(results.filter((r) => r.status === 200).length, 24);
  assert.equal(new Set(results.map((r) => r.json.ref)).size, 1);
  assert.equal(srv.records().filter((r) => r.key === key).length, 1);
});

test('rate limit per mobile (limit 2 in a dedicated server): 3rd new request is 429 with Retry-After; replays and other numbers are unaffected', async () => {
  const s = await startServer({ env: { ...TEST_ENV, CLINIC_RATE_LIMIT_MOBILE: '2' } });
  try {
    const k1 = randomUUID();
    assert.equal((await post(s, good(), { key: k1 })).status, 201);
    assert.equal((await post(s, good({ service: 'skin' }))).status, 201);
    const blocked = await post(s, good({ service: 'hair' }));
    assert.equal(blocked.status, 429);
    assert.equal(blocked.json.code, 'rate_limited');
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
    assert.equal((await post(s, good(), { key: k1 })).status, 200, 'a replay of a stored request is never rate limited');
    assert.equal((await post(s, good({ mobile: '09129999999' }))).status, 201, 'another number is independent');
    // 10 parallel new requests for one number with limit 2: no more than the limit may be created
    const burst = await Promise.all(Array.from({ length: 10 }, () => post(s, good({ mobile: '09128888888' }))));
    assert.equal(burst.filter((r) => r.status === 201).length, 2);
    assert.equal(burst.filter((r) => r.status === 429).length, 8);
  } finally { await s.stop(); }
});

test('rate limit per client address (limit 3 in a dedicated server): the 4th request from one address is 429', async () => {
  const s = await startServer({ env: { ...TEST_ENV, CLINIC_RATE_LIMIT_IP: '3' } });
  try {
    for (let i = 0; i < 3; i += 1) assert.notEqual((await post(s, {}, { ip: '203.0.113.7' })).status, 429);
    assert.equal((await post(s, {}, { ip: '203.0.113.7' })).status, 429);
    assert.notEqual((await post(s, {}, { ip: '203.0.113.8' })).status, 429);
  } finally { await s.stop(); }
});

test('client address: without a header the socket address is the key (Next fills x-forwarded-for); KNOWN LIMITATION: a client-sent header is trusted, so the limit can be bypassed without a trusted proxy', async (t) => {
  const s = await startServer({ env: { ...TEST_ENV, CLINIC_RATE_LIMIT_IP: '3' } });
  // fetch() cannot choose its source address; node:http can. Linux treats all of 127.0.0.0/8 as loopback.
  const send = (from, xff) => new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: s.port, path: '/api/appointments', method: 'POST', localAddress: from, headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID(), ...(xff ? { 'x-forwarded-for': xff } : {}) } }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.end('{}');
  });
  try {
    try { await send('127.0.0.2'); } catch (e) { if (e.code === 'EADDRNOTAVAIL') return t.skip('this platform has no 127.0.0.2 loopback alias'); throw e; }
    const first = []; for (let i = 0; i < 4; i += 1) first.push(await send('127.0.0.1'));
    assert.deepEqual(first.map((c) => c === 429), [false, false, false, true], 'the 4th header-less request from one socket address is limited');
    assert.notEqual(await send('127.0.0.3'), 429, 'a different socket address has its own bucket (no shared "local" bucket)');
    for (const fake of ['198.51.100.1', '198.51.100.2', '198.51.100.3', '198.51.100.4']) assert.notEqual(await send('127.0.0.1', fake), 429, 'LIMITATION: a spoofed x-forwarded-for gets a fresh bucket; a real deployment needs a proxy that overwrites the header');
  } finally { await s.stop(); }
});

test('durability: a restarted server with the same data directory still replays a stored request', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'clinic-durable-'));
  const key = randomUUID();
  let ref;
  const a = await startServer({ env: TEST_ENV, dataDir: dir });
  try { const r = await post(a, good({ mobile: '09127777777' }), { key }); assert.equal(r.status, 201); ref = r.json.ref; } finally { await a.stop(); }
  const b = await startServer({ env: TEST_ENV, dataDir: dir });
  try { const r = await post(b, good({ mobile: '09127777777' }), { key }); assert.equal(r.status, 200); assert.equal(r.json.ref, ref); } finally { await b.stop(); rmSync(dir, { recursive: true, force: true }); }
});

test('headers: security headers on pages and API, per-request CSP nonce without unsafe-*, no X-Powered-By', async () => {
  const nonces = [];
  for (const path of ['/', '/appointment', '/robots.txt', '/does-not-exist']) {
    const res = await fetch(`${srv.url}${path}`);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path);
    assert.equal(res.headers.get('x-frame-options'), 'DENY', path);
    assert.equal(res.headers.get('x-powered-by'), null, path);
    assert.ok(res.headers.get('permissions-policy'), path);
    assert.equal(res.headers.get('cross-origin-opener-policy'), 'same-origin', path);
    if (path === '/' || path === '/appointment') {
      const csp = res.headers.get('content-security-policy');
      assert.match(csp, /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
      assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
      assert.match(csp, /frame-ancestors 'none'/);
      nonces.push(/'nonce-([^']+)'/.exec(csp)[1]);
    }
  }
  const api = await post(srv, {});
  assert.equal(api.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(new Set(nonces).size, nonces.length, 'a nonce must never repeat');
});

test('other methods and unknown routes: 405 without data, 404 page in Persian', async () => {
  const get = await fetch(`${srv.url}/api/appointments`);
  assert.equal(get.status, 405);
  assert.doesNotMatch(await get.text(), /مریم|0912/);
  const nf = await fetch(`${srv.url}/nope`);
  assert.equal(nf.status, 404);
  assert.match(await nf.text(), /lang="fa"/);
});

test('privacy: logs carry a masked mobile and never the full number or the name', async () => {
  await post(srv, good({ name: 'نامِ‌آزمایشی‌یکتا', mobile: '09125551234' }));
  const log = srv.logs();
  assert.match(log, /0912\*\*\*1234/);
  assert.doesNotMatch(log, /09125551234/);
  assert.doesNotMatch(log, /نامِ‌آزمایشی‌یکتا/);
});
