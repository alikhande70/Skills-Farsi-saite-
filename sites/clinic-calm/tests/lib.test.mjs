import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { availableDays, isAllowedDay } from '../lib/days.mjs';
import { validateAppointment } from '../lib/validate.mjs';
import { newRef, REF_PATTERN } from '../lib/ref.mjs';
import { createStore, StoreError } from '../lib/store.mjs';
import { createLimiter } from '../lib/rate-limit.mjs';

const NOW = Date.parse('2026-10-05T08:00:00Z'); // Monday 13 Mehr 1405, 11:30 in Tehran
const days = availableDays(NOW);
const good = (over = {}) => ({ name: 'مریم احمدی', mobile: '09123456789', service: 'consult', day: days[0].value, window: 'morning', consent: true, note: '', ...over });

test('copy of persian-utils is byte-identical to the skill file (drift guard)', () => {
  const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  assert.equal(sha(new URL('../lib/persian-utils.mjs', import.meta.url)), sha(new URL('../../../persian-website-builder/scripts/persian-utils.mjs', import.meta.url)));
});

test('days: next 10 days, Friday never offered, Jalali labels, stored value is a Gregorian date', () => {
  assert.equal(days.length, 10);
  for (const d of days) {
    assert.match(d.value, /^\d{4}-\d{2}-\d{2}$/);
    assert.notEqual(new Date(`${d.value}T12:00:00Z`).getUTCDay(), 5, `${d.value} is a Friday`);
    assert.match(d.label, /(شنبه|یکشنبه|دوشنبه|سه‌شنبه|چهارشنبه|پنجشنبه)/);
    assert.doesNotMatch(d.label, /جمعه/);
  }
  assert.equal(days[0].value, '2026-10-06', 'starts tomorrow in Tehran');
  assert.ok(!days.some((d) => d.value === '2026-10-09'), '2026-10-09 is a Friday');
});

test('days: the Tehran date, not the UTC date, decides "today" (00:30 Tehran is still 21:00 UTC the day before)', () => {
  const afterMidnightTehran = Date.parse('2026-10-05T21:00:00Z'); // 2026-10-06 00:30 in Tehran
  assert.equal(availableDays(afterMidnightTehran)[0].value, '2026-10-07');
  assert.equal(isAllowedDay('2026-10-06', afterMidnightTehran), false);
});

test('validate: a valid request is normalized (Persian digits, Arabic yeh/kaf, +98 form)', () => {
  const r = validateAppointment(good({ name: 'علي كريمي', mobile: '+98 ۹۱۲ ۳۴۵ ۶۷۸۹' }), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.values.mobile, '09123456789');
  assert.equal(r.values.nameKey, 'علی کریمی', 'matching key uses Persian yeh and kaf');
  assert.equal(r.values.name, 'علي كريمي', 'display value keeps what the user typed');
});

test('validate: names accept Persian, Kurdish letters, Latin and ZWNJ; reject digits, symbols, one letter', () => {
  for (const name of ['مریم احمدی', 'ڕێبوار ئەحمەد', 'Sara Ahmadi', 'نرگس‌خاتون', "O'Brien-Smith"]) assert.equal(validateAppointment(good({ name }), NOW).ok, true, name);
  for (const name of ['علی۱۲۳', 'user@example', 'ع', '12345']) assert.equal(validateAppointment(good({ name }), NOW).errors.name, 'invalid', name);
});

test('validate: every field reports a stable error code', () => {
  const r = validateAppointment({}, NOW);
  assert.deepEqual(r.errors, { name: 'required', mobile: 'required', service: 'required', window: 'required', day: 'required', consent: 'required' });
  assert.equal(validateAppointment(good({ mobile: '0812345678' }), NOW).errors.mobile, 'invalid');
  assert.equal(validateAppointment(good({ service: 'surgery' }), NOW).errors.service, 'invalid');
  assert.equal(validateAppointment(good({ window: 'midnight' }), NOW).errors.window, 'invalid');
  assert.equal(validateAppointment(good({ day: '2026-10-09' }), NOW).errors.day, 'invalid', 'Friday');
  assert.equal(validateAppointment(good({ day: '2020-01-01' }), NOW).errors.day, 'invalid', 'past');
  assert.equal(validateAppointment(good({ consent: false }), NOW).errors.consent, 'required');
  assert.equal(validateAppointment(good({ note: 'ا'.repeat(301) }), NOW).errors.note, 'too_long');
  assert.equal(validateAppointment(good({ name: 'ا'.repeat(81) }), NOW).errors.name, 'too_long');
});

