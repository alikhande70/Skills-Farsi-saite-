import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toLatinDigits, toPersianDigits, normalizePersian, searchKey,
  isValidNationalCode, normalizeIranMobile, isValidPostalCodeFormat,
  isValidSheba, isValidCardNumber, formatMoney, slugifyFa,
} from './persian-utils.mjs';

test('digits: both Persian and Arabic-Indic map to Latin', () => {
  assert.equal(toLatinDigits('۰۱۲۳۴۵۶۷۸۹'), '0123456789');
  assert.equal(toLatinDigits('٠١٢٣٤٥٦٧٨٩'), '0123456789');
  assert.equal(toPersianDigits('1405/07/09'), '۱۴۰۵/۰۷/۰۹');
});

test('NFKC alone is NOT enough (documents why normalizePersian exists)', () => {
  assert.equal('ي'.normalize('NFKC'), 'ي'); // Arabic yeh survives NFKC
  assert.equal('٣'.normalize('NFKC'), '٣'); // Arabic-Indic digit survives NFKC
});

test('normalizePersian: yeh/kaf/digits/harakat/kashida/ZWNJ', () => {
  assert.equal(normalizePersian('علي'), 'علی');
  assert.equal(normalizePersian('كتاب'), 'کتاب');
  assert.equal(normalizePersian('ســلام'), 'سلام'); // kashida
  assert.equal(normalizePersian('مَکتَب'), 'مکتب'); // harakat
  assert.equal(normalizePersian('سفارش ۱۲٣'), 'سفارش 123');
  assert.equal(normalizePersian('می‌‌خواهم'), 'می‌خواهم'); // repeated ZWNJ
  assert.equal(normalizePersian('‌سلام ‌دنیا‌'), 'سلام دنیا');
  assert.equal(normalizePersian('2024', { digits: 'persian' }), '۲۰۲۴');
});

test('searchKey: ZWNJ variants match; spaced variant is a known limitation', () => {
  assert.equal(searchKey('می‌خواهم'), searchKey('میخواهم'));
  assert.notEqual(searchKey('می خواهم'), searchKey('میخواهم'));
  assert.equal(searchKey('ڪتاب كتاب'.replace('ڪ', 'ک')), 'کتاب کتاب');
});

test('national code: valid, invalid checksum, repeated digits, wrong length, Persian digits', () => {
  assert.equal(isValidNationalCode('1234567891'), true);
  assert.equal(isValidNationalCode('۱۲۳۴۵۶۷۸۹۱'), true);
  assert.equal(isValidNationalCode('1234567890'), false);
  assert.equal(isValidNationalCode('1111111111'), false);
  assert.equal(isValidNationalCode('0000000000'), false);
  assert.equal(isValidNationalCode('123456789'), false);
  assert.equal(isValidNationalCode('12345678912'), false);
  assert.equal(isValidNationalCode(' 1234567891 '), true);
});

test('national code: leading zero must survive (string, not number)', () => {
  // Build a valid code that starts with 0 by brute force over the check digit.
  const base = '001234567';
  const sum = [...base].reduce((a, d, i) => a + Number(d) * (10 - i), 0);
  const r = sum % 11;
  const check = r < 2 ? r : 11 - r;
  const code = `${base}${check}`;
  assert.equal(code.length, 10);
  assert.equal(isValidNationalCode(code), true);
  assert.equal(isValidNationalCode(Number(code)), false, 'a Number loses the leading zero');
});

test('mobile: accepted spellings normalize to the same value', () => {
  const same = ['09123456789', '+989123456789', '00989123456789', '989123456789', '9123456789',
    '۰۹۱۲۳۴۵۶۷۸۹', '0912 345 6789', '(0912) 345-6789', '+98 912 345 6789',
    '+98 0912 345 6789', '9809123456789', '0098 0912 345 6789']; // last three: users keep the leading 0
  for (const input of same) {
    const r = normalizeIranMobile(input);
    assert.equal(r.ok, true, input);
    assert.equal(r.national, '09123456789', input);
    assert.equal(r.e164, '+989123456789', input);
  }
});

test('mobile: rejects landlines, short, long, non-9 prefix, empty', () => {
  for (const bad of ['02112345678', '0912345678', '091234567890', '08123456789', '', 'abc', '+19123456789', '98912345678']) {
    assert.equal(normalizeIranMobile(bad).ok, false, bad);
  }
});

test('postal code: format only', () => {
  assert.equal(isValidPostalCodeFormat('1234567890'), true);
  assert.equal(isValidPostalCodeFormat('۱۲۳۴۵۶۷۸۹۰'), true);
  assert.equal(isValidPostalCodeFormat('123456789'), false);
});

test('sheba: registry-style sample passes, tampering fails, prefix optional, Persian digits ok', () => {
  assert.equal(isValidSheba('IR580540105180021273113007'), true);
  assert.equal(isValidSheba('IR58 0540 1051 8002 1273 1130 07'), true);
  assert.equal(isValidSheba('580540105180021273113007'), true);
  assert.equal(isValidSheba('IR۵۸۰۵۴۰۱۰۵۱۸۰۰۲۱۲۷۳۱۱۳۰۰۷'), true);
  assert.equal(isValidSheba('IR580540105180021273113008'), false);
  assert.equal(isValidSheba('IR58054010518002127311300'), false);
  assert.equal(isValidSheba(''), false);
});

test('card number: Luhn on 16 digits', () => {
  assert.equal(isValidCardNumber('4111111111111111'), true); // public test PAN
  assert.equal(isValidCardNumber('4111 1111 1111 1111'), true);
  assert.equal(isValidCardNumber('۴۱۱۱۱۱۱۱۱۱۱۱۱۱۱۱'), true);
  assert.equal(isValidCardNumber('4111111111111112'), false);
  assert.equal(isValidCardNumber('411111111111111'), false);
});

test('money: rial storage, toman display, digits policy', () => {
  assert.equal(formatMoney(1250000), '۱۲۵٬۰۰۰ تومان');
  assert.equal(formatMoney(1250000, { digits: 'latin' }), '125,000 تومان');
  assert.equal(formatMoney(1250000, { unit: 'rial', digits: 'latin' }), '1,250,000 ریال');
  assert.throws(() => formatMoney(1250005), RangeError); // not whole toman
  assert.throws(() => formatMoney(12.5), RangeError); // floats are not money
  assert.throws(() => formatMoney(2 ** 60), RangeError);
});

test('slug: Persian, mixed, punctuation, digits, ZWNJ', () => {
  assert.equal(slugifyFa('خرید گوشی سامسونگ'), 'خرید-گوشی-سامسونگ');
  assert.equal(slugifyFa('می‌خواهم  بدانم؟'), 'می-خواهم-بدانم');
  assert.equal(slugifyFa('iPhone ۱۵ Pro، قیمت'), 'iphone-15-pro-قیمت');
  assert.equal(slugifyFa('كتاب'), 'کتاب');
  assert.equal(slugifyFa('---'), '');
});
