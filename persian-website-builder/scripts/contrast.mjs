#!/usr/bin/env node
// WCAG 2.x contrast ratio. Usage: node contrast.mjs <fg> <bg>   e.g. node contrast.mjs "#767676" "#fff"
// Thresholds (WCAG 2.2, E-002): normal text 4.5:1, large text 3:1, UI components & focus indicators 3:1.
// Large text = >= 24 CSS px, or >= ~18.66 CSS px and bold.
import { pathToFileURL } from 'node:url';

export function parseColor(input) {
  let h = String(input).trim().replace(/^#/, '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) throw new Error(`Unsupported color "${input}" (use #rgb or #rrggbb; no alpha: flatten it first)`);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function relativeLuminance([r, g, b]) {
  const lin = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(fg, bg) {
  const [a, b] = [relativeLuminance(parseColor(fg)), relativeLuminance(parseColor(bg))];
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

export function verdict(ratio) {
  return { text_AA: ratio >= 4.5, largeText_AA: ratio >= 3, ui_AA: ratio >= 3, text_AAA: ratio >= 7 };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [fg, bg] = process.argv.slice(2);
  if (!fg || !bg) {
    console.error('Usage: node contrast.mjs <fg> <bg>');
    process.exit(2);
  }
  const ratio = contrastRatio(fg, bg);
  console.log(`${ratio.toFixed(2)}:1`, JSON.stringify(verdict(ratio)));
  process.exit(verdict(ratio).text_AA ? 0 : 1);
}
