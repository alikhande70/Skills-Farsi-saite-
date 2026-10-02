// Real browser (Chromium via Playwright) against the real production server. Mobile viewport first.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { startServer, TEST_ENV } from './helpers/server.mjs';
import content from '../content/clinic.fa.json' with { type: 'json' };
import { REF_PATTERN } from '../lib/ref.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const L = content.appointment.labels;
const S = content.appointment.states;
const DAY = '2026-10-06';
let srv; let browser;
before(async () => { srv = await startServer({ env: { ...TEST_ENV, CLINIC_RATE_LIMIT_IP: '1000' } }); browser = await chromium.launch(); });
after(async () => { await browser?.close(); await srv?.stop(); });

async function open(path = '/appointment', { server = srv, context = {}, js = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, locale: 'fa-IR', timezoneId: 'Asia/Tehran', javaScriptEnabled: js, ...context });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  await page.goto(`${server.url}${path}`);
  if (js && path === '/appointment') await page.waitForSelector('form[data-hydrated="true"]');
  return { ctx, page, problems };
}

async function fillValid(page, { mobile = '۰۹۱۲۳۴۵۶۷۸۹', name = 'مریم احمدی' } = {}) {
  await page.getByLabel(L.name).fill(name);
  await page.getByLabel(L.mobile).fill(mobile);
  await page.getByLabel('ویزیت و مشاورهٔ اولیه').check();
  await page.selectOption('#field-day', DAY);
  await page.getByLabel(content.appointment.windows.morning).check();
  await page.getByLabel(/موافقم/).check();
}
const submit = (page) => page.getByRole('button', { name: L.submit });
const focusedIs = (page, selector) => page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);

test('main path: home -> call to action -> form -> success with a reference; stored normalized; no console or CSP errors', { timeout: 90000 }, async () => {
  const { ctx, page, problems } = await open('/');
  await page.getByRole('link', { name: content.cta.label }).first().click();
  await page.waitForURL('**/appointment');
  await page.waitForSelector('form[data-hydrated="true"]');
  const before = srv.records().length;
  await fillValid(page, { mobile: '۰۹۱۲۳۴۵۶۷۸۹' });
  await submit(page).click();
  const heading = page.getByRole('heading', { name: S.successTitle });
  await heading.waitFor();
  assert.ok(await focusedIs(page, 'h2'), 'focus moves to the success heading');
  const ref = await page.getByTestId('ref').textContent();
  assert.match(ref, REF_PATTERN);
  assert.equal(await page.getByTestId('ref').getAttribute('dir'), 'ltr', 'reference is an LTR isolate inside RTL text');
  const rec = srv.records().at(-1);
  assert.equal(srv.records().length, before + 1);
  assert.equal(rec.mobile, '09123456789', 'Persian digits are normalized on the server');
  assert.equal(rec.ref, ref);
  assert.deepEqual(problems, []);
  await ctx.close();
});

test('"another request" resets the form and uses a NEW idempotency key (second record, not a replay)', { timeout: 90000 }, async () => {
  const { ctx, page } = await open();
  const keys = [];
  page.on('request', (r) => { if (r.url().endsWith('/api/appointments')) keys.push(r.headers()['idempotency-key']); });
  await fillValid(page, { mobile: '09120001111' });
  await submit(page).click();
  const ref1 = await page.getByTestId('ref').textContent();
  await page.getByRole('button', { name: L.another }).click();
  assert.equal(await page.getByLabel(L.name).inputValue(), '');
  await fillValid(page, { mobile: '09120001112' });
  await submit(page).click();
  await page.getByTestId('ref').waitFor();
  const ref2 = await page.getByTestId('ref').textContent();
  assert.notEqual(ref1, ref2);
  assert.equal(new Set(keys).size, 2);
  await ctx.close();
});