test('validate: non-string and hostile inputs do not throw and are rejected', () => {
  for (const bad of [null, undefined, 'x', 42, [], { name: { $gt: '' } }, { name: ['a'], mobile: 9123456789 }]) {
    assert.equal(validateAppointment(bad, NOW).ok, false);
  }
});

test('validate: bidi controls are stripped from name and note (spoofing), emoji are kept in the note', () => {
  const r = validateAppointment(good({ name: 'مریم‮ احمدی', note: 'سلام ⁦x⁩ 😊' }), NOW);
  assert.equal(r.ok, true);
  assert.doesNotMatch(r.values.name, /[‪-‮⁦-⁩]/);
  assert.doesNotMatch(r.values.note, /[⁦⁩]/);
  assert.match(r.values.note, /😊/);
});

test('ref: pattern holds and 20,000 references do not collide', () => {
  const seen = new Set();
  for (let i = 0; i < 20000; i += 1) { const r = newRef(); assert.match(r, REF_PATTERN); seen.add(r); }
  assert.equal(seen.size, 20000);
});

test('store: create, replay with the same key, conflict when the same key carries another payload', () => {
  const store = createStore({ dir: mkdtempSync(join(tmpdir(), 'clinic-store-')) });
  const v = validateAppointment(good(), NOW).values;
  const a = store.submit({ key: 'k1', values: v, now: NOW });
  assert.equal(a.status, 'created');
  const b = store.submit({ key: 'k1', values: v, now: NOW });
  assert.deepEqual(b, { status: 'replayed', ref: a.ref });
  const c = store.submit({ key: 'k1', values: { ...v, service: 'hair' }, now: NOW });
  assert.equal(c.status, 'conflict');
  assert.equal(store.size(), 1);
});

test('store: simultaneous submissions with one key create exactly one record', async () => {
  const store = createStore({ dir: mkdtempSync(join(tmpdir(), 'clinic-store-')) });
  const v = validateAppointment(good(), NOW).values;
  const results = await Promise.all(Array.from({ length: 50 }, () => Promise.resolve().then(() => store.submit({ key: 'same', values: v, now: NOW }))));
  assert.equal(results.filter((r) => r.status === 'created').length, 1);
  assert.equal(new Set(results.map((r) => r.ref)).size, 1);
  assert.equal(store.size(), 1);
});

test('store: persists to disk and a new instance sees the data; a torn last line does not break startup', () => {
  const dir = mkdtempSync(join(tmpdir(), 'clinic-store-'));
  const v = validateAppointment(good(), NOW).values;
  const first = createStore({ dir }).submit({ key: 'k', values: v, now: NOW });
  appendFileSync(join(dir, 'appointments.jsonl'), '{"key":"half-written');
  const reopened = createStore({ dir });
  assert.equal(reopened.size(), 1);
  assert.deepEqual(reopened.submit({ key: 'k', values: v, now: NOW }), { status: 'replayed', ref: first.ref });
});

test('store: a write failure throws StoreError and leaves NO record indexed (no phantom success on retry)', () => {
  const blocker = join(mkdtempSync(join(tmpdir(), 'clinic-store-')), 'not-a-dir');
  writeFileSync(blocker, 'x'); // a file where the data directory should be
  const store = createStore({ dir: blocker });
  const v = validateAppointment(good(), NOW).values;
  assert.throws(() => store.submit({ key: 'k', values: v, now: NOW }), StoreError);
  assert.equal(store.size(), 0);
  assert.equal(store.findByKey('k'), null);
});

test('store: recent-count by mobile respects the time window', () => {
  const store = createStore({ dir: mkdtempSync(join(tmpdir(), 'clinic-store-')) });
  const v = validateAppointment(good(), NOW).values;
  store.submit({ key: 'a', values: v, now: NOW - 90000000 });
  store.submit({ key: 'b', values: { ...v, service: 'skin' }, now: NOW });
  assert.equal(store.countRecentByMobile(v.mobile, NOW - 86400000), 1);
  assert.equal(store.countRecentByMobile('09000000000', 0), 0);
});

test('rate limiter: blocks after the limit, reports Retry-After, recovers after the window', () => {
  const l = createLimiter();
  for (let i = 0; i < 3; i += 1) assert.equal(l.hit('ip', 3, 1000, 0).ok, true);
  const blocked = l.hit('ip', 3, 1000, 10);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.equal(l.hit('ip', 3, 1000, 1500).ok, true);
  assert.equal(l.hit('other', 3, 1000, 10).ok, true, 'keys are independent');
});
