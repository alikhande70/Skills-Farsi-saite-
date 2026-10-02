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
