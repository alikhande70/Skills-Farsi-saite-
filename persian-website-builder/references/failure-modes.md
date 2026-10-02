# Failure-mode library

How a web project actually fails: not only bugs. Use it (1) at G0 to pick the top risks for the risk register, (2) at G4/G5 to confirm each has a prevention and an early-warning signal, (3) after launch to explain incidents. IDs are permanent. Add an entry only if it is real, distinct, and has a detection and a prevention.

Columns: **ID · failure · early detection · prevention (where)**.

## Product failures
| ID | Failure | Early detection | Prevention |
|---|---|---|---|
| FM-001 | Built before the outcome was defined | Cannot state the primary metric or primary journey in two sentences | G0 (`discovery.md`) |
| FM-002 | Stakeholder taste replaces user evidence | Design debates with no data; no user contact | Research + task tests (`research.md`, `ux-content.md` §5) |
| FM-003 | Content has no owner → placeholders or stale pages | Content plan lacks owner/date; empty templates at G3 | Content plan at G0; placeholder scan (AP-007, EC-092) |
| FM-004 | Payment/hosting/SMS feasibility assumed | No sandbox transaction or reachability test by G4 | Spikes (`research.md` §6); D-HOST |
| FM-005 | Scope grows through small additions | Rising backlog of "tiny" items; dates slip | Scope freeze + admission rule (`product-ia.md` §2) |
| FM-006 | Wrong audience/device assumption | Brief has no device/network data; analytics later contradicts | Triage questions (`discovery.md` §2); measure early |
| FM-007 | No acquisition path ("build it and they will come") | Intent map without a plan to reach those users | Intent→page map + channel plan (`research.md`, `seo.md`) |

## UX failures
| ID | Failure | Early detection | Prevention |
|---|---|---|---|
| FM-010 | Core flow too long/complex on a phone | Task test failures; funnel drop-off | Count steps/fields; test on devices (`ux-content.md`) |
| FM-011 | Persian input handling breaks (digits, ZWNJ, ی/ک, names) | G-FA failures; "can't register / search finds nothing" tickets | `persian-ux.md` §3–§6, `persian-utils` tests |
| FM-012 | Trust gap (no real identity, unclear policies, payment redirect surprise) | Interviews: hesitation; abandonment at payment | Trust inventory (`ux-content.md` §7); explain payment redirect |
| FM-013 | Inaccessible patterns exclude users | A11y gate fails; complaints | `accessibility.md` per phase |
| FM-014 | Unhelpful errors and dead-end empty states | High error/retry rates; support contacts | Copy deck + states at G2 |
| FM-015 | Result of a submit is not announced: focus is moved before the success/error element exists, or never moves | Keyboard run: after submit `document.activeElement` is `body`; screen reader is silent | Move focus in an effect keyed on the state change (after mount); EC-028; `accessibility.md` |

## Business failures
| ID | Failure | Early detection | Prevention |
|---|---|---|---|
| FM-020 | Unit economics ignore shipping, returns, gateway fees | Brief lacks margin constraints | Discovery Q3; model before pricing UX |
| FM-021 | Single-vendor or single-channel dependency (one PSP/SMS/marketplace) | No fallback documented; contract lock-in | Replaceable-by-config critical vendors (`iran-context.md` §3) |
| FM-022 | Legal/compliance gap found late (Enamad, consumer rights, licenses) | Gateway onboarding refused; lawyer review missing | Ask at G0; lawyer review of trust pages (`iran-context.md` I-7) |
| FM-023 | Redenomination or unit change breaks pricing | `/10` or `*10` found in code; unit missing in UI | I-3; one `money` module; E-024 watch |
| FM-024 | Seasonal peak overload (Nowruz, Yalda, sales events) | No peak plan; no load test | Ask about peaks; load test; deploy freeze (`ops.md` §5) |

