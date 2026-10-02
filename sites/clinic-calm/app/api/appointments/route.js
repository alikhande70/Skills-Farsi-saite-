import { NextResponse } from 'next/server';
import { runtimeConfig, nowMs } from '../../../lib/config.mjs';
import { getRuntime } from '../../../lib/runtime.mjs';
import { validateAppointment, UUID_V4 } from '../../../lib/validate.mjs';
import { StoreError } from '../../../lib/store.mjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_BODY_BYTES = 8 * 1024;
const respond = (status, body, headers = {}) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const maskMobile = (m) => `${m.slice(0, 4)}***${m.slice(-4)}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function POST(request) {
  try {
    const cfg = runtimeConfig();
    const rt = getRuntime();
    const now = nowMs();
    // Test hooks only when CLINIC_TEST_FAULTS=1 (never in a normal start): x-test-fault = fail-once | always | slow | throw
    const fault = cfg.testMode ? request.headers.get('x-test-fault') : null;

    const key = request.headers.get('idempotency-key') ?? '';
    if (!UUID_V4.test(key)) return respond(400, { ok: false, code: 'bad_request', reason: 'idempotency_key' });

    // Per client address. Only trustworthy behind a proxy that overwrites X-Forwarded-For (LIMITATIONS.md).
    const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
    const ipHit = rt.limiter.hit(`ip:${ip}`, cfg.ipLimit, cfg.ipWindowMs, now);
    if (!ipHit.ok) return respond(429, { ok: false, code: 'rate_limited', retryAfterSec: ipHit.retryAfterSec }, { 'Retry-After': String(ipHit.retryAfterSec) });

    if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return respond(400, { ok: false, code: 'bad_request', reason: 'content_type' });
    const text = await request.text();
    if (Buffer.byteLength(text) > MAX_BODY_BYTES) return respond(413, { ok: false, code: 'too_large' });
    let body;
    try { body = JSON.parse(text); } catch { return respond(400, { ok: false, code: 'bad_request', reason: 'json' }); }
    if (typeof body?.website === 'string' && body.website.trim() !== '') return respond(400, { ok: false, code: 'bad_request', reason: 'rejected' }); // honeypot

    const v = validateAppointment(body, now);
    if (!v.ok) return respond(422, { ok: false, code: 'validation', errors: v.errors });

    // A retry of an already stored request must always succeed, whatever the fault mode.
    const existing = rt.store.findByKey(key);
    if (!existing) {
      if (fault === 'throw') throw new Error('injected failure');
      if (fault === 'slow') await sleep(1500);
      if (fault === 'always' || (fault === 'fail-once' && !rt.faulted.has(key))) {
        rt.faulted.add(key);
        return respond(503, { ok: false, code: 'unavailable' }, { 'Retry-After': '1' });
      }
      const since = now - cfg.mobileWindowMs;
      if (rt.store.countRecentByMobile(v.values.mobile, since) >= cfg.mobileLimit) {
        const retry = Math.max(1, Math.ceil((rt.store.recentTimesByMobile(v.values.mobile, since)[0] + cfg.mobileWindowMs - now) / 1000));
        return respond(429, { ok: false, code: 'rate_limited', retryAfterSec: retry }, { 'Retry-After': String(retry) });
      }
    }

    const result = rt.store.submit({ key, values: v.values, now });
    if (result.status === 'conflict') return respond(409, { ok: false, code: 'idempotency_conflict' });
    if (result.status === 'created') console.info(JSON.stringify({ ev: 'appointment.created', ref: result.ref, mobile: maskMobile(v.values.mobile), service: v.values.service }));
    return respond(result.status === 'created' ? 201 : 200, { ok: true, status: result.status, ref: result.ref });
  } catch (e) {
    // No stack trace, no detail to the client; the server log keeps the cause.
    console.error(JSON.stringify({ ev: 'appointment.error', kind: e instanceof StoreError ? 'store' : 'unexpected', message: String(e.message) }));
    return respond(e instanceof StoreError ? 503 : 500, { ok: false, code: e instanceof StoreError ? 'unavailable' : 'internal' }, e instanceof StoreError ? { 'Retry-After': '5' } : {});
  }
}
