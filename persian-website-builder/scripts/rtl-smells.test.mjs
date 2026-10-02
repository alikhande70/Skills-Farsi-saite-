import test from 'node:test';
import assert from 'node:assert/strict';
import { scanText } from './rtl-smells.mjs';

const ids = (text) => scanText(text).map((f) => f.id);

test('physical CSS is flagged, logical CSS is not', () => {
  assert.deepEqual(ids('.a{margin-left:8px}'), ['RTL001']);
  assert.deepEqual(ids('.a{padding-right: 1rem}'), ['RTL001']);
  assert.deepEqual(ids('.a{border-left:1px solid}'), ['RTL002']);
  assert.deepEqual(ids('.a{position:absolute;left:0}'), ['RTL003']);
  assert.deepEqual(ids('.a{float:right}'), ['RTL004']);
  assert.deepEqual(ids('.a{text-align:left}'), ['RTL005']);
  assert.deepEqual(ids('.a{margin-inline-start:8px;padding-inline:1rem;inset-inline-start:0;text-align:start}'), []);
});

test('left:auto and similar resets are not flagged as offsets', () => {
  assert.deepEqual(ids('.a{left:auto}'), []);
  assert.deepEqual(ids('.a{right:unset}'), []);
});

test('tailwind physical utilities flagged, logical ones are not', () => {
  assert.ok(ids('<div class="ml-4 text-left">').includes('RTL007'));
  assert.ok(ids('<div class="rounded-l-lg">').includes('RTL007'));
  assert.deepEqual(ids('<div class="ms-4 pe-2 text-start rounded-s-lg border-s">'), []);
});

test('letter-spacing: non-zero flagged, zero/normal not', () => {
  assert.deepEqual(ids('h1{letter-spacing:0.05em}'), ['RTL008']);
  assert.deepEqual(ids('h1{letter-spacing:0}'), []);
  assert.deepEqual(ids('h1{letter-spacing:normal}'), []);
});

test('html lang/dir checks', () => {
  assert.ok(ids('<html><body></body></html>').includes('RTL011'));
  assert.ok(ids('<html lang="fa"><body></body></html>').includes('RTL012'));
  assert.deepEqual(ids('<html lang="fa" dir="rtl"><body></body></html>'), []);
  assert.deepEqual(ids('<html lang="en"><body></body></html>'), []);
});

test('third-party hosts flagged', () => {
  assert.ok(ids('@import url(https://fonts.googleapis.com/css2?family=Vazirmatn)').includes('IRN001'));
  assert.ok(ids('<script src="https://www.googletagmanager.com/gtm.js">').includes('IRN002'));
  assert.ok(ids('<script src="https://unpkg.com/x">').includes('IRN003'));
});

test('rtl-ignore suppresses a line', () => {
  assert.deepEqual(ids('.a{margin-left:8px} /* rtl-ignore: icon is always left */'), []);
});

test('line numbers are 1-based', () => {
  const f = scanText('a{}\nb{margin-left:1px}')[0];
  assert.equal(f.line, 2);
});
