import test from 'node:test';
import assert from 'node:assert/strict';
import { createLedger, summarize, exitCodeFor, renderText, buildReport } from './verdict.mjs';

const verdictOf = (...statuses) => {
  const l = createLedger();
  statuses.forEach((s, i) => l.add(`C-${i}`, s, 'msg'));
  return summarize(l.checks).verdict;
};

test('PASS needs positive evidence and no warnings, skips or incompletes', () => {
  assert.equal(verdictOf('pass', 'pass', 'info', 'not-applicable'), 'PASS');
});

test('no checks executed is INCOMPLETE, never PASS', () => {
  assert.equal(verdictOf(), 'INCOMPLETE');
  assert.equal(verdictOf('info', 'not-applicable'), 'INCOMPLETE');
});

test('incomplete and unknown checks make the whole run INCOMPLETE even when everything else passed', () => {
  assert.equal(verdictOf('pass', 'pass', 'incomplete'), 'INCOMPLETE');
  assert.equal(verdictOf('pass', 'unknown'), 'INCOMPLETE');
});

test('skipped-by-scope and warnings give CONDITIONAL, with the limits listed', () => {
  assert.equal(verdictOf('pass', 'skipped'), 'CONDITIONAL');
  assert.equal(verdictOf('pass', 'warn'), 'CONDITIONAL');
  const l = createLedger();
  l.add('X-1', 'pass', 'ok');
  l.add('X-2', 'skipped', 'HTTPS-only check not evaluated on an HTTP target');
  assert.deepEqual(summarize(l.checks).limits, ['X-2: HTTPS-only check not evaluated on an HTTP target']);
});

test('FAIL outranks INCOMPLETE, which outranks CONDITIONAL', () => {
  assert.equal(verdictOf('fail', 'incomplete', 'warn'), 'FAIL');
  assert.equal(verdictOf('incomplete', 'warn', 'skipped'), 'INCOMPLETE');
});

test('exit codes: PASS/CONDITIONAL 0, FAIL 1, INCOMPLETE 3', () => {
  assert.deepEqual(['PASS', 'CONDITIONAL', 'FAIL', 'INCOMPLETE'].map(exitCodeFor), [0, 0, 1, 3]);
});

test('unknown status is rejected loudly', () => {
  assert.throws(() => createLedger().add('X', 'ok', 'typo'), /unknown check status/);
});

test('text rendering never claims success for INCOMPLETE and shows limits', () => {
  const l = createLedger();
  l.add('A-1', 'pass', 'fine');
  l.add('A-2', 'incomplete', 'probe timed out', { detail: 'ETIMEDOUT' });
  const text = renderText(buildReport('demo', {}, l.checks));
  assert.match(text, /VERDICT: INCOMPLETE/);
  assert.match(text, /Not verified/);
  assert.doesNotMatch(text, /VERDICT: (PASS|CONDITIONAL)/);
  assert.match(text, /INCOMPLETE\s+A-2/);
});
