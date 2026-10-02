#!/usr/bin/env node
// Browser-based audit of ONE page against the automatable items of the skill's gates.
// Needs Playwright + Chromium installed in the project (the skill itself has no dependencies).
//
// Usage: node page-audit.mjs <url|file.html> [--viewports=320,360,768] [--allow-foreign]
//        [--allow-placeholders] [--throttle] [--lang=fa] [--json]
//
// DEFAULT MODE BLOCKS EVERY FOREIGN http(s) HOST. This is the "I-2 test" from references/iran-context.md:
// critical content must still render when only your own origin is reachable.
// Exit code 1 if any finding has severity "error". Findings are evidence for gate files, not a verdict:
// automation catches only part of what a human review catches (references/accessibility.md §7).

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CHECKS = {
  'PA-001': 'html lang (G-FA 1)', 'PA-002': 'html dir (G-FA 1)', 'PA-003': 'horizontal overflow (G-FA 8, EC-041)',
  'PA-004': 'touch target size (WCAG 2.5.8)', 'PA-005': 'images: dimensions/alt (CLS, a11y)', 'PA-006': 'foreign hosts requested (I-2)',
  'PA-007': 'page breaks when foreign hosts blocked (I-2)', 'PA-008': 'letter-spacing on Persian text (G-FA 3)', 'PA-009': 'italic on Persian text (G-FA 3)',
  'PA-010': 'Latin punctuation after Persian letters (G-FA 14)', 'PA-011': 'placeholder content (AP-007)', 'PA-012': 'heading outline',
  'PA-013': 'form control without accessible name', 'PA-014': 'title/description/canonical (G-SEO)', 'PA-015': 'fonts in use (info)',
  'PA-016': 'lab LCP/CLS (G-PERF; lab only)', 'PA-017': 'zoom blocked by viewport meta (WCAG 1.4.4)', 'PA-018': 'console/page errors',
};

const PLACEHOLDER = /lorem ipsum|example\.(com|org|net|invalid)|0912\s*0{3}|\bTODO\b|\bplaceholder\b/i;

async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  try { return require('playwright'); } catch { /* fall through */ }
  try { return await import('playwright'); } catch {
    throw new Error('Playwright is not installed. Install it in the project (e.g. `npm i -D playwright && npx playwright install chromium`) or set NODE_PATH.');
  }
}

