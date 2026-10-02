# Launch checklist (G5 go-live)

Each line needs **evidence** (link, command output, screenshot, signed note). Mark N/A with a reason. Release floor items are marked ★ and cannot be waived by the agent.
Project: ____ · Date: ____ · Build/commit: ____ · Launch owner: ____ · Rollback owner: ____

## Content, legal, trust
- [ ] ★ No placeholder/fake content anywhere (scan for lorem, `example.com`, `0912 000 0000`, TODO) · evidence:
- [ ] ★ Business information, contact channels, policies (privacy, terms, shipping, returns/withdrawal) are real and reviewed by the client/lawyer (E-025) ·
- [ ] Enamad (or required license) issued and linked to its verification page, if applicable (E-026) ·
- [ ] AI-drafted Persian copy reviewed by a native editor (legal/medical/financial/brand-critical text first) ·

## Persian correctness (G-FA)
- [ ] ★ `lang="fa" dir="rtl"`; `rtl-smells.mjs` verdict PASS or CONDITIONAL with every warning resolved or justified; `page-audit.mjs` (foreign hosts blocked) verdict PASS on every template, or its listed limits accepted by a named owner ·
- [ ] ★ Digits (3 scripts), phone, national code, name, ی/ک and ZWNJ checks pass in every form ·
- [ ] Search acceptance table passes · Dates/time (Jalali, UTC storage, Saturday week) · Money formatter and units ·
- [ ] PDFs/emails/SMS/CSV with real Persian content inspected ·

## Security (G-SEC)
- [ ] ★ HTTPS, security headers verified; CSP enforced (or report-only with zero own violations) ·
- [ ] ★ Authorization matrix test, injection/SSRF/CSRF suites · `security-smoke.mjs` verdict PASS on the HTTPS staging URL (not CONDITIONAL/INCOMPLETE) ·
- [ ] ★ Secrets scan clean; no secrets in client bundle; dependency audit reviewed ·
- [ ] Admin MFA on; admin not publicly exposed; debug off; no exposed `.git`/`.env`/backups ·
- [ ] Rate limits and SMS/email spend caps tested; alerts route to a human ·

## Payments (if any)
- [ ] ★ Sandbox: success, cancel, timeout, double callback, tampered amount, replay · amount unit confirmed (EC-070..074)
- [ ] ★ Live test: a small real payment **and refund** completed · reconciliation job running ·
- [ ] PSP onboarding/contract complete; callback URLs set for production ·

## Accessibility (G-A11Y)
- [ ] ★ Keyboard pass and labels/contrast/focus on primary journey · automated scan clean · screen-reader smoke done ·
- [ ] Known gaps listed in the public statement (if published) ·

## Performance (G-PERF)
- [ ] ★ LCP/INP/CLS lab results on the mobile profile for key templates · budgets enforced in CI ·
- [ ] RUM endpoint live (own endpoint) · caching tested (first, repeat, after deploy) ·
- [ ] ★ Domestic-only test: foreign hosts blocked, critical journeys still complete (I-2) ·

## SEO (G-SEO)
- [ ] ★ Production is indexable; staging `noindex`/auth NOT carried over (AP-028); robots.txt correct ·
- [ ] Canonical/sitemap/redirect map verified by crawl · structured data valid · webmaster tools verified ·

## Infrastructure and operations
- [ ] ★ Backups configured **and restore tested** (time-to-restore recorded) ·
- [ ] ★ Rollback plan rehearsed (time-to-rollback recorded) · migrations safe under traffic ·
- [ ] ★ Monitoring: uptime (incl. vantage point in Iran if relevant), synthetic journey, errors, business signals; alerts routed to a named human ·
- [ ] DNS/TLS/domain owned by client; auto-renew + expiry alerts; SPF/DKIM/DMARC for email ·
- [ ] Error pages (404/500/maintenance) · log retention and PII check ·
- [ ] Seasonal-peak review done (Nowruz/Yalda/sales events); deploy freeze dates agreed ·

## Launch and after
- [ ] Launch window, on-call owner, communication plan · analytics events verified against the DB ·
- [ ] Day 1: error/incident check · Day 7: funnel + RUM check · Day 30: G6 review scheduled ·
- [ ] Handoff package delivered (README, architecture, ADRs, assumptions, test reports, maintenance calendar, native-review list)

Waivers (named owner + expiry): ____
Decision: PASS / PASS WITH WAIVERS / FAIL
