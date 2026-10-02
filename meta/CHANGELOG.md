# Changelog

Versioning: `0.MINOR.PATCH`. MINOR = new module, gate, tool or behaviour-changing guidance. PATCH = corrections, evidence refresh, wording. Meta-only notes do not bump the version. `persian-website-builder/SKILL.md` `metadata.version` must equal the top entry (checked by `meta/tools/lint-skill.mjs`).

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
