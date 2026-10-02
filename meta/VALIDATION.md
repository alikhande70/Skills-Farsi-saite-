# Validation log

**Everything in this file is Builder-side validation: scenarios and checks designed and run by the same agent that wrote the skill. It is not an independent audit, and the scenarios are not "unseen".** Independent evaluation is stage 4 of `ROADMAP.md`.

The skill is not considered valid because its author read it. Each run exercises it on hypothetical projects and, wherever possible, **executes** something (tools, fixtures, a browser). Findings become fixes or open questions. Method for a walk-through: follow `SKILL.md` literally for the scenario; record (a) which files answered, (b) whether each decision came out **determinate** (two agents with the same inputs would pick the same option) or left to taste, (c) what was missing or contradictory, (d) the fix.

## Coverage matrix (update every run)

| Scenario | Profile | Run walked | Result |
|---|---|---|---|
| S1 Persian online shop (honey) | Standard | 1 | usable after 2 fixes; see below |
| S2 Law-firm / company site | Lite | 1 | proportional after 1 fix |
| S3 SaaS invoicing dashboard | Heavy | 1 | process OK; domain depth M1; 4 open questions |
| S4 Clinic booking | Standard | 1 | OK with open items |
| S5 Marketplace | Heavy | not yet | pending (payouts/legal are the risk) |
| S6 Blog / media | Standard | not yet | pending |
| S7 Education / courses | Standard | not yet | pending (video delivery reachability) |
| S8 Internal dashboard | Standard | not yet | pending (tables, charts) |
| S9 Lead-gen service site | Lite/Standard | not yet | pending |

## Run 1: execution-based validation (things actually run)

| What | Result | What it proved or changed |
|---|---|---|
| `node --test scripts/*.test.mjs` (+ linter tests) | 41/41 pass | Persian helpers, RTL scan, contrast, page audit (browser), bidi order (browser), security smoke |
| `templates/starter-lite` audited with `page-audit.mjs` (foreign hosts blocked, 320/360/768 px) | 0 errors, 0 warnings | The baseline the skill prescribes is achievable and passes its own gate |
| Deliberately broken page `scripts/fixtures/bad.html` | 15 errors, 8 warnings across all 16 automatable checks | The audit detects what it claims; also exposed 2 defects in the audit itself (a misleading `dir="null"` message and false positives on native checkbox/radio sizing), fixed |
| Bidi experiment (Chromium, 12 cases) | Confirmed: phone-number group reversal and stranded `+`, minus-sign placement, percent placement, `dir="auto"`, `Intl` negative formatting. **Not confirmed: 2 of the 6 hazard rows written from memory** (trailing English + punctuation, parentheses around Latin) | Rows removed; E-018 and a regression test added; rule "hazard claims need a reproduction" added |
| `Intl` experiments (Node 22) | Persian calendar/digits default, IRR formatting quirks, no DST from 2023 on (last DST summer 2022), ICU leap years = 33-year rule 1380–1450, Persian plural categories one/other (0 → one), `ListFormat('fa')` comma before «و» | E-010..E-017; `engineering.md` §1; one initial test of mine had an off-by-one that the data exposed |
| `lint-skill.mjs` first run | 4 errors + 5 warnings found | Real defects in content (undefined D-STACK reference, orphan evidence row, missing meta file) and in the linter (wrong date column, TODO false positive); all fixed |
| Security smoke on a weak vs hardened local server | Weak: 3 error classes + 5 warning classes detected; hardened: clean; SPA answering 200 everywhere: no false exposed-path findings | Security gate now has executable evidence |

## Run 1: scenario walk-throughs

### S1 Online shop "honey" (Standard)
Path: SKILL → triage (shop, Standard) → discovery questions → D-RENDER → D-STACK → D-AUTH → D-HOST → payments → Persian/Iran baseline.
- Determinate: profile; D-RENDER (public catalog, ≤ daily change, SEO critical → SSG/SSR + cache, dynamic checkout = hybrid); D-AUTH (guest checkout, optional phone OTP); D-DB (relational); payment verification pattern; money storage; Persian gate.
- **Gap 1**: no site-type guidance, so an agent re-derives the shop's templates, state machine, edge cases. → added `references/site-type-playbooks.md` (9 types).
- **Gap 2**: **no build-vs-adopt framework**, so the default was to build everything. → added D-BUILD (adopt / compose / build with knockouts).
- **Gap 3**: D-HOST listed options but no decision rule; two agents could choose opposite shapes. → added a rule block (RECOMMENDATION, marked as lacking field evidence).
- Open: tax/e-invoicing obligations (OQ-01); PSP specifics unverified (OQ-02).
- Correctly forced a **stop**: legal entity and PSP contract are hard-to-reverse items; an autonomous run must report rather than guess.

### S2 Law-firm / company site (Lite)
Path: triage (Lite) → spec page → starter-lite → tools → release floor.
- Determinate: profile, shape (static), trust content comes from the client's lawyer, no invented credentials (rule 10), release floor items.
- **Gap 4**: the process listed 11 documents; a 5-page site would drown. → Lite document set fixed at two files.
- Residual: starter has no font binary/logo/favicon; the agent must source a licensed font (E-015) and set up the contact-form endpoint (playbook 2).

### S3 SaaS invoicing dashboard (Heavy)
- Determinate: Heavy gates, modular monolith, authz matrix, audit log, queue for PDFs/emails, Jalali ranges, Excel BOM exports.
- **Not determinate (open)**: chart axis direction (OQ-04); recurring payments at Iranian PSPs (OQ-02); Persian PDF tooling (OQ-14); multi-tenant isolation patterns beyond "scope at the data layer" (OQ-14).
- Verdict: the skill supplies the *process and checks*; the *domain depth* for this type is M1.

### S4 Clinic booking (Standard)
- Determinate: health data → "regulated: lawyer first" stop; slot model with DB-level double-booking prevention; UTC + `Asia/Tehran`; holidays/weekend as configuration; SMS reminders with failure handling.
- Open: accessible Jalali date picker selection criteria (OQ-07), source of holiday data (OQ-15).

## Failure of the validation itself (self-criticism)

- Scenarios were walked by the same author who wrote the skill: bias risk. Mitigation: executable checks, and next runs must rotate scenarios (S5–S9) and try to *break* the guidance.
- No scenario has been executed end to end on a real project: module maturity stays M1/M2 until OQ-18.
- Persian copy examples have not been reviewed by a native editor (OQ-12).
