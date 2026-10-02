# Changelog

Versioning: `0.MINOR.PATCH`. MINOR = new module, gate, tool or behaviour-changing guidance. PATCH = corrections, evidence refresh, wording. Meta-only notes do not bump the version. `persian-website-builder/SKILL.md` `metadata.version` must equal the top entry (checked by `meta/tools/lint-skill.mjs`).

## v0.2.2 — 2026-10-02 (run 2: a failing budget in a fresh clone)

**What** (PATCH, library correction): FM-055 (font preload hint and `@font-face` URL differ, so the font is downloaded twice) and a clause in `performance.md` §4 item 8 (verify the hint is used).

**Why**: the pilot's lab-LCP test failed once in a fresh clone (2512 ms against a 2500 ms budget) although it passed in the working tree. I did not call it a flake and did not touch the budget: 10 runs showed the home page at 2260–2308 ms (8% headroom), and the network log showed the 109 KB variable font fetched twice, because the preload hint was percent-encoded (`%5Bwght%5D`) and the `@font-face` URL was not. With the hint off the font is fetched once and the same 10 runs give 1716–1752 ms. A regression test (`e2e.test.mjs`, one request per font file) was red with the hint on and green with it off.

**Evidence**: `sites/clinic-calm/tests/e2e.test.mjs` (web font test); distributions measured in `RUN-LOG.md`. Lab numbers are EXPERIMENTAL (throttle profile, one sandbox); the duplicate download is a FACT about this Next.js version (16.3.8) and file name.

**Uncertain**: whether other frameworks encode the hint the same way; the finding is stated about the mismatch, not about one framework.

## v0.2.1 — 2026-10-02 (run 2: findings from pilot P0)

**What** (library additions from reproduced pilot findings; corrections, hence PATCH):
- AP-029 (a form that works only after JavaScript loads leaks personal data into the URL on a native GET submit), FM-015 (focus moved before the result element exists), EC-027, EC-028, EC-084 (rate limit with a client-sent address header), and one paragraph in `security.md` §10 about the client-address key. An earlier draft of that paragraph claimed that a missing header merges all callers into one bucket; an experiment showed the opposite (the framework fills it from the socket) and the real weakness is the client-settable header, so the text was corrected before release.

**Why**: building the clinic pilot with the skill alone exposed these; the skill did not warn about them. Each was reproduced with a test in `sites/clinic-calm/tests/` (AP-029/EC-027 and FM-015/EC-028: `e2e.test.mjs`; EC-084: `api.test.mjs` "client address"). The AP-029 and FM-015 bugs existed in the first version of the pilot and were fixed after reproduction.

**Evidence**: pilot suite `clinic-p0` run through `meta/tools/run-tests.mjs`; the entries are Builder findings from one site, not independent validation.

**Uncertain**: whether the same entries would have been found by an agent without the Skill, which is the stage 4 question.

## v0.2.0 — 2026-10-02 (run 2: trustworthy results)

