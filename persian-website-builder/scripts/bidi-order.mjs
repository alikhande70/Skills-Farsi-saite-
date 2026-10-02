#!/usr/bin/env node
// Prints, for every element matching a selector, the LOGICAL text and the VISUAL left-to-right order
// of its characters as the real browser engine lays them out. Use it to verify mixed Persian/Latin/number
// strings objectively (G-FA item 8) instead of eyeballing screenshots.
// Note: Persian letters appear reversed in the visual string because it is listed left to right; look at
// digits, signs and punctuation placement.
// Usage: node bidi-order.mjs <file.html|url> [selector=.row] [--json]
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function visualOrder(target, selector = '.row', { width = 360 } = {}) {
  const url = /^(https?|file):/i.test(target) ? target : pathToFileURL(resolve(target)).href;
  const { chromium } = createRequire(import.meta.url)('playwright');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    await page.goto(url, { waitUntil: 'load' });
    return await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((el) => {
      const chars = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        for (let i = 0; i < n.length; i++) {
          const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 1);
          const rect = r.getClientRects()[0]; if (!rect) continue;
          chars.push({ c: n.data[i], x: rect.left, y: Math.round(rect.top) });
        }
      }
      const lines = {};
      for (const ch of chars) (lines[ch.y] ??= []).push(ch);
      const visualLTR = Object.keys(lines).sort((a, b) => a - b).map((y) => lines[y].sort((a, b) => a.x - b.x).map((c) => c.c).join('').replace(/\s+/g, ' ').trim());
      return { id: el.dataset.case ?? el.id ?? '', logical: chars.map((c) => c.c).join('').replace(/\s+/g, ' ').trim(), visualLTR };
    }), selector);
  } finally { await browser.close(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (!args[0]) { console.error('Usage: node bidi-order.mjs <file.html|url> [selector=.row] [--json]'); process.exit(2); }
  const rows = await visualOrder(args[0], args[1] ?? '.row');
  if (process.argv.includes('--json')) console.log(JSON.stringify(rows, null, 2));
  else for (const r of rows) console.log(`${r.id}\n   logical   : ${r.logical}\n   visual L→R: ${r.visualLTR.join('  ⏎  ')}`);
}
