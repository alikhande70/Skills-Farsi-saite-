# Scenario: fictional clinic, Luxury/Calm

**Status: development scenario (seen by the Builder). It is NOT an independent holdout.** The Builder wrote this text after reading the plan and built the site against it (`sites/clinic-calm`, pilot P0). Evaluation in stage 4 needs a different scenario that the Builder has never seen (`meta/ROADMAP.md`).

All people, places, numbers and prices are fictional. Do not replace them with real data in tests.

## Brief (as the user would write it)

> یک سایت برای یک کلینیک (خیالی). حس لوکس و آرام می‌خواهم، نه شلوغ و نه تبلیغاتی. دو کار اصلی: معرفی خدمات و یک فرم «درخواست وقت آزمایشی» که اگر موفق شد رسید بدهد، اگر خطا شد روشن بگوید چه شده، و بشود دوباره تلاش کرد. اکثر بازدیدکننده‌ها با موبایل می‌آیند.

## Content the scenario defines

| Item | Value |
|---|---|
| Name | کلینیک فیروزه (fictional) |
| Tone | calm, polite, plain; no diagnosis, no promise of outcome, no discount language |
| Services (4) | ویزیت و مشاورهٔ اولیه · مراقبت پوست · مراقبت مو · ویزیت پیگیری |
| Primary action | درخواست وقت آزمایشی |
| Visual register | Luxury/Calm: restraint, generous spacing, one accent colour, a variable Persian typeface, no stock photography, no heavy motion |
| Data | name, mobile, service, day, time window, optional note, consent. Nothing is sent to anyone |

## States the scenario requires (acceptance for any build of this scenario)

| # | State | Required behaviour |
|---|---|---|
| 1 | Success | A reference code is shown; the focus moves to the success message; nothing sensitive is repeated back in the URL |
| 2 | Validation error | One summary that is announced and focused, each field explained in Persian, typed input kept |
| 3 | Transient server error | A clear Persian message and a retry that keeps the input and does **not** create a second request |
| 4 | Lost connection | Same as 3, with a message that names the connection, not the server |
| 5 | Rate limited | A Persian message with no pointless retry button; input kept |
| 6 | Double submit | Exactly one request is stored |
| 7 | No JavaScript | The content is readable; the form says it needs JavaScript and cannot leak data into the URL |
| 8 | Persian input quirks | Persian and Arabic-Indic digits, Arabic yeh/kaf, `+98` and `0098` forms of the mobile number are accepted and stored in one normalized form |

## What this scenario cannot show

It has no payment, no OTP, no staff screen, no calendar of real availability, no images and no second language. It says nothing about a Commerce or Tech site. Pass/fail on this scenario is evidence about this scenario only.

## Where the pilot answered it

`sites/clinic-calm/tests/e2e.test.mjs` covers states 1–7; `lib.test.mjs` covers state 8 at unit level and `api.test.mjs` at the API level. Limits: `sites/clinic-calm/LIMITATIONS.md`.
