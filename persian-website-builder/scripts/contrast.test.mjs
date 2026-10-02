import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, verdict, parseColor } from './contrast.mjs';

test('black on white is 21:1', () => {
  assert.equal(contrastRatio('#000', '#fff').toFixed(2), '21.00');
});

test('#767676 on white is the well-known AA boundary (~4.54:1)', () => {
  const r = contrastRatio('#767676', '#ffffff');
  assert.ok(r > 4.5 && r < 4.6, String(r));
  assert.equal(verdict(r).text_AA, true);
});

test('#777777 on white fails AA for normal text but passes large text', () => {
  const r = contrastRatio('#777777', '#ffffff');
  assert.ok(r < 4.5 && r >= 3, String(r));
  assert.equal(verdict(r).text_AA, false);
  assert.equal(verdict(r).largeText_AA, true);
});

test('order of arguments does not matter', () => {
  assert.equal(contrastRatio('#123456', '#fedcba'), contrastRatio('#fedcba', '#123456'));
});

test('short hex expands; invalid input throws', () => {
  assert.deepEqual(parseColor('#abc'), [170, 187, 204]);
  assert.throws(() => parseColor('rgba(0,0,0,.5)'));
});

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const CLI = fileURLToPath(new URL('./contrast.mjs', import.meta.url));
test('REGRESSION: an unreadable color is exit 2 (could not run), distinct from exit 1 (below AA)', () => {
  assert.equal(spawnSync(process.execPath, [CLI, 'rgba(0,0,0,.5)', '#fff']).status, 2);
  assert.equal(spawnSync(process.execPath, [CLI, '#999', '#fff']).status, 1);
  assert.equal(spawnSync(process.execPath, [CLI, '#000', '#fff']).status, 0);
});
