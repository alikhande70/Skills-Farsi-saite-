# Persian UX module

Persian correctness is **functional**, not cosmetic: a wrong digit, a flipped parenthesis, a name rejected because it contains ک/ك or an Azeri/Kurdish letter, or a search that cannot find "کتاب‌ها" for "کتاب" loses users and money. Every rule below has a test or a visible check (see §10).
Tools: `scripts/persian-utils.mjs` (tested helpers), `scripts/rtl-smells.mjs` (static scan).

## 1. Direction and layout

- Document: `<html lang="fa" dir="rtl">`. Use the **attribute** `dir` (HTML semantics) rather than only CSS `direction` (BEST PRACTICE, W3C i18n guidance; not re-fetched this run).
- LTR islands: `dir="ltr"` on email/URL/phone/OTP/IBAN/card/code fields and technical strings. User-generated text of unknown direction: `dir="auto"`. Names/usernames inside sentences: `<bdi>`.
- **Write logical CSS from the first line**, not as a later patch (E-005: verify support against the project's browser matrix):

| Physical (avoid) | Logical (use) |
|---|---|
| `margin-left/right`, `padding-left/right` | `margin-inline-start/end`, `padding-inline-start/end` (shorthands `margin-inline`, `padding-block`) |
| `left/right` offsets | `inset-inline-start/end` (shorthand `inset-inline`) |
| `text-align: left/right` | `text-align: start/end` |
| `float: left/right` | `float: inline-start/inline-end` |
| `border-left`, `border-top-left-radius` | `border-inline-start`, `border-start-start-radius` |
| width/height when axis matters | `inline-size` / `block-size` |
| Tailwind `ml-4 pr-2 text-left rounded-l` | `ms-4 pe-2 text-start rounded-s` |

- Flex/grid follow direction automatically. Do **not** use `flex-direction: row-reverse` to fake RTL.
- **Mirror** (they carry direction): back/next arrows, chevrons, breadcrumb separators, pagination arrows, steppers/progress bars, drawers/side sheets (enter from the inline-start/end that matches the menu), "reply/forward" icons, text-indent, list-marker side, toast stack corner (use inline-end), table first column, carousels and swipe direction, `<input type=range>` (browsers flip it).
- **Do not mirror**: media play/pause/skip glyphs, clocks, checkmarks, logos/brand marks, phone/handset icons, charts' *numeric value axis*, code blocks, Latin strings, QR codes.
- **Charts / time axes in RTL**: unresolved (EXPERIMENTAL; see `meta/OPEN-QUESTIONS.md`). Default: choose one direction per product, label axes explicitly, test with 5 target users, apply consistently.
- Horizontal motion (`translateX`, slide-in) must be direction-aware. `rtl-smells.mjs` flags `translateX`/`scaleX` for manual review.

### Bidi behaviour (reproduced in a real browser engine; evidence E-018)
Fixture: `scripts/fixtures/bidi-hazards.html`; tool: `node scripts/bidi-order.mjs <file> [selector]` prints the *visual* character order. The test `scripts/bidi-order.test.mjs` fails if a browser upgrade changes any of this: re-verify instead of silencing it.

| Case in plain RTL text | What actually renders | Do this |
|---|---|---|
| Phone/ID with spaces, dashes or `+` ("+98 912 345 6789", "0912 345 6789") | Digit **groups appear in reverse visual order** and the `+` is stranded after the digits ("98+") | `<bdi dir="ltr">…</bdi>` (verified: renders "+98 912 345 6789") |
| Negative number typed with ASCII `-` or U+2212 ("-۵۰۰") | The minus lands **right of** the digits ("۵۰۰-") | Format with `Intl.NumberFormat('fa')` (emits LRM + U+2212, verified), or wrap in `<bdi>` |
| Percent ("۲۰٪", "20%") | Sign renders **left of** the digits by default; inside `<bdi>` it renders right of them | Pick one style for the whole site; in running text prefer the word «درصد» |
| User-generated text that may start with Latin | `dir="auto"` gives the right block direction (verified) | Use `dir="auto"` on user content containers |
| Sentence-final punctuation after a trailing English phrase; mirrored parentheses around Latin | **Not a problem in the simple case tested**: they land at the correct end of the RTL line | Keep testing real strings (`bidi-order.mjs`); do not add isolation "just in case" |

Other bidi risks to **test rather than assume** (not yet reproduced here): price + unit inside flex/table cells (`white-space: nowrap`, one text node), mixed Persian/Latin heading truncation (EC-065), inline code/URLs, and Safari/Firefox differences (the experiment ran in Chromium only).

## 2. Typography

- **Font choice** (RECOMMENDATION): choose by (1) license that permits your use [E-015: always read the license file shipped with the font; do not trust a font's "free" label], (2) full Persian coverage incl. ZWNJ, ک گ پ چ ژ ی, Persian digits and punctuation, (3) true weights (no faux bold), (4) file size. Vazirmatn (OFL, variable) is a valid default candidate; it also ships UI and Farsi-digit variants [E-015].
- **Self-host** WOFF2 (principle I-2). Subset only after verifying coverage: Arabic block + Persian additions + Latin + digits + punctuation + U+200C/200D/200E/200F. A subset that drops ZWNJ silently glues words.
- Loading: preload only the one or two files used above the fold; `font-display: swap` or `optional`; define a size-adjusted fallback to limit CLS (verify against E-001 in lab and field).
- Stack must end with fonts that cover Arabic script on every OS you support (`system-ui`, Tahoma on Windows, etc.); view the page **with the web font blocked** on Windows, Android, iOS.
- Body text ≥ 16px; never < 14px for Persian copy (RECOMMENDATION). Line-height for body paragraphs typically 1.7–2.0, headings 1.3–1.6 (EXPERIMENTAL range: confirm with three lines of real dense text in the chosen font; Persian ascenders, dots and hamzas collide at tight leading).
- **Never** `letter-spacing` on Persian text (breaks joining; RTL008). No italic/oblique for Persian (RTL009). No `text-transform`. `hyphens: none`. Avoid `text-align: justify` in narrow columns; if used, test for rivers and long unbreakable tokens. `overflow-wrap: anywhere` for URLs/ids in narrow containers.
- Number alignment in tables: check `font-variant-numeric: tabular-nums` in the chosen font with Persian digits; if unsupported use a monospaced digit approach or right-align (`text-align: end`) with fixed decimals.
- Persian punctuation: « » ، ؛ ؟ … not `" , ; ?`. A copy lint: Persian letter immediately followed by `?`, `,` or `;` is almost always wrong.
- ZWNJ (نیم‌فاصله, U+200C) per standard orthography: می‌خواهم, نمی‌دانم, کتاب‌ها, خانه‌ای, بی‌نظیر. Authority for orthography: the Academy of Persian Language and Literature's «دستور خط فارسی» (BEST PRACTICE; not re-fetched; check the current edition when writing style rules). Users type it inconsistently: on Windows, Shift+Space commonly produces it; on phones it is often skipped. **Inputs, search and slugs must tolerate both.**

## 3. Digits and numbers

- **Storage Latin; input accepts all three digit scripts; display chosen per context.** Normalize on the client for UX and again on the server for truth (`toLatinDigits`, `normalizePersian`) [E-011].
- Display policy (RECOMMENDATION; record it in the design tokens/content guide so all pages match):

| Context | Default |
|---|---|
| Prose, prices, counts, dates in UI | Persian digits via `Intl` `fa-IR` (arabext by default, E-010) |
| OTP/verification code boxes | Latin digits, `inputmode="numeric"`, `autocomplete="one-time-code"` (SMS autofill expects the digits in the message) |
| Phone, card, Sheba, national ID, tracking codes | Accept any script; display in an LTR isolate; same script as the surrounding context unless users copy them to other apps (ask) |
| URLs, metadata, structured data, API payloads | Latin always |

- Do not fake Persian digits with CSS or fonts unless you accept that copy/search/screen-reader behaviour follows the underlying characters. Decide once.
- Separators: accept `,` `٬` `،` as thousands separators and `.` `٫` as decimal point when parsing user input; emit one style consistently. Percent: `%` and `٪` are both seen.
- Money: integer storage and a single `formatMoney` call site; `Intl` currency output for IRR injects an LRM and puts the word first [E-012]; "تومان" has no ISO code. Redenomination caveat: see `iran-context.md` I-3 [E-024].

## 4. Dates and time

- Store **UTC ISO-8601** (Gregorian). Display Jalali with `Intl` (`fa-IR`, or `en-u-ca-persian` for Latin text) [E-010]. For arithmetic in the Jalali calendar ("same day next month", month starts, 30 Esfand) use a tested library or `Intl`-backed logic; select it by: maintained, tests on leap years (30 Esfand 1403 exists; 1404 is not leap [E-014]), Nowruz boundary (2026-03-21 = 1 Farvardin 1405), small bundle, no hidden timezone bugs. Record the choice in an ADR with the date.
- ICU follows the 33-year arithmetic rule for 1380–1450; agreement with the official astronomical calendar is not verified [E-014]: for legal/financial due dates ask the client which calendar is authoritative and test the years that matter.
- Time zone: IANA `Asia/Tehran`; **no DST from 2023 on** (+03:30 now; +04:30 in summers up to 2022) [E-013]. Never hardcode an offset; keep tz data updated; old timestamps need the historical rules.
- Week starts **Saturday**, Friday is the weekend per ICU [E-014]. Business rules (Thursday, holidays) are client-specific: make them configuration. Religious holidays follow the lunar calendar and move across the Jalali year: load from a maintained source and review yearly.
- Date input: type-in with digit normalization, 4-digit year required (two-digit years are ambiguous between calendars), accept `/`, `-`, `.`. Heuristic for an adult-facing date field (RECOMMENDATION): year 1300–1500 → Jalali, 1900–2100 → Gregorian; state the expected format in the label anyway.
- Date picker: Jalali month names (فروردین … اسفند), Saturday-first grid, RTL, full keyboard support (see `accessibility.md`), do not rely on `<input type="date">` rendering Jalali.
- Relative time: `Intl.RelativeTimeFormat('fa', {numeric:'auto'})` ("دیروز") [verified output].

## 5. Forms and identity data

| Field | Rules |
|---|---|
| Mobile | `type="tel" inputmode="tel" autocomplete="tel" dir="ltr"`; normalize with `normalizeIranMobile` (09…, +98…, 0098…, Persian digits, separators); format-check only [E-028] |
| National code | **String**, never number (leading zeros); `isValidNationalCode` (checksum + reject all-same digits); `inputmode="numeric"`; ask only if needed |
| Postal code | 10 digits (`isValidPostalCodeFormat`); do not reject on unverified deeper rules |
| Sheba / card | `isValidSheba`, `isValidCardNumber` only for refund/payout flows; never log; mask on display |
| Name | Allow `\p{L}\p{M}`, space, ZWNJ, hyphen, apostrophe. **Do not restrict to Persian letters**: users write Latin, Kurdish (ڕ ۆ ێ ە), Azeri and other names. Normalize ی/ک for matching, but store what the user typed (display) plus the normalized key |
| Email | Light check (contains `@`, no spaces), then verify by sending. Do not write a strict regex; keep `dir="ltr"` |
| Address | Province → city (stable IDs) → free-text address → postal code → recipient + mobile; allow free-text city fallback |
| Password | Allow Persian characters/spaces; do not trim silently; `dir="ltr"` input |

- Errors: say what is wrong **and how to fix it**, next to the field, in natural Persian (see `ux-content.md`). Do not clear the field. Keep the user's typed digit script visible while normalizing underneath.

## 6. Search (site search)

Pipeline at **index and query time**: `normalizePersian` → lowercase Latin → remove ZWNJ for the match key (`searchKey`) → tokenize.
Known limits and what to do:
- `searchKey('می خواهم')` ≠ `searchKey('میخواهم')` (space vs ZWNJ): index both forms or use an engine analyzer; **test, don't assume**.
- Inflection/clitics: «کتاب‌ها», «کتابم», «کتابش» vs «کتاب». Use a Persian-aware analyzer or prefix matching in the chosen engine. Verify the engine's Persian support in its current docs before committing (record the date).
- Synonyms/variants as data: موبایل / گوشی / تلفن همراه; لپ‌تاپ / لپتاپ / لپ تاپ. Maintain a small synonyms list from real queries.
- "Wrong keyboard layout" and Finglish queries (Persian typed in Latin letters or on an English layout) are plausible in Persian search logs: EXPERIMENTAL. Measure frequency in the site's own query logs before building anything.
- Sorting: `Intl.Collator('fa')` gave ا ب پ چ ز ژ ک گ ی (verified, Node 22). In the database use an ICU/Persian collation or sort in the application for small sets; verify the DB's support.
- Acceptance: a query→expected-hits table of ≥ 30 real or realistic queries (typos, ZWNJ variants, digits in 3 scripts, synonyms) is part of the test plan.

## 7. Non-HTML outputs (the quiet failures)

| Output | Risk | Check |
|---|---|---|
| Email | Clients render RTL inconsistently | Test in the target clients; set `dir="rtl"` and `lang="fa"` on the container and on table cells; embed nothing from foreign hosts |
| PDF (invoices, receipts) | Many generators fail Arabic-script shaping and RTL order | Generate a real invoice with mixed text, numbers, prices; inspect visually; embed a licensed font |
| Images/OG cards drawn on canvas/server | Missing shaping, wrong direction | Render real titles; check joined letters |
| SMS | Persian needs UCS-2: shorter segments than Latin (BEST PRACTICE, 3GPP; not re-fetched) → cost and truncation | Keep OTP messages short; check the provider's segment pricing |
| CSV/Excel export | Excel may garble UTF-8 without a BOM; digits scripts | Test opening in Excel; decide digit script for exports (Latin recommended) |
| Print CSS | Direction and margins | Print preview of key documents |

## 8. Persian ≠ only Persian

Users include Kurdish, Azeri, Arabic, Balochi and other speakers who use Persian-language sites: do not hard-fail on non-Persian letters in names/addresses; do not assume a Persian-only keyboard; Latin text and numbers will appear in user input.

## 9. Content direction in the design system

Add to the tokens/content guide: font stack, digit policy table (§3), date format patterns, currency display, mirrored/non-mirrored icon list, quote/punctuation rules, ZWNJ rules, error/empty-state phrase patterns. A page that deviates is a defect.

## 10. Persian correctness gate (G-FA): must pass before UI is called done

1. `<html lang="fa" dir="rtl">`; every LTR field has `dir="ltr"`. (`rtl-smells`: RTL011/012)
2. No physical CSS left except `rtl-ignore` with a reason. (RTL001–RTL007)
3. No `letter-spacing` on Persian text; no italic Persian; no faux bold.
4. Digits: typing ۱۲۳, ١٢٣ and 123 into every numeric field yields the same stored value.
5. Phone pasted as `+98 912 345 6789`, `0912-345-6789`, `۰۹۱۲…` all accepted and normalized.
6. National code with leading zero survives round-trip; `1111111111` rejected.
7. A name with ی/ي, ک/ك, ZWNJ, Kurdish letters and a Latin name are accepted and findable.
8. Mixed strings (phone, URL, English brand, negative number, parentheses) render correctly at 360 px width.
9. Money formatted by one function; unit shown; copy/paste into a spreadsheet works.
10. Dates: Jalali display; 30 Esfand 1403, Nowruz boundary, week start Saturday tested; stored value is UTC.
11. Search acceptance table passes (ZWNJ variants, inflected forms, digit scripts).
12. Fallback font rendering checked with the web font blocked.
13. PDFs/emails/SMS/CSV produced by the product checked with real Persian content.
14. All Persian punctuation correct (« » ، ؛ ؟); no machine-translated or cliché copy (see `ux-content.md`).
15. Icons that carry direction are mirrored; those that must not mirror are not.
