---
name: persian-website-builder
description: Design, build, audit and launch Persian (Farsi, RTL) websites and web apps end to end, from a vague idea to deployment, monitoring and maintenance (ساخت وب‌سایت فارسی). Use when asked to create or improve any site for Persian-speaking or Iranian users (shop, company site, blog, SaaS, marketplace, education, booking, dashboard), or when the task involves Persian/RTL UX, Jalali dates, toman/rial prices, Iranian payment gateways, Iranian phone or national-ID inputs, Persian SEO or search, bidi bugs, or hosting and reachability from Iran. Supplies decision frameworks, quality gates, an evidence register and tested Persian utilities. Framework-agnostic.
compatibility: Helper scripts need Node.js >= 18 (no packages). page-audit.mjs and bidi-order.mjs also need Playwright with Chromium installed in the project.
metadata:
  version: "0.2.2"
---

# Persian website builder

A decision-and-execution system for building professional Persian websites **from nothing to maintained production**. It does not prescribe a framework. It prescribes *how to decide, what to check, what evidence proves it, and when to stop*.

Read this file first. Then read **only** the reference files the current phase needs (table in §3). Everything is one hop from here. Do not read `evidence-register.md` end to end: read its label rules once, then look up `E-xxx` IDs when a file cites them.

## 1. Operating rules (apply to every task)

1. **Outcome before output.** No design or code until the outcome, audience and primary journey are written down (G0).
2. **Proportionality.** Classify the project as Lite / Standard / Heavy (`references/discovery.md` §1) and run only the process that profile needs. The *release floor* (`references/quality-gates.md` §2) applies to all.
3. **Evidence over habit.** Every non-obvious claim is labelled FACT / BEST PRACTICE / RECOMMENDATION / ASSUMPTION / EXPERIMENTAL (`references/evidence-register.md`). **Never act on an ASSUMPTION about money, law, security, identity, hosting reachability or licenses without verifying it or getting a named owner to accept the risk.**
4. **Verify volatile facts at project start and date them**: framework/library versions and APIs, vendor docs (payment, SMS, maps), law-dependent rules, search-engine behaviour, hosting and registry reachability. This skill intentionally stores no version numbers.
5. **Decide with frameworks, not taste** (`references/architecture-decisions.md`): set criteria and weights first, record an ADR, state a "change-if" trigger. Boring technology by default; at most one unproven component.
6. **Persian correctness is functional** (`references/persian-ux.md`): logical CSS from line one, digit/ZWNJ/ی-ک normalization, bidi isolation, one money formatter, Jalali display with UTC storage.
7. **Iran context is a design input** (`references/iran-context.md`): connectivity can fail, foreign runtime dependencies are not allowed on critical paths, money is a versioned unit, payments are verified on the server.
8. **Accessibility, security, SEO and performance are designed in**, with budgets and tests from the start, not added at the end.
9. **Run it before you say it works.** Done = commands executed and results shown, mobile RTL viewport checked, one failure path tried, and a list of what was *not* verified (`references/ai-agent-workflow.md` §3).
10. **No invented facts.** Never fabricate business details, testimonials, statistics, legal claims or vendor behaviour. Use clearly marked placeholders in non-production only, and fail the launch gate if any remain.
11. **Simplify.** Every component, dependency, page and document must name the requirement it serves; if it cannot, delete it.
12. **Stop at gates.** Check the gate list with evidence; waivers need a named human and an expiry.

## 2. Ask or proceed?

- **You can ask the user:** put all blocking questions in one message, ordered by cost-of-being-wrong, each with your recommended default.
- **You cannot ask (autonomous run):** proceed with documented defaults for **reversible** choices (palette, type, layout details, copy tone). **Stop and report** for **hard-to-reverse** ones: legal entity and public business details, payment provider/contract, regulated data handling, domain/hosting purchase, anything that spends money or messages real people.
- Always write assumptions into the register (`templates/project-brief.md`) with their risk and how you would detect they are wrong.

## 3. Lifecycle, files and gates

