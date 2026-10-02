// The skill's own tools applied to this site, and the checks that keep the design, copy, licences and dependencies honest.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { startServer, TEST_ENV, SITE } from './helpers/server.mjs';
import { auditReport } from '../../../persian-website-builder/scripts/page-audit.mjs';
import { smokeReport } from '../../../persian-website-builder/scripts/security-smoke.mjs';
import { scanReport } from '../../../persian-website-builder/scripts/rtl-smells.mjs';
import { contrastRatio } from '../../../persian-website-builder/scripts/contrast.mjs';
import content from '../content/clinic.fa.json' with { type: 'json' };

const read = (p) => readFileSync(join(SITE, p), 'utf8');
let srv;
before(async () => { srv = await startServer({ env: { CLINIC_FIXED_NOW: TEST_ENV.CLINIC_FIXED_NOW } }); });
after(async () => { await srv?.stop(); });

const browserSkip = (t, e) => { if (/Playwright is not installed|Executable doesn't exist|browserType\.launch/.test(e.message)) { t.skip(`browser unavailable: ${e.message.split('\n')[0]}`); return true; } return false; };

for (const path of ['/', '/appointment']) {
  test(`page-audit ${path} (foreign hosts blocked, 320/360/768 px): no failures, nothing incomplete, only the known canonical warning`, { timeout: 120000 }, async (t) => {
    let r; try { r = await auditReport(`${srv.url}${path}`, {}); } catch (e) { if (browserSkip(t, e)) return; throw e; }
    assert.equal(r.counts.fail, 0, JSON.stringify(r.checks.filter((c) => c.status === 'fail')));
    assert.equal(r.counts.incomplete + r.counts.unknown, 0);
    assert.equal(r.counts.skipped, 0, 'no check may be skipped for this site');
    assert.deepEqual(r.checks.filter((c) => c.status === 'warn').map((c) => c.id), ['PA-014'], 'only the canonical link may be missing (sample is noindex by design)');
    assert.equal(r.checks.find((c) => c.id === 'PA-007').status, 'pass', 'the page works with every foreign host blocked');
    assert.equal(r.verdict, 'CONDITIONAL');
  });
}

test('lab performance under a Lighthouse-style mobile throttle (EXPERIMENTAL profile): LCP <= 2500 ms and CLS <= 0.1 on both pages', { timeout: 180000 }, async (t) => {
  for (const path of ['/', '/appointment']) {
    let r; try { r = await auditReport(`${srv.url}${path}`, { throttle: true, viewports: [360] }); } catch (e) { if (browserSkip(t, e)) return; throw e; }
    const m = /lab LCP (\d+) ms, CLS ([\d.]+)/.exec(r.checks.find((c) => c.id === 'PA-016').msg);
    assert.ok(m, `LCP not measured on ${path}`);
    assert.ok(Number(m[1]) <= 2500, `${path}: LCP ${m[1]} ms`);
    assert.ok(Number(m[2]) <= 0.1, `${path}: CLS ${m[2]}`);
  }
});

test('security-smoke: no failure, warning or incomplete probe; CONDITIONAL only because HTTPS-only controls are not evaluable over plain HTTP', { timeout: 120000 }, async () => {
  const r = await smokeReport(`${srv.url}/`, { timeoutMs: 8000 });
  assert.equal(r.counts.fail + r.counts.warn + r.counts.incomplete + r.counts.unknown, 0, JSON.stringify(r.checks.filter((c) => ['fail', 'warn', 'incomplete', 'unknown'].includes(c.status))));
  assert.equal(r.verdict, 'CONDITIONAL');
  assert.deepEqual(r.checks.filter((c) => c.status === 'skipped').map((c) => c.id), ['SEC-004']);
  assert.ok(r.limits.some((l) => /HTTPS/.test(l)));
});

test('rtl-smells on the application source: PASS (no physical CSS, no foreign hosts, lang/dir present)', () => {
  const r = scanReport(join(SITE, 'app'));
  assert.ok(r.filesScanned >= 8, `only ${r.filesScanned} files scanned`);
  assert.equal(r.verdict, 'PASS', JSON.stringify(r.checks.filter((c) => c.status !== 'pass')));
});

test('design: every text/background pair meets WCAG AA, every control boundary and the focus ring meet 3:1', () => {
  const css = read('app/globals.css');
  const tokens = Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]));
  const text = [['ink', 'ivory'], ['ink', 'paper'], ['ink', 'ivory-deep'], ['ink-muted', 'ivory'], ['ink-muted', 'paper'], ['ink-muted', 'ivory-deep'], ['ivory', 'forest'], ['ivory', 'forest-deep'],
    ['forest', 'ivory'], ['forest', 'ivory-deep'], ['forest', 'paper'], ['gold', 'ivory'], ['gold', 'ivory-deep'], ['gold', 'paper'], ['error', 'ivory'], ['error', 'paper'], ['error', 'error-surface'], ['ink', 'error-surface'], ['ivory', 'ink']];
  const ui = [['field-border', 'paper'], ['field-border', 'ivory'], ['focus', 'ivory'], ['focus', 'paper']];
  for (const [fg, bg] of text) { assert.ok(tokens[fg] && tokens[bg], `token missing: ${fg}/${bg}`); assert.ok(contrastRatio(tokens[fg], tokens[bg]) >= 4.5, `${fg} on ${bg} = ${contrastRatio(tokens[fg], tokens[bg]).toFixed(2)}`); }
  for (const [fg, bg] of ui) assert.ok(contrastRatio(tokens[fg], tokens[bg]) >= 3, `${fg} on ${bg} = ${contrastRatio(tokens[fg], tokens[bg]).toFixed(2)}`);
});

