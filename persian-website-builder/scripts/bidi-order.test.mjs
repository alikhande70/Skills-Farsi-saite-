// Guards evidence E-018 (bidi behaviour). If one of these fails after a browser upgrade, the claim in
// references/persian-ux.md §1 must be re-verified, not the test silenced. Skipped when no browser is available.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { visualOrder } from './bidi-order.mjs';

const FIXTURE = fileURLToPath(new URL('./fixtures/bidi-hazards.html', import.meta.url));

test('E-018: bidi behaviour of phone numbers, signs, percent, dir=auto', { timeout: 60000 }, async (t) => {
  let rows;
  try { rows = await visualOrder(FIXTURE); } catch (e) {
    if (/Cannot find module|Executable doesn't exist|browserType\.launch/.test(e.message)) return t.skip(`browser unavailable: ${e.message.split('\n')[0]}`);
    throw e;
  }
  const v = (id) => rows.find((r) => r.id === id).visualLTR.join(' ');
  // Phone: plain RTL text reverses the digit groups and strands the plus after the digits; bdi dir=ltr fixes it.
  assert.ok(v('phone-plain').includes('6789 345 912 98+'), v('phone-plain'));
  assert.ok(v('phone-bdi').includes('+98 912 345 6789'), v('phone-bdi'));
  assert.ok(v('phone-local-plain').includes('6789 345 0912'), v('phone-local-plain'));
  // Minus: ASCII hyphen-minus and U+2212 trail the digits in plain RTL text; bdi and Intl('fa') put the sign first.
  assert.ok(v('minus-plain').includes('۵۰۰-'), v('minus-plain'));
  assert.ok(v('minus-u2212-plain').includes('۵۰۰−'), v('minus-u2212-plain'));
  assert.ok(v('minus-bdi').includes('-۵۰۰'), v('minus-bdi'));
  assert.ok(v('minus-intl').includes('−۵۰۰'), v('minus-intl'));
  // Percent: default places the sign left of the digits; bdi puts it right of them.
  assert.ok(v('percent-plain').includes('٪۲۰'), v('percent-plain'));
  assert.ok(v('percent-bdi').includes('۲۰%'), v('percent-bdi'));
  // User-generated text starting with Latin gets an LTR block with dir="auto".
  assert.ok(v('ugc-auto').startsWith('Hello'), v('ugc-auto'));
  // Not hazards in this simple case: sentence-final punctuation sits at the line end (left in RTL).
  assert.ok(v('trailing-english-punct').startsWith('!Samsung Galaxy S24'), v('trailing-english-punct'));
});
