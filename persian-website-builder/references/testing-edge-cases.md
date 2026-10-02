# Testing strategy and the edge-case library

Tests are **evidence that acceptance criteria hold**, not a ritual. Output: `docs/08-test-plan.md` (what is tested at which layer, data, environments, results). Gate: **G-TEST** (inside G5).

## 1. What deserves automation (and what does not)

Value of a test ≈ (impact if it breaks) × (likelihood it breaks) ÷ (cost to write and keep stable). Ask: *if this breaks, who notices, how fast, and how bad is it?*

| Automate | Usually do not automate |
|---|---|
| Pure logic with branches: money, normalization, validators, pricing, permissions | Pixel-perfect layout of every page (use component-level visual checks instead) |
| Authorization matrix (endpoint × role × own/other) | Third-party internals (test **your** integration contract with a fake + a sandbox smoke) |
| Payment, auth and checkout journeys (E2E, few and robust) | Static copy and trivial getters/setters |
| API contracts and migrations | Framework behaviour you did not change |
| Every bug that reached production (regression test first) | Exhaustive cross-browser E2E (run a small smoke matrix) |
| Accessibility rules on every template (automated part) | Mock-heavy tests that restate the implementation |

Flaky tests are fixed or deleted. **Never skip a failing test silently**: a skip needs an issue, an owner and an expiry.

## 2. Layers

| Layer | Covers | Runs |
|---|---|---|
| Unit | Pure functions, validators, formatters (`persian-utils` tests are the model), reducers | Every commit |
| Integration | Service + DB, queue, provider fakes, migrations on a copy | Every PR |
| API/contract | Status codes, error body, auth, pagination, idempotency; schema vs OpenAPI | Every PR |
| E2E | 5–10 critical journeys on a real browser (mobile viewport first): browse→pay, sign-up/login with OTP fake, search, contact form | Every PR (smoke) / nightly (full) |
| Visual | Component catalog at 360/768/1280, RTL | Every PR touching UI |
| Accessibility | Automated engine on all templates + manual keyboard/screen-reader pass | PR (auto) / pre-release (manual) |
| Performance | Lab budgets on key templates; RUM after launch | PR + weekly |
| Security | Authz matrix, injection/SSRF/CSRF suites, header scan, dependency audit, secret scan | PR + pre-release |
| Cross-browser | Smoke on the traffic-driven matrix (the engines, mobile OS versions your users run) | Nightly/pre-release |
| Responsive | 320/360/768/1024/1280, zoom 200%, landscape | Visual + manual |

Browser/OS matrix comes from analytics or an assumption written in the brief (ASSUMPTION until measured).

## 3. Test data and environments

- **Persian fixtures** (synthetic, never real PII): names in Persian, Latin, Kurdish letters, with ی/ي, ک/ك variants and ZWNJ; long and short; addresses across provinces; phone numbers in all accepted formats; synthetic valid and invalid national codes; products with long Persian titles; prices around toman boundaries; Persian and Latin digits.
- **Time control**: fake clock; Jalali boundary dates (30 Esfand 1403, Nowruz 2026-03-21 [E-014]); Tehran vs UTC midnight; no DST [E-013].
- **Staging parity**: same build, config shape, DB engine, and a PSP/SMS sandbox; separate secrets.
- **Network profiles**: normal, throttled mobile, offline, domestic-only (foreign hosts blocked; I-2).

## 4. The edge-case library (seed v0.1: extend every cycle)

Use it when writing acceptance criteria and test plans; pick by relevance to the product. Layers: U unit · I integration · E end-to-end · M manual. Add new cases with the next free ID and the version in `meta/CHANGELOG.md`.

### Network and availability
| ID | Case | Expected | L |
|---|---|---|---|
| EC-001 | Offline mid-form | Input kept; clear message; resumes on reconnect; no duplicate submit | E |
| EC-002 | API 5xx on page load | Section-level error with retry; rest of page works; no endless spinner | E |
| EC-003 | Request timeout | Abort, message, safe retry (idempotent) | I |
| EC-004 | Slow 3G + 4× CPU | Critical journey completes; budgets hold in lab | E |
| EC-005 | International internet blocked (domestic-only) | Critical flows work; no console-error loops; no layout shift (I-2) | E |
| EC-006 | PSP slow/down | Cart preserved; clear message; no double order | I |
| EC-007 | SMS provider fails | User sees why + alternative/timed retry; alert fires | I |
| EC-008 | Stale HTML requests a deleted hashed asset after deploy | App recovers (reload prompt), no blank page | E |

### Data states
| ID | Case | Expected | L |
|---|---|---|---|
| EC-010 | Empty list / no results | Empty state with next action | E |
| EC-011 | Huge dataset (10k rows) | Pagination/virtualization; UI stays responsive | E |
| EC-012 | Very long text, incl. 100-char unbroken token | Wraps/truncates without breaking layout; full text reachable | M |
| EC-013 | Missing/broken image | Placeholder with fixed dimensions; no CLS; alt visible | E |
| EC-014 | Null/missing optional fields | No crash; sensible fallback | U |
| EC-015 | Unknown enum/status from backend | Graceful default; logged | U |
| EC-016 | Item deleted/canceled while user views it | Clear message, not 500 | I |