**What** (behaviour-changing for the skill's tools, hence MINOR):
- New shared result model `persian-website-builder/scripts/verdict.mjs` (PASS / CONDITIONAL / FAIL / INCOMPLETE; exit codes 0/1/2/3). `security-smoke`, `rtl-smells`, `page-audit` use it and now emit one entry per executed check; `bidi-order` and `contrast` follow the exit-code rules.
- **Fixed hidden failures** (each reproduced, each with red→green regression tests): `security-smoke` swallowed probe errors and could hang; `rtl-smells` passed an empty directory and crashed (exit 1) on a missing path; `page-audit` could report unmeasured LCP as 0 ms; `bidi-order` and `contrast` used the "problems found" exit code for "could not run".
- Guidance aligned with the tools: how to read tool results at a gate (quality-gates §6), G-SEC needs PASS on the HTTPS staging URL, launch checklist wording, ai-agent-workflow reporting (pass / fail / skipped / incomplete), SKILL.md tool section; maturity scale clarifies that M2 is Builder-tested, not independent.
- Meta (no skill behaviour): `meta/tools/run-tests.mjs` (+ tests) separating pass/fail/skipped/todo with content- and environment-bound evidence; `MASTER-BRIEF.md`, `ROADMAP.md`, rewritten `PROCEDURE.md`; Builder labels on validation and red-team logs.

**Why**: the owner's plan makes "tests are trustworthy" stage 0. Run 2 found that the tools meant to protect releases could report success without checking.

**Evidence**: reproduction transcripts and red→green runs in `RUN-LOG.md`; test report with content hash in `meta/evidence/`.

**Uncertain**: CI reproducibility (no workflow existed on the remote); tools still check only what they check (smoke tests, heuristics).

## v0.1.0 — 2026-10-01/02 (run 1: foundation)

**What**: first complete, linted and tested version of the skill.
- Router `SKILL.md` (operating rules, ask-or-proceed, lifecycle + gates, task shortcuts, Persian and Iran baselines, tools, module maturity).
- 21 references covering discovery, research, product/IA, UX + content + trust, Persian UX, Iran context, UI/design system/mobile-first, accessibility, architecture and decision frameworks (D-BUILD, D-RENDER, D-STACK, D-CMS, D-AUTH, D-DB, D-HOST, D-API, D-I18N, D-SEARCH, S-1), engineering, security, performance, SEO, testing + 63 edge cases, ops/observability/analytics/maintenance, AI-agent workflow, 9 site-type playbooks, 28 anti-patterns, 42 failure modes, quality gates; evidence register with 34 labelled claims.
- Templates: project brief with assumptions/risk registers, ADR, launch checklist, and `starter-lite` (RTL-correct tokens + page that passes the audit).
- Scripts (38 tests, plus 3 for the linter): `persian-utils` (digits, normalization, national code, mobile, Sheba, card, money, slug), `rtl-smells`, `contrast`, `page-audit` (browser; blocks foreign hosts), `bidi-order` (browser), `security-smoke`, and `platform-facts.test.mjs` (guards the runtime-behaviour claims E-010..E-017 against silent ICU/Node changes).
- Meta system: `PROCEDURE.md` (cycle runbook), `lint-skill.mjs` (+ tests), `OPEN-QUESTIONS.md`, `RED-TEAM.md`, `VALIDATION.md`, `DESIGN-DECISIONS.md`, `RUN-LOG.md`.

**Why**: the standing task asks for an evidence-driven, operational, continuously improving decision system, not a document. Mechanical checks (lint, tests, executable audits) make each later cycle cheaper and safer.

**Evidence (principal)**: web.dev (CWV, TTFB, LCP, CLS), W3C WCAG 2.2 "what's new", OWASP Top 10:2025 and Cheat Sheets (password storage, SSRF, headers), Google Search Central (URLs, sitemaps, robots, hreflang), Agent Skills spec and Claude Code skills docs, plus own reproducible experiments (Intl/ICU behaviour, Unicode normalization, Tehran time zone, Jalali leap years, bidi rendering, Persian plural/list behaviour). Secondary only (flagged ASSUMPTION or FACT-S): Iranian legal/payment/hosting facts, Persian search engines, the January 2026 shutdown report.

**Uncertain / known weak**: Iran legal, payment-gateway APIs, data protection, search-engine share, Persian screen-reader behaviour, chart direction in RTL, WebKit/Firefox bidi, Persian copy style (no native review), performance budget numbers (EXPERIMENTAL), domestic-hosting capabilities. All tracked in `OPEN-QUESTIONS.md`.

**Corrected during the run (self-found)**: two bidi hazard claims that failed reproduction; an off-by-one in the first leap-year test; a mis-parsed evidence date and an undefined decision ID found by the linter; a misleading `dir="null"` message and false positives on native checkbox/radio sizing in the page audit; a wrong cross-reference (AP-016 vs AP-024).

**Simplified**: removed a skill-authoring claim from the website evidence register (moved to meta); replaced an 11-document default with a 2-file Lite set; made the evidence register lookup-only in routing.
