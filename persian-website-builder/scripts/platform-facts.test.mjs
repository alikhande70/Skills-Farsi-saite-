// Guards the runtime-behaviour claims in references/evidence-register.md (E-010..E-014, E-016, E-017).
// If one fails after a Node/ICU/tzdata upgrade, the platform changed: re-verify the claim and update the
// register (and the guidance that cites it); do not just edit the test. Skipped when the runtime lacks 'fa' data.
import test from 'node:test';
import assert from 'node:assert/strict';

const hasFa = Intl.DateTimeFormat.supportedLocalesOf(['fa-IR']).length > 0 && new Intl.DateTimeFormat('fa-IR').resolvedOptions().calendar === 'persian';
const opts = { skip: hasFa ? false : 'runtime has no full Persian ICU data' };

test('E-010: fa-IR defaults to the Persian calendar and Extended Arabic-Indic digits', opts, () => {
  const r = new Intl.DateTimeFormat('fa-IR').resolvedOptions();
  assert.equal(r.calendar, 'persian');
  assert.equal(r.numberingSystem, 'arabext');
  const d = new Date('2026-10-01T12:00:00Z');
  assert.equal(new Intl.DateTimeFormat('fa-IR-u-nu-latn', { dateStyle: 'long', timeZone: 'Asia/Tehran' }).format(d), '9 مهر 1405');
});

test('E-012: IRR currency formatting injects an LRM and puts the word first; toman is not an Intl currency', opts, () => {
  const s = new Intl.NumberFormat('fa-IR', { style: 'currency', currency: 'IRR', maximumFractionDigits: 0 }).format(1250000);
  assert.ok(s.includes('‎'), 'expected an LRM');
  assert.ok(s.replace('‎', '').trim().startsWith('ریال'), s);
});

test('E-013: Asia/Tehran DST ended after summer 2022', opts, () => {
  const off = (iso) => new Intl.DateTimeFormat('en', { timeZone: 'Asia/Tehran', timeZoneName: 'longOffset' }).format(new Date(iso)).split(', ')[1];
  for (const y of [2020, 2021, 2022]) assert.equal(off(`${y}-07-15T12:00:00Z`), 'GMT+04:30', `July ${y}`);
  for (const y of [2023, 2024, 2025, 2026]) assert.equal(off(`${y}-07-15T12:00:00Z`), 'GMT+03:30', `July ${y}`);
});

test('E-014: ICU Persian leap years 1380-1450 follow the 33-year rule; boundaries; week info', opts, () => {
  const fmt = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric' });
  // formatToParts: the plain string carries an " AP" era suffix that breaks Number()
  const parts = (d) => {
    const p = Object.fromEntries(fmt.formatToParts(d).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
    return [Number(p.month), Number(p.day), Number(p.relatedYear ?? p.year)]; // [month, day, year]
  };
  const isLeap = (y) => {
    for (let day = 18; day <= 24; day++) {
      const dt = new Date(Date.UTC(y + 1 + 621, 2, day, 12));
      const [m, d] = parts(dt);
      if (m === 1 && d === 1) return parts(new Date(dt.getTime() - 86400000))[1] === 30;
    }
    throw new Error(`no Nowruz found for ${y + 1}`);
  };
  const rule33 = (y) => [1, 5, 9, 13, 17, 22, 26, 30].includes(y % 33);
  for (let y = 1380; y <= 1450; y++) assert.equal(isLeap(y), rule33(y), `year ${y}`);
  assert.deepEqual(parts(new Date('2025-03-20T12:00:00Z')), [12, 30, 1403]);
  assert.deepEqual(parts(new Date('2026-03-21T12:00:00Z')), [1, 1, 1405]);
  const w = new Intl.Locale('fa-IR').getWeekInfo?.() ?? new Intl.Locale('fa-IR').weekInfo;
  assert.equal(w.firstDay, 6);
  assert.deepEqual([...w.weekend], [5]);
});

test('E-016/E-017: Persian plural categories and list formatting quirks', opts, () => {
  const pr = new Intl.PluralRules('fa');
  assert.deepEqual(pr.resolvedOptions().pluralCategories.sort(), ['one', 'other']);
  assert.equal(pr.select(0), 'one');
  assert.equal(pr.select(1), 'one');
  assert.equal(pr.select(2), 'other');
  const list = new Intl.ListFormat('fa', { type: 'conjunction' }).format(['سیب', 'پرتقال', 'موز']);
  assert.ok(list.includes('، و '), `expected a comma before «و»: ${list}`);
});
