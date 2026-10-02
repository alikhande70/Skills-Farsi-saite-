// Bookable days: the next N days after today in Asia/Tehran, Friday excluded (weekend per ICU, E-014; a real clinic
// would make this configuration, see LIMITATIONS.md). Values are Gregorian ISO dates (stored form); labels are Jalali.
const tehranParts = (ms) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', { timeZone: 'Asia/Tehran', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms)).filter((x) => x.type !== 'literal').map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
};
const labelFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

export function availableDays(nowMs, { count = 10 } = {}) {
  const t = tehranParts(nowMs);
  const days = [];
  for (let i = 1; days.length < count && i < count * 3; i += 1) {
    const noon = new Date(Date.UTC(t.y, t.m - 1, t.d + i, 12)); // noon UTC avoids any day-boundary ambiguity
    if (noon.getUTCDay() === 5) continue; // Friday
    days.push({ value: noon.toISOString().slice(0, 10), label: labelFmt.format(noon) });
  }
  return days;
}

export const isAllowedDay = (value, nowMs) => availableDays(nowMs).some((d) => d.value === value);
