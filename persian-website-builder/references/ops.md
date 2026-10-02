# Deployment, observability, analytics, maintenance

Outputs: `docs/09-ops.md` (environments, pipeline, rollback, monitoring, measurement plan, maintenance calendar) + the launch checklist (`templates/launch-checklist.md`). Gates: **G5** (pre-production) and **G6** (30-day review).

## 1. Environments and configuration

`local` → `staging` (production-shaped: same build artifact, config shape, DB engine, sandbox PSP/SMS, separate secrets) → `production`. Config via environment/secret store, never in the repo or client bundle. Feature flags give kill-switches for risky features. **Build once, promote the same artifact** through environments.

## 2. CI/CD pipeline (shape; adapt to the tool)

1. Lint/format → typecheck → unit tests.
2. Build (reproducible from lockfile) → integration/API tests → migration test on a copy.
3. Security: dependency audit, secret scan, static analysis (`security.md` §9, §7).
4. UI: component visual check, accessibility automation, `rtl-smells.mjs`, performance budget check.
5. Deploy to staging → smoke E2E → (Standard/Heavy) manual approval.
6. Deploy to production (staged/canary for Heavy) → post-deploy smoke → watch dashboards.
Protected main branch, required reviews, CI secrets scoped (not exposed to untrusted PRs), deployment keys least-privilege.

## 3. Domain, DNS, TLS

- The **client owns** the domain and registrar account (2FA on); the agency/agent is a delegate. Expiry is a classic outage: auto-renew + calendar + alert.
- `.ir` domain conditions and registrar rules: **not verified here**: ask the registrar early; they can take calendar time.
- Choose one canonical host/scheme (S-1/§2 of `seo.md`); 301 the rest. Lower DNS TTL before cutover; keep old records until verified.
- Email-sending domains: SPF, DKIM, DMARC set and tested (deliverability varies by recipient provider: measure).
- HTTPS everywhere, automated renewal with expiry alerts, TLS 1.2+; HSTS/CSP per `security.md` §6.
- **Test name resolution and connection from Iranian networks and from outside**, with the real DNS provider and hosting (`iran-context.md` I-1/I-6, `architecture-decisions.md` D-HOST).

## 4. Database changes and rollback

Backup right before the deploy; migrations are expand → migrate → contract and forward-compatible with the previous app version; rollback plan is stated *before* deploy (previous artifact + reversible migration or restore). Prefer **roll forward** for small fixes with a flag kill-switch; **roll back** when data is not at risk and the fault is not understood. Rehearse rollback on staging; record time-to-rollback.

## 5. Launch checklist (G5 "go-live"): summarized; full list in `templates/launch-checklist.md`

Content final and approved (no placeholders: AP-007) · legal/trust pages real [E-025, E-026] · redirects/sitemap/robots · analytics events verified · backups restored once · monitors and alerts live and routed to a human · error pages (404/500/maintenance) · live-money test of a small real payment **and refund** · SMS/email delivery tested on real carriers/providers · TLS/DNS/headers verified · rollback rehearsed · launch window and owner on call · seasonal peaks considered (ask the client about Nowruz, Yalda and sales events; freeze risky deploys around them) · communication plan.

## 6. Observability

| Layer | What | Notes |
|---|---|---|
| Logs | Structured JSON, request id, central search, retention policy | No secrets/PII (`engineering.md` §2) |
| Errors | Front-end and back-end error tracking with release tagging and private source maps | Use a tool reachable from where it must report; self-host if foreign reachability is uncertain (I-2, E-023) |
| Uptime | Probes from **multiple vantage points, including inside Iran** if the audience is there | A global monitor can report "up" while domestic users cannot reach you |
| Synthetic journeys | Home → search → product → cart → payment redirect; login with OTP fake | Alert when a journey breaks |
| Resources | CPU, memory, disk, DB connections, queue depth, job failures, cert/domain expiry | |
| Business signals | Payment success rate, order creation rate, OTP delivery rate, SMS spend, search no-result rate | Anomalies page a human |
| Performance | RUM: LCP/INP/CLS by route/device (`performance.md`) | |

Alerts must be **actionable** (owner, runbook link, severity). Few, meaningful alerts beat many ignored ones. Define availability and error targets in the brief ("SLO-lite") so alerts have thresholds. Incident loop: detect → triage → mitigate → communicate → blameless post-mortem → backlog actions.

## 7. Analytics: measure decisions, not curiosity

**A metric without a decision is not defined.** The measurement plan (`docs/09-ops.md`) has one row per decision:

`Decision/question → metric (definition) → data source/event → owner → target/threshold → action if missed → review cadence`

| Family | Examples | Source of truth |
|---|---|---|
| Acquisition | Sessions by source/intent landing page | Analytics + Search Console |
| Conversion | Orders, leads, sign-ups, completion rate of the primary journey | **Backend DB** (analytics undercounts) |
| Funnel | Step-to-step drop-off in checkout/forms | Events + DB |
| Engagement | Key content interactions, scroll/read on cornerstone pages | Events |
| Search | Queries, no-result rate, refinements | Site search logs |
| Forms | Start → submit rate; field-level errors | Events |
| Quality | JS error rate, 5xx, payment failures, p75 CWV | Error tracking + RUM |
| Business | Revenue, AOV, refund/return rate | DB |

Rules: define events with a naming convention and minimal properties; **no PII** in events; reconcile analytics with the DB regularly (ad-blockers and blocked hosts distort counts); prefer first-party/self-hosted collection where foreign endpoints may be unreachable (I-2) and keep any foreign tag off the critical path; personal-data/consent obligations for Iran are **unverified**: record the assumption and minimize collection. Experiments: hypothesis, one primary metric, guardrail metric, pre-set duration/sample, no peeking, decision recorded.

## 8. Maintenance calendar (create at launch, assign owners)

| Task | Frequency | Evidence |
|---|---|---|
| Dependency updates (automated PRs + tests); security patches (critical: target within days) | Weekly / on advisory | Merged PRs, audit report |
| OS/runtime/DB patching | Monthly / per advisory | Change log |
| Backup **restore drill** | Quarterly | Drill record with time-to-restore |
| Security review of auth/payment/admin changes; access review (remove stale accounts) | Quarterly / on change | Review notes |
| Performance review of RUM and budgets | Monthly | Dashboard snapshot |
| Broken-link and crawl check | Monthly | Crawl report |
| Content review (prices, policies, stale pages, FAQs) | Monthly–quarterly | Content owner sign-off |
| Holiday/calendar data update (Jalali + lunar-based holidays) | Yearly | Data PR |
| Domain/TLS/vendor renewals | Calendar + alerts | Renewal records |
| Re-verify volatile ADR evidence (frameworks, PSP/SMS docs, law-dependent text, redenomination status [E-024]) | Every 6 months | ADR updates |
| Regression test run on the full suite | Before every release | CI log |
| Exit plan check (data export works, vendor contacts) | Yearly | Test export |

## 9. G5 (pre-production), assembled from module gates

Security (G-SEC) · Performance (G-PERF) · Accessibility (G-A11Y) · SEO (G-SEO) · Testing (G-TEST) · Persian correctness (G-FA) · Ops readiness (this file §2–§6, §8) · Backup restored once · Rollback rehearsed · Launch checklist complete. Details and pass criteria: `quality-gates.md`.

## 10. G6 (30-day review)

Compare the primary metric and guardrails with the targets; review RUM p75, error/incident log, support questions, search no-results, abandoned funnels; update the backlog, assumptions register and the skill feedback notes (`meta/`): what in the process was missing or wrong.