| Phase | Do | Read | Exit |
|---|---|---|---|
| Discovery + research | Triage; 12 questions; assumptions & risks; competitors with mechanism analysis; intent map | `discovery.md`, `research.md`, `site-type-playbooks.md`, `iran-context.md` §0 | **G0** |
| Product + IA | MVP, stories + acceptance, sitemap, templates inventory, navigation, URL rules | `product-ia.md`, `seo.md` §3 | **G1** |
| UX + content | Flows, states, forms, copy deck, glossary, trust inventory | `ux-content.md`, `persian-ux.md` | **G2** |
| Architecture | Build-vs-adopt, rendering, stack, CMS/auth/DB/hosting/i18n decisions, ADRs, spikes | `architecture-decisions.md`, `iran-context.md` | **G4** |
| UI + design system | Tokens, components, contrast, mobile-first, budgets | `ui-design-system.md`, `accessibility.md`, `persian-ux.md` §1–§3 | **G3** |
| Build (vertical slices) | Frontend, backend, data, API | `engineering.md`, `security.md`, `ai-agent-workflow.md` | per-slice DoD |
| Verify | Tests, edge cases, a11y, perf, SEO, security, Persian gate | `testing-edge-cases.md`, `performance.md`, `seo.md`, `accessibility.md`, `security.md`, `persian-ux.md` §10 | **G5** |
| Launch + operate | Deploy, monitor, measure, maintain, review at 30 days | `ops.md`, `templates/launch-checklist.md` | **G6** |
| Anytime | Review diffs and plans | `anti-patterns.md`, `failure-modes.md`, `quality-gates.md` | |

Order: G0 → G1 → (G2 ∥ G4) → G3 → slices → G5 → launch → G6. **Lite** projects merge G0–G4 into one spec page but keep the release floor.

**Task shortcuts** (read less when the task is narrow):

| Task | Read |
|---|---|
| New site of a known type (shop, booking, SaaS, marketplace, blog, school, dashboard, company, leads) | `site-type-playbooks.md`, then the phase files above |
| Fix or prevent an RTL / Persian input / date / digit bug | `persian-ux.md` §1–§6; run `rtl-smells`, `bidi-order` |
| Add payments | `iran-context.md` I-3, I-4; `security.md` §15; EC-070…076 |
| Add login / OTP | `security.md` §2, §10; `iran-context.md` I-5; `accessibility.md` §5 |
| Audit an existing site | `quality-gates.md` §2, `anti-patterns.md`, `failure-modes.md`; run `page-audit`, `security-smoke`, `rtl-smells` |
| Choose stack / hosting / rendering | `architecture-decisions.md`; `iran-context.md` I-6 |
| Speed up; improve SEO; write copy | `performance.md`; `seo.md`; `ux-content.md` §6 + `persian-ux.md` §2 |

## 4. Persian baseline (non-negotiable for every project)

- `<html lang="fa" dir="rtl">`; LTR islands (`dir="ltr"` / `<bdi>`) for phone, email, URL, codes, OTP.
- Logical CSS only (`margin-inline-start`, `inset-inline-*`, `text-align: start`); run `scripts/rtl-smells.mjs`.
- No `letter-spacing` or italics on Persian text; self-hosted font with verified license and Persian coverage; body ≥ 16 px.
- Store digits Latin; accept ۰-۹, ٠-٩, 0-9 everywhere; normalize ی/ي, ک/ك and ZWNJ for matching (`scripts/persian-utils.mjs`; `NFKC` is **not** enough, E-011).
- Money: integer + currency + denomination, one formatter, unit word always shown (E-012, E-024).
- Dates: UTC stored, Jalali displayed (`Intl`), Saturday-first week, IANA `Asia/Tehran` (no DST from 2023 on, E-013).
- Names accept any letters (`\p{L}\p{M}`): not Persian-only (AP-020). National code and phone are strings.
- Persian copy is written natively with a glossary; AI-drafted launch copy needs native review.

## 5. Iran baseline (when the audience, payments or hosting touch Iran)

- Test with foreign hosts blocked; critical journeys must still work (I-2). Self-host fonts/scripts/analytics.
- Payments: server-side verify with the DB amount, idempotent fulfilment, reconciliation job, unit confirmed in the sandbox (I-4).
- Legal/trust content comes from the client's lawyer: consumer withdrawal (E-025), business information, Enamad (E-026).
- Hosting location is a decision (D-HOST): users' location, outage tolerance, vendor reachability and sanctions exposure (E-023), payment/SMS provider locations.
- OTP/SMS: rate limits and a spend cap with alerts.

## 6. Decision frameworks (in `references/architecture-decisions.md`)

D-BUILD (build / adopt / compose) · D-RENDER (static/SSG/SSR/SPA/hybrid) · D-FRAMEWORK/STACK (weighted criteria + knockouts) · D-CMS · D-AUTH · D-DB · D-HOST · D-API · D-I18N · D-SEARCH · S-1 Persian vs Latin slugs (`seo.md`) · I-3 money unit (`iran-context.md`). Each states inputs, rule, default, and a change-if trigger.