test('validation error: Persian summary is announced and focused, every field is explained, nothing typed is lost, fixing it succeeds', { timeout: 90000 }, async () => {
  const { ctx, page } = await open();
  await page.getByLabel(L.name).fill('مریم احمدی');
  await submit(page).click();
  const alert = page.locator('form [role="alert"]');
  await alert.waitFor();
  assert.match(await alert.textContent(), new RegExp(S.validationSummary));
  assert.ok(await focusedIs(page, 'form [role="alert"]'), 'focus goes to the error summary');
  for (const text of [content.appointment.errors.mobile.required, content.appointment.errors.service.required, content.appointment.errors.day.required, content.appointment.errors.window.required, content.appointment.errors.consent.required]) {
    assert.ok(await page.getByText(text).first().isVisible(), `missing message: ${text}`);
  }
  assert.equal(await page.getByLabel(L.name).inputValue(), 'مریم احمدی', 'valid input is preserved');
  assert.equal(await page.getByLabel(L.mobile).getAttribute('aria-invalid'), 'true');
  assert.match(await page.getByLabel(L.mobile).getAttribute('aria-describedby'), /mobile-error/);
  await page.getByLabel(L.mobile).fill('0812345678'); // wrong prefix
  await page.getByLabel('مراقبت پوست').check();
  await page.selectOption('#field-day', DAY);
  await page.getByLabel(content.appointment.windows.evening).check();
  await page.getByLabel(/موافقم/).check();
  await submit(page).click();
  await page.getByText(content.appointment.errors.mobile.invalid).first().waitFor();
  await page.getByLabel(L.mobile).fill('09121234567');
  await submit(page).click();
  await page.getByTestId('ref').waitFor();
  await ctx.close();
});

test('server error then retry: input is kept, the retry button re-sends the SAME key, exactly one record results', { timeout: 90000 }, async () => {
  const { ctx, page } = await open();
  const keys = [];
  await page.route('**/api/appointments', (route) => { keys.push(route.request().headers()['idempotency-key']); route.continue({ headers: { ...route.request().headers(), 'x-test-fault': 'fail-once' } }); });
  const before = srv.records().length;
  await fillValid(page, { mobile: '09120002222' });
  await submit(page).click();
  const alert = page.locator('form [role="alert"]');
  await alert.waitFor();
  assert.equal(await alert.getAttribute('data-state'), 'server_error');
  assert.match(await alert.textContent(), new RegExp(S.serverError));
  assert.ok(await focusedIs(page, 'form [role="alert"]'), 'focus goes to the error message');
  assert.equal(srv.records().length, before, 'the failed attempt stored nothing');
  assert.equal(await page.getByLabel(L.mobile).inputValue(), '09120002222', 'input survives the failure');
  await page.getByRole('button', { name: L.retry }).click();
  await page.getByTestId('ref').waitFor();
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1], 'the retry reuses the idempotency key');
  assert.equal(srv.records().length, before + 1);
  await ctx.close();
});

test('lost connection then retry: network-error state, input kept, retry succeeds once the connection is back', { timeout: 90000 }, async () => {
  const { ctx, page } = await open();
  const before = srv.records().length;
  await fillValid(page, { mobile: '09120003333' });
  await ctx.setOffline(true);
  await submit(page).click();
  const alert = page.locator('form [role="alert"]');
  await alert.waitFor();
  assert.equal(await alert.getAttribute('data-state'), 'network_error');
  assert.match(await alert.textContent(), new RegExp(S.networkError));
  assert.equal(await page.getByLabel(L.name).inputValue(), 'مریم احمدی');
  await ctx.setOffline(false);
  await page.getByRole('button', { name: L.retry }).click();
  await page.getByTestId('ref').waitFor();
  assert.equal(srv.records().length, before + 1);
  await ctx.close();
});

test('double click on submit stores one request', { timeout: 90000 }, async () => {
  const { ctx, page } = await open();
  const before = srv.records().length;
  await fillValid(page, { mobile: '09120004444' });
  await submit(page).dblclick();
  await page.getByTestId('ref').waitFor();
  await page.waitForTimeout(400);
  assert.equal(srv.records().filter((r) => r.mobile === '09120004444').length, 1);
  assert.equal(srv.records().length, before + 1);
  await ctx.close();
});

test('rate limited: a Persian message without a retry button; input kept', { timeout: 120000 }, async () => {
  const s = await startServer({ env: { ...TEST_ENV, CLINIC_RATE_LIMIT_MOBILE: '1', CLINIC_RATE_LIMIT_IP: '1000' } });
  try {
    const { ctx, page } = await open('/appointment', { server: s });
    await fillValid(page, { mobile: '09120005555' });
    await submit(page).click();
    await page.getByTestId('ref').waitFor();
    await page.getByRole('button', { name: L.another }).click();
    await fillValid(page, { mobile: '09120005555' });
    await submit(page).click();
    const alert = page.locator('form [role="alert"]');
    await alert.waitFor();
    assert.equal(await alert.getAttribute('data-state'), 'rate_limited');
    assert.match(await alert.textContent(), new RegExp(S.rateLimited));
    assert.equal(await page.getByRole('button', { name: L.retry }).count(), 0, 'retrying immediately cannot help');
    assert.equal(await page.getByLabel(L.name).inputValue(), 'مریم احمدی');
    await ctx.close();
  } finally { await s.stop(); }
});