### Input
| ID | Case | Expected | L |
|---|---|---|---|
| EC-020 | Empty, whitespace-only, over-max, wrong type | Field error with fix hint; data preserved | U |
| EC-021 | Duplicate submit (double click, back, retry) | Exactly one effect | I |
| EC-022 | Paste with hidden characters (RLM, ZWNJ, NBSP, zero-width) | Normalized or rejected consistently | U |
| EC-023 | Emoji / astral Unicode in names | Stored and shown; length by code points; no DB error | I |
| EC-024 | SQL/HTML/script payloads in every field | Inert (see `security.md` §4) | I |
| EC-025 | Autofill, password manager, SMS OTP autofill | Works; no broken masks | M |
| EC-026 | Upload: huge, zero-byte, wrong type, double extension | Rejected with clear message | I |

### Session and permission
| ID | Case | Expected | L |
|---|---|---|---|
| EC-030 | Session expires mid-action | Re-auth then resume without data loss | E |
| EC-031 | Permission denied | Clear message; no data leak | I |
| EC-032 | Multiple devices; "log out everywhere" | Sessions invalidated | I |
| EC-033 | Two tabs edit the same record | Conflict detected, not silent overwrite | I |
| EC-034 | Back button after logout | No private data visible (`no-store`) | E |

### Browser and device
| ID | Case | Expected | L |
|---|---|---|---|
| EC-040 | JavaScript fails to load or throws | Core content/forms usable or a clear fallback message | E |
| EC-041 | 320 px width | No horizontal scroll; all actions reachable | E |
| EC-042 | Old/slow device and oldest browser in the matrix | Degrades gracefully | M |
| EC-043 | Zoom 200–400%, larger text, text-spacing override | No clipping/overlap | M |
| EC-044 | Mobile keyboard open / landscape | Submit reachable; sticky bars do not cover the field | M |
| EC-045 | Forced colors / dark mode / reduced motion | Readable; motion reduced | M |

### Time and calendar [E-013, E-014]
| ID | Case | Expected | L |
|---|---|---|---|
| EC-050 | 30 Esfand 1403 (exists) and 30 Esfand 1404 (does not) | Picker/validation correct | U |
| EC-051 | Nowruz boundary 2026-03-20/21 | Correct Jalali conversion in Tehran time | U |
| EC-052 | Scheduled job near Tehran midnight; historical 2021 offset (+04:30) | Correct day; no offset hardcoding | U |
| EC-053 | Week starts Saturday; weekend/holiday data missing next year | Configurable; fallback + alert | I |
| EC-054 | User outside Iran | Times labelled with zone | M |
| EC-055 | "Add one month" from 31 Shahrivar / 30 Mehr | Defined, documented behaviour | U |

### Persian and bidirectional text [E-010..E-017]
| ID | Case | Expected | L |
|---|---|---|---|
| EC-060 | Digits in 3 scripts in each numeric field | Same stored value | U |
| EC-061 | ی/ي and ک/ك in login, search, uniqueness, slugs, URLs | Treated as equal; duplicates rejected | I |
| EC-062 | ZWNJ vs space vs joined in search | Per acceptance table (`persian-ux.md` §6) | I |
| EC-063 | Phone/email/URL/ID inside RTL sentence at 360 px | Correct order, readable | M |
| EC-064 | Negative numbers, ranges, percent in RTL | Not flipped | M |
| EC-065 | Mixed Persian/English heading wraps/truncates | Ellipsis on the correct side | M |
| EC-066 | RLO/bidi controls in names/filenames | Rejected or neutralized | U |
| EC-067 | Persian in PDF, email, OG image, CSV/Excel | Shaped correctly; opens correctly | M |
| EC-068 | Persian typed on an English keyboard layout in search | Helpful suggestion or clear no-results state | M |
| EC-069 | Separators `،` `,` `٬` `٫` `.` in amounts | Parsed to the same number | U |

### Payments and money [E-024, E-027]
| ID | Case | Expected | L |
|---|---|---|---|
| EC-070 | Amount tampered in callback | Rejected (server verify with DB amount) | I |
| EC-071 | Duplicate/replayed callback | One fulfilment | I |
| EC-072 | Paid but callback never arrives | Reconciliation fulfils or refunds | I |
| EC-073 | User cancels at gateway | Order state correct; retry path | E |
| EC-074 | Rial vs toman unit | Sandbox amount equals the expected value at the gateway | E |
| EC-075 | Discounts and rounding | Integer rial; parts sum to total | U |
| EC-076 | Partial/full refund | State and stock consistent | I |

### Concurrency and operations
| ID | Case | Expected | L |
|---|---|---|---|
| EC-080 | Last item bought by two users | One succeeds, one gets a clear message | I |
| EC-081 | Single-use coupon race | Used once | I |
| EC-082 | Webhook duplicate or out of order | Idempotent; final state correct | I |
| EC-083 | Migration under traffic | Expand/contract; no downtime/data loss | I |

### Content
| ID | Case | Expected | L |
|---|---|---|---|
| EC-090 | Missing translation key / empty CMS field | Fallback, never a raw key | U |
| EC-091 | User-generated HTML | Sanitized | I |
| EC-092 | Placeholder content left (lorem, `test@example`, `0912 000 0000`, "TODO") | Pre-launch scan finds none (AP-007) | U |

## 5. G-TEST

- [ ] Every acceptance criterion maps to at least one test or a recorded manual check with evidence.
- [ ] Critical journeys have E2E on a mobile viewport; authz matrix and payment fault tests pass.
- [ ] Relevant edge cases from §4 selected, executed and recorded (pass/fail/N-A with reason).
- [ ] Persian gate (`persian-ux.md` §10) results attached.
- [ ] No skipped tests without issue + owner + expiry; flaky tests fixed.
