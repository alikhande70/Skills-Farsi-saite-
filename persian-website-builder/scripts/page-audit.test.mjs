// Browser tests. They are skipped (not failed) when Playwright/Chromium are unavailable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runAudit } from './page-audit.mjs';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const STARTER = here('../templates/starter-lite/index.html');
const BAD = here('./fixtures/bad.html');

async function audit(t, file, opts) {
  try {
    return await runAudit(file, opts);
  } catch (e) {
    if (/Playwright is not installed|Executable doesn't exist|browserType\.launch/.test(e.message)) {
      t.skip(`browser unavailable: ${e.message.split('\n')[0]}`);
      return null;
    }
    throw e;
  }
}

test('starter-lite passes the audit (no errors) when placeholders are allowed', { timeout: 90000 }, async (t) => {
  const f = await audit(t, STARTER, { allowPlaceholders: true });
  if (!f) return;
  assert.deepEqual(f.filter((x) => x.severity === 'error'), []);
  assert.deepEqual(f.filter((x) => x.severity === 'warn'), []);
});

test('starter-lite is flagged as placeholder content until real content replaces it (AP-007)', { timeout: 90000 }, async (t) => {
  const f = await audit(t, STARTER, {});
  if (!f) return;
  assert.ok(f.some((x) => x.id === 'PA-011' && x.severity === 'error'));
});

test('a deliberately broken page triggers every automatable check', { timeout: 90000 }, async (t) => {
  const f = await audit(t, BAD, {});
  if (!f) return;
  const errors = new Set(f.filter((x) => x.severity === 'error').map((x) => x.id));
  const warns = new Set(f.filter((x) => x.severity === 'warn').map((x) => x.id));
  for (const id of ['PA-001', 'PA-002', 'PA-003', 'PA-004', 'PA-005', 'PA-007', 'PA-008', 'PA-011', 'PA-013', 'PA-014', 'PA-017', 'PA-018']) {
    assert.ok(errors.has(id), `expected error ${id}`);
  }
  for (const id of ['PA-006', 'PA-009', 'PA-010', 'PA-012']) assert.ok(warns.has(id), `expected warning ${id}`);
});

// ---------------------------------------------------------------------------------------------
// Hidden-failure regression (run 2): lab metrics that could not be measured must be INCOMPLETE, not "0 ms".
// A scope the run skipped on purpose must be listed as a limit, never silently dropped.
// ---------------------------------------------------------------------------------------------
import { auditReport } from './page-audit.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function report(t, file, opts) {
  try { return await auditReport(file, opts); } catch (e) {
    if (/Playwright is not installed|Executable doesn't exist|browserType\.launch/.test(e.message)) { t.skip(`browser unavailable: ${e.message.split('\n')[0]}`); return null; }
    throw e;
  }
}

test('REGRESSION: a page with nothing to paint yields an INCOMPLETE lab-metric check, not LCP 0 ms', { timeout: 90000 }, async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'page-audit-'));
  const file = join(dir, 'empty.html');
  writeFileSync(file, '<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>خالی</title></head><body></body></html>');
  const r = await report(t, file, {});
  if (!r) return;
  const lab = r.checks.find((c) => c.id === 'PA-016');
  assert.equal(lab.status, 'incomplete', JSON.stringify(lab));
  assert.notEqual(r.verdict, 'PASS');
});

test('starter-lite verdict is CONDITIONAL, and the skipped placeholder check is listed as a limit', { timeout: 90000 }, async (t) => {
  const r = await report(t, STARTER, { allowPlaceholders: true });
  if (!r) return;
  assert.equal(r.verdict, 'CONDITIONAL', JSON.stringify(r.reasons));
  assert.ok(r.limits.some((l) => l.startsWith('PA-011')), r.limits.join('\n'));
  assert.equal(r.counts.fail, 0);
});

test('--allow-foreign is recorded as a skipped foreign-host test (limit), never as a pass', { timeout: 90000 }, async (t) => {
  const r = await report(t, STARTER, { allowPlaceholders: true, allowForeign: true });
  if (!r) return;
  const c = r.checks.find((x) => x.id === 'PA-007');
  assert.equal(c.status, 'skipped');
});

test('page-audit report records executed passes as well as problems', { timeout: 90000 }, async (t) => {
  const r = await report(t, BAD, {});
  if (!r) return;
  assert.equal(r.verdict, 'FAIL');
  assert.ok(r.checks.length > 18, `only ${r.checks.length} entries`);
  assert.equal(r.tool, 'page-audit');
});