test('keyboard only: every control is reachable in reading order and the form can be submitted without a mouse', { timeout: 90000 }, async () => {
  const { ctx, page } = await open();
  const stops = [];
  for (let i = 0; i < 25; i += 1) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => { const e = document.activeElement; const tag = e.tagName.toLowerCase(); return `${tag}${tag === 'input' || tag === 'button' ? `[${e.type}]` : ''}${e.name ? `:${e.name}` : ''}`; }));
  }
  const wanted = ['input[text]:name', 'input[tel]:mobile', 'input[radio]:service', 'select:day', 'input[radio]:window', 'textarea:note', 'input[checkbox]:consent', 'button[submit]'];
  let at = -1;
  for (const w of wanted) { const i = stops.indexOf(w, at + 1); assert.ok(i > at, `${w} not reached in order; stops: ${stops.join(' > ')}`); at = i; }
  assert.equal(stops[0], 'a', 'the skip link is the first stop');
  await fillValid(page, { mobile: '09120006666' });
  await page.getByLabel(/موافقم/).focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await page.getByTestId('ref').waitFor();
  await ctx.close();
});

test('RTL and mobile: lang/dir, no horizontal overflow at 320 and 360 px on both pages, Persian digits in the day list', { timeout: 90000 }, async () => {
  for (const width of [320, 360]) {
    for (const path of ['/', '/appointment']) {
      const { ctx, page } = await open(path, { context: { viewport: { width, height: 800 } } });
      const m = await page.evaluate(() => ({ lang: document.documentElement.lang, dir: document.documentElement.dir, over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
      assert.deepEqual([m.lang, m.dir], ['fa', 'rtl']);
      assert.ok(m.over <= 0, `${path} overflows by ${m.over}px at ${width}px`);
      if (path === '/appointment') {
        const options = await page.locator('#field-day option').allTextContents();
        assert.ok(options.slice(1).every((t) => /[۰-۹]/.test(t) && !/جمعه/.test(t)), options.join(' | '));
        assert.equal(options.length, 11);
      }
      await ctx.close();
    }
  }
});

test('the web font is self-hosted and loaded; every request stays on the origin', { timeout: 90000 }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 } });
  const page = await ctx.newPage();
  const hosts = new Set();
  page.on('request', (r) => hosts.add(new URL(r.url()).host));
  await page.goto(`${srv.url}/`);
  await page.waitForLoadState('networkidle');
  const loaded = await page.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').length; });
  assert.ok(loaded >= 1, 'no web font loaded');
  assert.deepEqual([...hosts], [new URL(srv.url).host]);
  await ctx.close();
});

test('reduced motion: the entrance animation is switched off', { timeout: 90000 }, async () => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${srv.url}/`);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.hero__inner h1')).animationName), 'none');
  await ctx.close();
});

test('without JavaScript: the home page is fully readable; the form cannot be submitted and no personal data reaches the URL', { timeout: 90000 }, async () => {
  const home = await open('/', { js: false });
  assert.ok(await home.page.getByRole('heading', { name: content.home.hero.title }).isVisible());
  assert.ok(await home.page.getByText(content.home.faq.items[3].a, { exact: false }).count() >= 1, 'FAQ answers are in the HTML');
  await home.ctx.close();
  const { ctx, page } = await open('/appointment', { js: false });
  await page.getByLabel(L.name).fill('مریم احمدی');
  await page.getByLabel(L.mobile).fill('09123456789');
  assert.equal(await submit(page).isDisabled(), true, 'the submit button is disabled until handlers exist');
  await page.getByLabel(L.mobile).press('Enter'); // implicit submission is blocked while the default button is disabled
  await page.waitForTimeout(300);
  const url = decodeURIComponent(page.url());
  assert.doesNotMatch(url, /مریم|09123456789|\?/, `personal data leaked into the URL: ${url}`);
  assert.match(await page.locator('noscript').first().innerHTML().catch(() => ''), /./);
  await ctx.close();
});