export async function runAudit(target, opts = {}) {
  const { viewports = [320, 360, 768], allowForeign = false, allowPlaceholders = false, throttle = false, lang = 'fa' } = opts;
  const url = /^(https?|file):/i.test(target) ? target : pathToFileURL(resolve(target)).href;
  if (url.startsWith('file:') && !existsSync(new URL(url))) throw new Error(`File not found: ${target}`);
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const findings = [];
  const add = (id, severity, msg, detail) => findings.push({ id, severity, msg, ...(detail ? { detail } : {}) });
  try {
    const context = await browser.newContext({ viewport: { width: viewports[0], height: 800 }, deviceScaleFactor: 1, userAgent: undefined });
    const page = await context.newPage();
    const pageOrigin = new URL(url);
    const foreign = new Set();
    const consoleErrors = [];
    const pageErrors = [];
    await context.route(/^https?:/i, (route) => {
      const u = new URL(route.request().url());
      const isForeign = pageOrigin.protocol === 'file:' || u.host !== pageOrigin.host;
      if (isForeign) {
        foreign.add(u.host);
        return allowForeign ? route.continue() : route.abort('blockedbyclient');
      }
      return route.continue();
    });
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_BLOCKED_BY_CLIENT/.test(m.text())) consoleErrors.push(m.text()); });
    page.on('pageerror', (e) => pageErrors.push(String(e.message ?? e)));
    await page.addInitScript(() => {
      window.__cls = 0; window.__lcp = 0;
      try {
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      } catch { /* unsupported */ }
    });
    if (throttle) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      // Lighthouse-style mobile profile (EXPERIMENTAL; adjust to the project's real audience data).
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1638400 / 8, uploadThroughput: 675 * 1024 / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    await page.goto(url, { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(400);

    const dom = await page.evaluate(({ lang }) => {
      const out = {};
      const html = document.documentElement;
      out.lang = html.getAttribute('lang'); out.dir = html.getAttribute('dir');
      out.title = document.title; out.description = document.querySelector('meta[name="description"]')?.content ?? '';
      out.canonical = !!document.querySelector('link[rel="canonical"]');
      out.viewportMeta = document.querySelector('meta[name="viewport"]')?.content ?? '';
      const sel = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : '');
      // Persian text styling
      const letter = new Set(), italic = new Set();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!/[؀-ۿ]/.test(n.textContent) || !n.textContent.trim()) continue;
        const p = n.parentElement; if (!p || ['SCRIPT', 'STYLE'].includes(p.tagName)) continue;
        const cs = getComputedStyle(p);
        if (cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing) !== 0) letter.add(sel(p));
        if (cs.fontStyle === 'italic' || cs.fontStyle.startsWith('oblique')) italic.add(sel(p));
      }
      out.letter = [...letter].slice(0, 5); out.italic = [...italic].slice(0, 5);
      const text = document.body.innerText;
      out.textLength = text.trim().length;
      out.latinPunct = [...text.matchAll(/[؀-ۿ]\s*[?,;]/g)].length;
      const attrs = [...document.querySelectorAll('a[href],link[href],meta[content],img[src]')].map((e) => e.getAttribute('href') ?? e.getAttribute('content') ?? e.getAttribute('src')).join(' ');
      out.placeholderHit = (text + ' ' + attrs).match(/lorem ipsum|example\.(com|org|net|invalid)|0912\s*0{3}|\bTODO\b|\bplaceholder\b/i)?.[0] ?? null;
      // headings
      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
      out.h1 = hs.filter((h) => h.tagName === 'H1').length;
      out.skips = []; let prev = 0;
      for (const h of hs) { const l = Number(h.tagName[1]); if (prev && l > prev + 1) out.skips.push(`${h.tagName} after H${prev}`); prev = l; }
      // images
      out.imgNoDims = [...document.images].filter((i) => !(i.getAttribute('width') && i.getAttribute('height')) && !getComputedStyle(i).aspectRatio.match(/\d/)).map(sel).slice(0, 5);
      out.imgNoAlt = [...document.images].filter((i) => !i.hasAttribute('alt')).map(sel).slice(0, 5);
      // form controls
      out.unlabeled = [...document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=reset]), select, textarea')]
        .filter((e) => !(e.labels && e.labels.length) && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby') && !e.getAttribute('title')).map(sel).slice(0, 5);
      // fonts
      out.fontFamily = getComputedStyle(document.body).fontFamily;
      out.fontsLoaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`);
      out.cls = window.__cls; out.lcp = window.__lcp;
      return out;
    }, { lang });

    // PA-001/002
    if (!dom.lang) add('PA-001', 'error', '<html> has no lang attribute');
    else if (lang && !dom.lang.toLowerCase().startsWith(lang)) add('PA-001', 'error', `<html lang="${dom.lang}"> but expected "${lang}"`);
    if (lang === 'fa' && dom.dir !== 'rtl') add('PA-002', 'error', dom.dir ? `<html dir="${dom.dir}"> must be "rtl" for Persian pages` : '<html> has no dir attribute; Persian pages need dir="rtl"');

    // PA-003 / PA-004 per viewport
    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(120);
      const r = await page.evaluate(() => {
        const root = document.documentElement, cw = root.clientWidth;
        const sel = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + (el.classList.length ? `.${[...el.classList].slice(0, 2).join('.')}` : '');
        const offenders = [...document.body.querySelectorAll('*')].filter((el) => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && cs.position !== 'fixed' && (b.right > cw + 1 || b.left < -1); }).map(sel).slice(0, 5);
        const overflow = root.scrollWidth > cw + 1;
        const small = [], medium = [];
        for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button]')) {
          const cs = getComputedStyle(el); const b = el.getBoundingClientRect();
          if (b.width === 0 || b.height === 0 || cs.visibility === 'hidden' || cs.display === 'none') continue;
          if (el.tagName === 'A' && cs.display === 'inline') continue; // inline links in text are exempt (WCAG 2.5.8)
          if (el.tagName === 'INPUT' && /^(checkbox|radio)$/.test(el.type) && cs.appearance === 'auto') continue; // user-agent sized controls are exempt
          if (b.width < 24 || b.height < 24) small.push(`${sel(el)} ${Math.round(b.width)}x${Math.round(b.height)}`);
          else if (b.width < 44 || b.height < 44) medium.push(sel(el));
        }
        return { overflow, offenders, small: small.slice(0, 5), mediumCount: medium.length };
      });
      if (r.overflow) add('PA-003', 'error', `horizontal overflow at ${width}px`, r.offenders.join(', '));
      if (r.small.length) add('PA-004', 'error', `touch targets under 24x24 CSS px at ${width}px`, r.small.join('; '));
      else if (r.mediumCount && width === viewports[0]) add('PA-004', 'info', `${r.mediumCount} target(s) between 24 and 44 px at ${width}px (44 px recommended)`);
    }

    if (dom.imgNoDims.length) add('PA-005', 'warn', 'images without width/height or aspect-ratio (CLS risk)', dom.imgNoDims.join(', '));
    if (dom.imgNoAlt.length) add('PA-005', 'error', 'images without alt attribute', dom.imgNoAlt.join(', '));
    if (foreign.size) add('PA-006', allowForeign ? 'warn' : 'warn', `foreign hosts requested: ${[...foreign].join(', ')}`, 'Critical flows must not depend on them (I-2); self-host or defer');
    if (!allowForeign && (dom.textLength < 20 || pageErrors.length)) add('PA-007', 'error', 'page is empty, or an uncaught error occurred, while foreign hosts were blocked (a blocked script may be the cause)', pageErrors.slice(0, 3).join(' | '));
    if (dom.letter.length) add('PA-008', 'error', 'non-zero letter-spacing on Persian text', dom.letter.join(', '));
    if (dom.italic.length) add('PA-009', 'warn', 'italic/oblique on Persian text', dom.italic.join(', '));
    if (dom.latinPunct) add('PA-010', 'warn', `${dom.latinPunct} Latin punctuation mark(s) (? , ;) right after Persian letters; use ؟ ، ؛`);
    if (dom.placeholderHit && !allowPlaceholders) add('PA-011', 'error', `placeholder-like content found: "${dom.placeholderHit}"`);
    if (dom.h1 !== 1) add('PA-012', 'warn', `expected exactly one h1, found ${dom.h1}`);
    if (dom.skips.length) add('PA-012', 'warn', 'heading levels skipped', dom.skips.join(', '));
    if (dom.unlabeled.length) add('PA-013', 'error', 'form controls without an accessible name', dom.unlabeled.join(', '));
    if (!dom.title.trim()) add('PA-014', 'error', 'missing <title>');
    if (!dom.description.trim()) add('PA-014', 'warn', 'missing meta description');
    if (!dom.canonical) add('PA-014', 'warn', 'missing canonical link');
    add('PA-015', 'info', `body font-family: ${dom.fontFamily}; loaded faces: ${dom.fontsLoaded.join(', ') || 'none (fallback fonts in use: check rendering with the web font blocked)'}`);
    add('PA-016', dom.cls > 0.1 || dom.lcp > 2500 ? 'warn' : 'info', `lab LCP ${Math.round(dom.lcp)} ms, CLS ${dom.cls.toFixed(3)}${throttle ? ' (throttled)' : ' (unthrottled)'}; field data decides (E-001)`);
    if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(dom.viewportMeta)) add('PA-017', 'error', `viewport meta blocks zoom: "${dom.viewportMeta}"`);
    if (consoleErrors.length || pageErrors.length) add('PA-018', 'error', `${consoleErrors.length} console error(s), ${pageErrors.length} uncaught error(s)`, [...consoleErrors, ...pageErrors].slice(0, 3).join(' | '));
  } finally {
    await browser.close();
  }
  return findings;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const target = args.find((a) => !a.startsWith('--'));
  const flag = (n) => args.includes(`--${n}`);
  const val = (n) => args.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
  if (!target) { console.error('Usage: node page-audit.mjs <url|file.html> [--viewports=320,360,768] [--allow-foreign] [--allow-placeholders] [--throttle] [--lang=fa] [--json]'); process.exit(2); }
  try {
    const findings = await runAudit(target, {
      viewports: val('viewports')?.split(',').map(Number), allowForeign: flag('allow-foreign'), allowPlaceholders: flag('allow-placeholders'),
      throttle: flag('throttle'), lang: val('lang') ?? 'fa',
    });
    if (flag('json')) console.log(JSON.stringify(findings, null, 2));
    else {
      for (const f of findings) console.log(`${f.severity.toUpperCase().padEnd(5)} ${f.id}  ${f.msg}${f.detail ? `\n         -> ${f.detail}` : ''}`);
      const n = (s) => findings.filter((f) => f.severity === s).length;
      console.log(`\n${n('error')} error, ${n('warn')} warn, ${n('info')} info  (mode: ${flag('allow-foreign') ? 'foreign hosts allowed' : 'foreign hosts BLOCKED'})`);
    }
    process.exit(findings.some((f) => f.severity === 'error') ? 1 : 0);
  } catch (e) { console.error(e.message); process.exit(2); }
}
