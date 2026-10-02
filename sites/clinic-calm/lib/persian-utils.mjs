// Persian/Iran input utilities. Zero dependencies, Node >= 18, ESM.
// Purpose: give an agent tested building blocks instead of hand-rolled regexes.
// Every function is a *format/normalization* helper. None of them proves that a
// phone number is active or a national code belongs to a real person.
// Run tests: node --test persian-website-builder/scripts/*.test.mjs

const ARABIC_INDIC_ZERO = 0x0660; // ٠
const PERSIAN_ZERO = 0x06f0; // ۰

/** Convert ۰-۹ and ٠-٩ to 0-9. */
export function toLatinDigits(input) {
  return String(input).replace(/[۰-۹٠-٩]/g, (ch) => {
    const cp = ch.codePointAt(0);
    return String(cp >= PERSIAN_ZERO ? cp - PERSIAN_ZERO : cp - ARABIC_INDIC_ZERO);
  });
}

/** Convert 0-9 to ۰-۹ (Persian digits, U+06F0..U+06F9). */
export function toPersianDigits(input) {
  return String(input).replace(/[0-9]/g, (d) => String.fromCodePoint(PERSIAN_ZERO + Number(d)));
}

/**
 * Normalize Persian text for STORAGE / COMPARISON (not for display of user content).
 * NFKC alone does NOT do this: it leaves Arabic yeh/kaf and Arabic-Indic digits unchanged
 * (verified with Node 22, see references/evidence-register.md E-011).
 *
 * options.digits: 'latin' (default) | 'persian' | 'keep'
 */
export function normalizePersian(input, { digits = 'latin' } = {}) {
  let s = String(input).normalize('NFC');
  s = s
    .replace(/[يى]/g, 'ی') // ي ى -> ی
    .replace(/ك/g, 'ک') //          ك   -> ک
    .replace(/[ً-ٰٟ]/g, '') // harakat / tashkeel
    .replace(/ـ/g, '') //                 kashida (tatweel)
    .replace(/‌{2,}/g, '‌') //       repeated ZWNJ
    .replace(/‌(?=\s)|(?<=\s)‌/g, '') // ZWNJ next to whitespace is meaningless
    .replace(/^‌+|‌+$/g, ''); //     leading/trailing ZWNJ
  if (digits === 'latin') s = toLatinDigits(s);
  else if (digits === 'persian') s = toPersianDigits(toLatinDigits(s));
  return s.trim();
}

/**
 * Heuristic search key: normalize, lowercase Latin, drop ZWNJ so "می‌خواهم" matches "میخواهم",
 * collapse whitespace. Limitation: does NOT make "می خواهم" (space) equal "میخواهم".
 * Test with real queries before trusting it (references/persian-ux.md, section Search).
 */
export function searchKey(input) {
  return normalizePersian(input).toLowerCase().replace(/‌/g, '').replace(/\s+/g, ' ').trim();
}

/** Iranian national code (کد ملی): 10 digits, string input only (leading zeros!). */
export function isValidNationalCode(input) {
  const code = toLatinDigits(String(input)).trim();
  if (!/^\d{10}$/.test(code)) return false;
  if (/^(\d)\1{9}$/.test(code)) return false; // 1111111111 etc. pass the checksum but are invalid
  const d = [...code].map(Number);
  const sum = d.slice(0, 9).reduce((acc, digit, i) => acc + digit * (10 - i), 0);
  const r = sum % 11;
  return r < 2 ? d[9] === r : d[9] === 11 - r;
}

/**
 * Normalize an Iranian mobile number from user-typed input.
 * Accepts: 0912..., +98912..., 0098912..., 98912..., 912..., any digit script, spaces/dashes/parentheses.
 * Returns { ok, national: '0912xxxxxxx', e164: '+98912xxxxxxx' } or { ok:false, reason }.
 * Checks FORMAT ONLY (09 + 9 digits). Operator prefix ranges change; do not hardcode them.
 */
export function normalizeIranMobile(input) {
  let s = toLatinDigits(String(input)).replace(/[\s\-().‌‎‏]/g, '');
  if (s.startsWith('+98')) s = s.slice(3);
  else if (s.startsWith('0098')) s = s.slice(4);
  else if (s.startsWith('98') && (s.length === 12 || s.length === 13)) s = s.slice(2);
  if (s.length === 11 && s.startsWith('0')) s = s.slice(1); // 0912..., and the common "+98 0912..." slip
  if (!/^9\d{9}$/.test(s)) return { ok: false, reason: 'format' };
  return { ok: true, national: `0${s}`, e164: `+98${s}` };
}

/** Format-only check: exactly 10 digits. Deeper postal-code rules are unverified (see OPEN-QUESTIONS). */
export function isValidPostalCodeFormat(input) {
  return /^\d{10}$/.test(toLatinDigits(String(input)).trim());
}

/**
 * Sheba (شبا, Iranian IBAN): "IR" + 24 digits, ISO 13616 mod-97 check.
 * Format/checksum only: says nothing about whether the account exists or who owns it.
 */
export function isValidSheba(input) {
  const s = toLatinDigits(String(input)).replace(/[\s\-‌]/g, '').toUpperCase();
  const body = s.startsWith('IR') ? s : `IR${s}`; // many users omit the "IR" prefix
  if (!/^IR\d{24}$/.test(body)) return false;
  const rearranged = body.slice(4) + body.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const digits = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55); // A=10 ... Z=35
    for (const dg of digits) remainder = (remainder * 10 + Number(dg)) % 97;
  }
  return remainder === 1;
}

/**
 * Bank card number: 16 digits + Luhn. Checksum only. Never store or log a full card number
 * unless a payment-compliance review says you must (see references/security.md).
 */
export function isValidCardNumber(input) {
  const s = toLatinDigits(String(input)).replace(/[\s\-‌]/g, '');
  if (!/^\d{16}$/.test(s)) return false;
  let sum = 0;
  [...s].reverse().forEach((ch, i) => {
    let d = Number(ch);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  });
  return sum % 10 === 0;
}

/**
 * Format money. Store and compute in integer RIAL; convert only for display.
 * "Toman" is not an ISO 4217 currency, so Intl cannot format it: we append the word ourselves.
 * Intl's IRR output injects an invisible LRM and puts "ریال" first (verified, E-012), so we avoid it.
 */
export function formatMoney(amountRial, { unit = 'toman', digits = 'persian' } = {}) {
  if (!Number.isSafeInteger(amountRial)) throw new RangeError('amountRial must be a safe integer (store money as integer rial)');
  let value = amountRial;
  let label = 'ریال';
  if (unit === 'toman') {
    if (amountRial % 10 !== 0) throw new RangeError('rial amount is not a whole number of toman; display in rial instead');
    value = amountRial / 10;
    label = 'تومان';
  }
  const locale = digits === 'persian' ? 'fa-IR' : 'fa-IR-u-nu-latn';
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value)} ${label}`;
}

/**
 * Slug for Persian titles. Keeps Persian + Latin letters and digits, joins with '-'.
 * Whether to use Persian slugs at all is a decision (references/seo.md, Decision S-1).
 */
export function slugifyFa(input, { maxLength = 80 } = {}) {
  const s = normalizePersian(input)
    .toLowerCase()
    .replace(/[‌\s_]+/g, '-')
    .replace(/[^\p{Script=Arabic}a-z0-9-]/gu, '')
    .replace(/[،؛؟٪-٭]/g, '') // Arabic punctuation
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s.slice(0, maxLength).replace(/-$/, '');
}
