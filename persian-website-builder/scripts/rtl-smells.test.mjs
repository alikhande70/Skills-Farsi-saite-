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

// ---------------------------------------------------------------------------------------------
// Hidden-failure regression suite (run 2): an empty/wrong directory used to print "0 findings" and exit 0;
// a missing path crashed with exit 1 (the same code as "violations found").
// ---------------------------------------------------------------------------------------------
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = fileURLToPath(new URL('./rtl-smells.mjs', import.meta.url));
function runCli(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [CLI, ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; let err = '';
    child.stdout.on('data', (d) => (out += d)); child.stderr.on('data', (d) => (err += d));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}
const tmp = (files) => {
  const dir = mkdtempSync(join(tmpdir(), 'rtl-smells-'));
  for (const [name, content] of Object.entries(files)) { mkdirSync(join(dir, name, '..'), { recursive: true }); writeFileSync(join(dir, name), content); }
  return dir;
};

test('REGRESSION: an empty directory is INCOMPLETE (exit 3), not a clean pass', async () => {
  const r = await runCli([tmp({})]);
  assert.equal(r.code, 3, `${r.out}${r.err}`);
  assert.match(r.out, /INCOMPLETE/);
  assert.doesNotMatch(r.out, /VERDICT: (PASS|CONDITIONAL)/);
});

test('REGRESSION: a directory with only unscannable file types is INCOMPLETE', async () => {
  const r = await runCli([tmp({ 'logo.png': 'x', 'notes.txt': 'margin-left: 1px' })]);
  assert.equal(r.code, 3, `${r.out}${r.err}`);
});

test('REGRESSION: a missing path is "could not run" (exit 2), distinct from "violations found" (exit 1)', async () => {
  const r = await runCli([join(tmpdir(), 'rtl-smells-does-not-exist-xyz')]);
  assert.equal(r.code, 2, `${r.out}${r.err}`);
  assert.match(r.err, /CANNOT RUN/);
});

test('clean source scanned -> PASS (exit 0); warnings only -> CONDITIONAL (exit 0); errors -> FAIL (exit 1)', async () => {
  const clean = await runCli([tmp({ 'a.css': '.a{margin-inline-start:1px}', 'index.html': '<html lang="fa" dir="rtl"><body></body></html>' })]);
  assert.equal(clean.code, 0, `${clean.out}${clean.err}`);
  assert.match(clean.out, /VERDICT: PASS/);
  const warn = await runCli([tmp({ 'a.css': '.a{margin-left:1px}' })]);
  assert.equal(warn.code, 0, `${warn.out}${warn.err}`);
  assert.match(warn.out, /VERDICT: CONDITIONAL/);
  const bad = await runCli([tmp({ 'index.html': '<html><body></body></html>' })]);
  assert.equal(bad.code, 1, `${bad.out}${bad.err}`);
  assert.match(bad.out, /VERDICT: FAIL/);
});

test('JSON report states how many files were scanned', async () => {
  const r = await runCli([tmp({ 'a.css': '.a{color:red}', 'b/c.css': '.b{color:blue}' }), '--json']);
  const report = JSON.parse(r.out);
  assert.equal(report.filesScanned, 2);
  assert.equal(report.tool, 'rtl-smells');
});
