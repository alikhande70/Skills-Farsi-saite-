# Limitations of the sample (P0 pilot)

Read this before treating anything here as evidence. This is **pilot P0**: a fictional clinic site built by the Builder with the Skill only, **before** the Foundry protocol exists. It is a *development scenario*, not an independent holdout, and its tests were written by the same author as the site.

## What the sample is not

- **Not independently audited.** Every test was written by the author of the site. A green result means "the author's checks pass", nothing more. Independent evaluation is stage 4 of `meta/ROADMAP.md`.
- **Not a Foundry result.** No Recipe, Registry or Resolver produced it. It cannot be used to claim that the protocol works; it is the baseline the protocol must later beat or match, with a different scenario.
- **Not a real clinic.** Name, doctors, phone numbers, address and prices are invented (the banner says so on every page). No real medical data, payment or message is used anywhere. The form does **not** send an SMS, email or any notification.
- **Not production-ready.** The site is `noindex` and never published.

## Known technical limits

| Area | Limit | Consequence |
|---|---|---|
| Storage | Append-only JSONL file in `.data/` plus in-memory indexes. Safe for one server process only | Two processes (or a serverless platform) can create duplicate records and bypass idempotency and rate limits. A real deployment needs a database with a unique constraint on the idempotency key |
| Rate limiting | In-memory, per process. The per-address key is the first `x-forwarded-for` value; Next fills that header with the socket address when the client sent none (reproduced with two source addresses, `tests/api.test.mjs`) | **A client can send its own `x-forwarded-for` and get a fresh bucket each time** (reproduced), so the per-address limit is not a security control unless a proxy overwrites the header. Behind a proxy that does *not* set it, all users share the proxy's address (inferred from the code, not tested). The per-mobile limit and the idempotency check do not depend on the address. Limits reset on restart. Needs a trusted-proxy rule and shared storage in production |
| Personal data | Mobile number and name are stored in plain text; there is no retention rule, no deletion flow and no access control for staff | Acceptable only because all data is fictional. A real medical-appointment form needs a legal and security review (OQ-01) |
| Staff side | No admin screen, no confirmation to the patient, no calendar | The "request" is only recorded. Real follow-up would need a back office and a message channel |
| Calendar | The next 10 bookable days, Friday excluded (ICU weekend, E-014). **Thursday rules, clinic hours and official holidays are not handled** (OQ-15) | A request for a public holiday is accepted; the weekend is a code constant, a real clinic needs it as configuration |
| Time zone | "Today" is computed with the IANA zone `Asia/Tehran` through `Intl` (no hard-coded offset; Iran has applied no DST since 2023 in the ICU data, E-013) | The result depends on the tz data inside the Node/ICU build of the host; the tests use a fixed clock, so a change of Iranian rules is not exercised |
| Idempotency | A key is remembered for the life of the data file; the same key with a different payload returns 409 | There is no key expiry |
| Test hooks | Fault injection, fixed clock and tiny rate limits exist only when `CLINIC_TEST_FAULTS=1`. A production start never sets it, and the security smoke runs against a server started without it | The hooks are code that must stay disabled; the audit test checks the smoke run without it, not every deployment |
| HTTPS | HSTS and the CSP `upgrade-insecure-requests` directive are added only when `CLINIC_ENFORCE_HTTPS=1`; the site does **not** redirect `http` to `https` itself (the host or proxy must). The smoke test cannot evaluate HSTS over `http` and reports it as skipped (CONDITIONAL) | Transport security was not tested here |
| Canonical URL | Missing on purpose (no real domain); `page-audit` reports it as a warning | |
| Content | Persian copy written by an AI agent, **not reviewed by a native editor** (RT-012, OQ-12). Medical wording is deliberately generic (no diagnosis, no claim of outcome) | Tone, ezafe and ZWNJ choices are unreviewed |
| Visual design | Judged by the Builder from screenshots in a sandbox where the Persian system font is DejaVu Sans; the shipped font is Vazirmatn | Typographic quality was not judged on a real device |
| Images | None. Licence for any stock photo could not be proven, so none was used | The "Luxury" side of Luxury/Calm rests on type, spacing, colour and restraint only |
| Browsers | Chromium (Playwright 1.56.1, Chromium 141) only. No Firefox, no WebKit, no real phone, no screen reader | OQ-05, OQ-06 |
| Accessibility | Automated structure checks and a keyboard-order test; no screen-reader test, no manual audit | WCAG conformance is **not** claimed |
| Performance | Lab numbers from a throttled Chromium run in one sandbox (EXPERIMENTAL profile in the Skill); no field data | The budget test guards against regression, it does not prove real-user speed |
| Dependencies | Exact pins and a lockfile with integrity hashes; transitive licences not inventoried; no `npm audit` result is claimed | See `LICENSES.md` |

## Where the claims come from

Each test file says what it checks. The authoritative result is the runner's verdict (`node meta/tools/run-tests.mjs`), whose report is bound to the exact file hashes and the environment (node, playwright, chromium, platform). A skipped test, a missing browser or missing dependencies make the verdict INCOMPLETE, never PASS. The raw `npm test` script prints `ok` for skipped tests and is not evidence.