const allStrings = (v, out = []) => { if (typeof v === 'string') out.push(v); else if (v && typeof v === 'object') Object.entries(v).filter(([k]) => k !== '_note').forEach(([, x]) => allStrings(x, out)); return out; };

test('copy: Persian punctuation, Persian digits in prose, ZWNJ in common verbs, no placeholder text, no unqualified medical claims', () => {
  const strings = allStrings(content);
  for (const s of strings) {
    assert.doesNotMatch(s, /[؀-ۿ][?,;]/, `Latin punctuation after Persian letters: ${s}`);
    assert.doesNotMatch(s, /[0-9]/, `Latin digit in Persian prose: ${s}`);
    assert.doesNotMatch(s, /lorem|example\.|TODO|placeholder|XXX/i, s);
    assert.doesNotMatch(s, /(?:^|\s)(میشود|نمیشود|میکنید|میخواهید|میتوانید|میگیرند|میکند)(?:\s|$|[.،؟])/, `missing ZWNJ (نیم‌فاصله): ${s}`);
    assert.doesNotMatch(s, /درمان قطعی|تضمین|بهترین|بی‌نظیر|ارزان‌ترین/, `unprovable or medical superlative: ${s}`);
  }
  assert.ok(strings.length > 60);
});

test('copy: the sample status is stated on every page and the emergency number is present in the FAQ', async () => {
  for (const path of ['/', '/appointment']) {
    const html = await (await fetch(`${srv.url}${path}`)).text();
    assert.ok(html.includes(content.sample.banner), `banner missing on ${path}`);
  }
  assert.ok(content.home.faq.items.some((i) => /۱۱۵/.test(i.a)));
});

test('licences: the font is the pinned OFL package, its licence text hash and version match LICENSES.md and the lockfile', (t) => {
  const pkgPath = join(SITE, 'node_modules/vazirmatn/package.json');
  if (!existsSync(pkgPath)) return t.skip('dependencies not installed: run `npm ci` in sites/clinic-calm');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const lock = JSON.parse(read('package-lock.json'));
  const doc = read('LICENSES.md');
  assert.equal(pkg.version, lock.packages['node_modules/vazirmatn'].version);
  assert.match(doc, new RegExp(`Vazirmatn[^\\n]*${pkg.version.replace(/\./g, '\\.')}`));
  const oflHash = createHash('sha256').update(readFileSync(join(SITE, 'node_modules/vazirmatn/OFL.txt'))).digest('hex');
  assert.ok(doc.includes(oflHash), `LICENSES.md must record the sha256 of the shipped OFL.txt (${oflHash})`);
  assert.match(doc, /OFL-1\.1/);
  assert.match(readFileSync(join(SITE, 'node_modules/vazirmatn/OFL.txt'), 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
});

test('dependencies: exact pins, install scripts disabled, lockfile v3 with integrity for every package, nothing outside the reference set', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const [name, v] of Object.entries(pkg.dependencies)) assert.match(v, /^\d+\.\d+\.\d+$/, `${name} must be pinned exactly, got ${v}`);
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), ['next', 'react', 'react-dom', 'vazirmatn']);
  assert.equal(pkg.devDependencies, undefined);
  assert.match(read('.npmrc'), /ignore-scripts=true/);
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.lockfileVersion, 3);
  for (const [path, e] of Object.entries(lock.packages)) if (path) assert.ok(e.integrity, `${path} has no integrity hash`);
  for (const name of Object.keys(pkg.dependencies)) assert.equal(lock.packages[`node_modules/${name}`].version, pkg.dependencies[name]);
});

test('assets: no images, no third-party files in the repository part of the site; the font comes only from the pinned package', () => {
  const files = (dir) => readdirSync(join(SITE, dir), { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(join(dir, d.name)) : [join(dir, d.name)]));
  const sources = ['app', 'lib', 'content'].flatMap(files);
  assert.deepEqual(sources.filter((f) => /\.(png|jpe?g|gif|webp|avif|svg|woff2?|ttf|otf|ico|mp4|webm)$/i.test(f)), [], 'binary or media assets need an explicit licence entry first');
  assert.equal(existsSync(join(SITE, 'public')), false);
});