## 7. Tools (Node ≥ 18; paths are relative to this skill's directory: prefix them if you run from elsewhere)

```
node --test scripts/*.test.mjs        # verify the helpers
node scripts/rtl-smells.mjs <dir>     # RTL/Iran-reachability smells
node scripts/contrast.mjs "#767676" "#fff"   # WCAG contrast ratio
node scripts/security-smoke.mjs <staging-url>        # headers, cookies, exposed paths, CORS (authorized targets only)
node scripts/page-audit.mjs <file|url>        # browser audit; BLOCKS foreign hosts (I-2); needs Playwright
node scripts/bidi-order.mjs <file> [selector] # visual character order of mixed Persian/Latin/number strings
```
`templates/starter-lite/` is an RTL-correct, token-based page that passes the audit (placeholders still to be replaced).
**Reading tool results (all check tools share `scripts/verdict.mjs`):** every check ends as pass/fail/warn/info/incomplete/skipped/not-applicable and the run as **PASS | CONDITIONAL | FAIL | INCOMPLETE**. Exit codes: 0 PASS or CONDITIONAL, 1 FAIL, 2 could not run, 3 INCOMPLETE. **Only PASS is a pass.** CONDITIONAL means warnings or scope limits (listed in the output: copy them into the gate record); INCOMPLETE means a check could not run (e.g. a probe timed out) and nothing is verified; an empty directory or an HTTP target never yields PASS. Test suites follow the same rule: a skipped test is missing evidence (the repository's `meta/tools/run-tests.mjs` reports it as INCOMPLETE).

Only `page-audit.mjs` and `bidi-order.mjs` need Playwright (install it in the project); the rest have no dependencies. `scripts/persian-utils.mjs` exports: `toLatinDigits`, `toPersianDigits`, `normalizePersian`, `searchKey`, `isValidNationalCode`, `normalizeIranMobile`, `isValidPostalCodeFormat`, `isValidSheba`, `isValidCardNumber`, `formatMoney`, `slugifyFa`. Copy or import them; they are format/normalization helpers only (a valid format never proves identity or existence).

## 8. Project docs the agent should produce (proportional to the profile)

`docs/01-brief.md` (template) · `02-research.md` · `03-scope.md` · `04-ia.md` · `05-ux.md` · `06-design-system.md` · `07-architecture.md` + `decisions/ADR-*.md` · `08-test-plan.md` · `09-ops.md` · `gates/G*.md` · `launch-checklist.md`. Short, dated, evidenced; delete any that changes no decision. **Lite = two files only**: `docs/spec.md` + `docs/gates/G5.md` (`references/discovery.md` §1).

## 9. Reporting to the user after a build task

State: what was built and where · evidence of verification (commands, results, screenshots) · gates passed/failed/waived · assumptions still open (with owner) · what needs a human (native copy review, legal review, vendor contracts) · next recommended step. Never claim compliance (WCAG, PCI, legal) that was not independently evaluated.

## 10. Module maturity (be honest about depth)

Scale: **M1** drafted from researched sources, not yet scenario-tested · **M2** scenario-tested and red-teamed **by the Builder (not an independent audit)** · **M3** independently evaluated or used on a real project with feedback. Open issues are tracked in `meta/OPEN-QUESTIONS.md` of the skill's repository.

| Module | Maturity | Weakest point |
|---|---|---|
| `persian-ux.md` + `scripts/` | M2 | Bidi verified in Chromium only; chart axis direction; Persian search analyzers per engine unverified |
| `architecture-decisions.md` | M2 | Scoring weights and the D-HOST rule are defaults without field data |
| `security.md` | M2 | Not reviewed by an external security practitioner; smoke tool covers HTTP-level checks only |
| `iran-context.md` | M1 | Law, PSP APIs, e-invoicing, data-protection status, search-engine share not verified from primary sources |
| `site-type-playbooks.md` | M1 | Walked on 4 of 9 types; marketplace/payout legality unverified |
| `discovery.md`, `research.md`, `product-ia.md`, `ux-content.md` | M1 | Persian copy examples need native-editor review |
| `ui-design-system.md`, `accessibility.md` | M1 | Persian screen-reader behaviour unverified |
| `engineering.md`, `performance.md`, `seo.md`, `testing-edge-cases.md`, `ops.md` | M1 | Budget numbers are EXPERIMENTAL; HowTo structured-data status unverified |
| `ai-agent-workflow.md`, `anti-patterns.md`, `failure-modes.md`, `quality-gates.md` | M1 | No field feedback yet |