## Security failures
| ID | Failure | Early detection | Prevention |
|---|---|---|---|
| FM-030 | IDOR / broken access control data leak | Authz matrix missing or failing | `security.md` §3 |
| FM-031 | OTP/SMS pumping or card testing (cost attack) | SMS spend spikes; unusual number ranges | Limits + spend caps + alerts (`security.md` §10) |
| FM-032 | Payment tamper or double fulfilment | Verify uses request amount; no idempotency | `iran-context.md` I-4; EC-070..072 |
| FM-033 | Secret leaked in repo/bundle/logs | Secret scan hits; keys in client code | `security.md` §7 |
| FM-034 | Compromised dependency or CI | Unreviewed new packages; unscoped CI secrets | `security.md` §9 |
| FM-035 | Admin account takeover | No MFA; shared admin accounts | MFA + access review (`security.md` §2) |

## SEO failures
| ID | Failure | Early detection | Prevention |
|---|---|---|---|
| FM-040 | Site invisible: `noindex`/robots block left from staging, JS-only content | Crawl shows noindex; zero indexed pages | Launch check (AP-028); `seo.md` §2 |
| FM-041 | Canonical chaos (www, slash, params, Persian encoding variants) | Duplicate URLs in crawl | S-1; single canonical form |
| FM-042 | URL migration without redirects → traffic cliff | Old URLs return 404 in the crawl | Redirect map as launch gate |
| FM-043 | Thin or auto-generated pages | Few impressions; many "crawled, not indexed" | Fewer, better pages; noindex thin ones |
| FM-044 | Persian variants (ZWNJ, ی/ک, digits) not covered in copy or internal search | Search-log zero-results for variants | `persian-ux.md` §6, `seo.md` §7 |

## Performance failures
| ID | Failure | Early detection | Prevention |
|---|---|---|---|
| FM-050 | LCP image lazy-loaded or injected by JS | Lab LCP breakdown shows long load delay | `performance.md` §4 (E-061) |
| FM-051 | Foreign third-party script blocks rendering | Block-foreign test stalls the page | I-2 test |
| FM-052 | Font swap shifts layout or text is invisible | CLS in lab; visual diff with web font blocked | `persian-ux.md` §2; `performance.md` |
| FM-053 | Heavy JS/hydration on low-end Android | INP/long tasks in 4× CPU profile | Budgets; island architecture |
| FM-054 | N+1 and unindexed queries under load | Slow query log; load test | `engineering.md` §4 |
| FM-055 | Font hint and `@font-face` use different URLs (percent-encoded `[ ]`, spaces, query strings, `crossorigin` mismatch), so the same font is downloaded twice | Lab network log lists the font file twice; font bytes transferred ≈ 2× the file; LCP lands at the font-swap time | File names without special characters; E2E assertion of one request per font file; if the hint cannot match, drop the hint |

## Maintenance failures
| ID | Failure | Early detection | Prevention |
|---|---|---|---|
| FM-060 | Backups never restored | No drill record | Drill before launch + quarterly |
| FM-061 | Dependency rot | Audit backlog; major version cliff | Weekly update PRs (`ops.md` §8) |
| FM-062 | Domain or TLS expiry outage | No expiry alert | Auto-renew + alerts; client owns registrar |
| FM-063 | Stale prices/policies/content | Support tickets about wrong info | Content owner + review cadence |
| FM-064 | Knowledge loss (single maintainer, no docs) | Nobody can deploy but one person | Handoff package (`ai-agent-workflow.md` §8) |
| FM-065 | Holiday/calendar data outdated | Wrong delivery promises after the new year | Yearly data update |

## Connectivity and vendor failures (Iran context)
| ID | Failure | Early detection | Prevention |
|---|---|---|---|
| FM-070 | International outage kills login/checkout (foreign OTP, auth, fonts, scripts) | Domestic-only test fails | I-1, I-2 (`iran-context.md`) |
| FM-071 | Vendor becomes unreachable/blocked for the team or audience | Install/deploy/API calls fail from real locations | Reachability tests at G4; replaceable vendors [E-023] |
| FM-072 | Analytics/CDN host blocked → page stall or lost data | Block-foreign test; analytics vs DB mismatch | Self-host; non-blocking tags; reconcile |
