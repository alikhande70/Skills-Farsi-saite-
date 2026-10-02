# Architecture and decision frameworks

Output: `docs/07-architecture.md` + one ADR per significant decision (`templates/adr.md`). Gate: **G4**: no implementation of the core before it passes.

## 0. Rules for deciding

1. **Decide from the brief, not from taste.** Each framework below lists inputs taken from `01-brief.md`. If an input is unknown, that is a discovery gap, not a license to guess.
2. **Set criteria and weights before scoring options.** Scoring after choosing is rationalization.
3. **Boring by default.** Prefer well-supported technology the team can operate. At most **one** unproven or unfamiliar technology per project, and only where it removes a real risk.
4. **Complexity budget.** Every additional service, queue, cache, framework layer or dependency must name the requirement it serves. No requirement → no component.
5. **Verify volatile facts at decision time** (versions, support status, licensing, Persian/RTL support, registry/vendor reachability from the team and from Iran [E-023]) and write the date in the ADR. Never copy "current version" numbers from memory; this skill intentionally stores none.
6. **Every decision has a "change your mind when…" trigger.**
7. Reversible choices: decide fast. Hard-to-reverse choices (data model, hosting provider contract, auth provider, URL structure, payment provider, i18n approach): decide with evidence and record.

## 1. Default shapes by profile (starting hypotheses, not mandates)

| Profile | Starting shape |
|---|---|
| Lite | Static pages (SSG or plain HTML/CSS), self-hosted fonts, a form endpoint (SMS/email/DB), static hosting/CDN, no database, no accounts |
| Standard | Hybrid: static/SSR for public pages, a relational DB or a CMS for content/products, hosted payment gateway, auth only if user data exists, CI/CD with a staging environment |
| Heavy | Modular monolith (clear module boundaries) + relational DB + cache + background jobs + search engine as needed, observability, staged releases, load and failure testing |

Split into separate services only for an observed reason: independent scaling, different team ownership, different security boundary, or a different runtime need.

## 2. D-RENDER: static, SSG, SSR, SPA or hybrid?

Inputs: how often content changes · per-user personalization · SEO importance · interactivity level · traffic & cacheability · hosting runtime available (esp. domestic hosting) · team skills.

| Situation | Choose |
|---|---|
| Public, same for everyone, changes ≤ daily | **Static/SSG** (rebuild or on-demand revalidation) |
| Public, large catalog or frequent changes, SEO-critical | **SSG + on-demand revalidation**, or **SSR with caching**. Indexable content must be in the first HTML response (BEST PRACTICE: don't depend on client rendering for what you need indexed) |
| Logged-in, per-user, no SEO need (dashboard, tool) | **SPA** is fine; keep the public marketing pages static |
| Mixed (shop with account area, interactive widgets) | **Hybrid**: server-rendered HTML + islands/client components only where interaction needs them |
| Unsure | Server-rendered HTML with progressive enhancement and minimal JS |

Check: runtime needed for SSR exists in the chosen hosting (D-HOST); cache strategy defined (what is cached, for how long, how purged); p75 TTFB target (`performance.md`). **Change your mind when** TTFB or cache-hit ratio misses target after tuning, or build time blocks content updates.

## 3. D-BUILD: build custom, adopt an existing platform, or compose?

Decide this **before** choosing a framework. Commodity capabilities (catalog + cart + checkout, CMS, blog, booking engine, LMS, forum) are usually cheaper, safer and faster to adopt than to build; custom code pays only where it creates differentiation or where no option meets a Must.

Inputs: differentiation (what must be unique?) · time and budget · team skills · required Persian/RTL quality · availability of the needed payment/SMS/shipping integrations for Iran · data ownership and export · hosting/reachability constraints · lock-in and exit cost · maintenance burden.

| Situation | Choose |
|---|---|
| The need is a commodity and a candidate meets all Musts (incl. Persian/RTL, Iranian PSP, export) | **Adopt** a maintained platform/engine (self-hosted or SaaS) and customize the theme/plugins |
| Commodity core + one differentiating feature | **Compose**: adopt the core, build only the differentiator behind a clear boundary |
| Core workflow is the product (unique pricing, matching, scheduling, marketplace logic) | **Build** that core; adopt everything around it |
| No candidate passes the knockouts | **Build**, smallest scope first |

**Knockouts** for any adopt/compose candidate: unacceptable license or ToS; unreachable or unusable for the team or audience [E-023]; no workable Persian/RTL (run the RTL smoke test, see D-STACK); no integration path for the required payment/SMS provider; no data export; abandoned or no security-update policy.
Evidence to record in the ADR: candidate list (≥ 3 incl. "build"), knockout results, a ≤ 2 h spike on the riskiest Must, 12-month total cost, exit plan. **Change your mind when** the customization effort exceeds ~half of the custom estimate, or upgrades keep breaking customizations.

## 4. D-FRAMEWORK / D-STACK: which technology?

First: **do you need a framework?** Plain HTML/CSS + a little JS for ≤ ~10 pages with little interaction; a static-site generator for content-led sites; an application framework when you need routing + data fetching + auth + complex client state.

Then score candidates (weights set first, sum 100, adjust to the brief; example default weights):

| Criterion | Weight | Evidence to collect |
|---|---|---|
| Fit to requirements (rendering, forms, auth, i18n/RTL, SEO) | 25 | Prototype the riskiest requirement (spike ≤ 2 h) |
| Team skill & hiring in the client's market | 20 | Who maintains it in 2 years? |
| Maintenance health & security record | 15 | Release cadence, open critical advisories, support/LTS policy, license |
| Ecosystem for needed parts (payment SDK/PSP, Jalali date, RTL UI, search) | 10 | Does the PSP/SMS provider have a library or only REST docs? |
| Performance (JS shipped, TTFB, build) | 10 | Measure a spike page on throttled mobile |
| Hosting compatibility incl. domestic hosting & reachability of registries/CDNs | 10 | Install and deploy from the real environment [E-023] |
| Cost (hosting, licenses, people) | 5 | Rough 12-month TCO |
| Persian/RTL support (UI components, i18n, fonts, tests) | 5 | RTL smoke test [`rtl-smells`] |

Reject a candidate that fails a **knockout**: license conflict, unmaintained, cannot be deployed/operated in the required environment, cannot meet a Must requirement, **or a UI/component library whose core components fail the RTL smoke test** (run `scripts/rtl-smells.mjs` on its source or `scripts/page-audit.mjs` on its demo/catalog, and test a date picker, select, modal and table in RTL). A 5% weight must never let a poor-RTL kit win. Popularity alone is not evidence.

## 5. D-CMS: custom code, CMS, or Markdown-in-Git?

| Who edits, how often | Choose |
|---|---|
| Developers only, rarely | Markdown/data files in Git |
| Non-developers, regularly, simple pages | Headless or traditional CMS (self-hosted if reachability/data location matters) |
| Non-developers, workflows/roles/preview/scheduling | CMS with roles + preview, or a custom admin on a relational DB |
| Content is application data (products, orders) | DB + a custom admin (or admin framework) |

Check the editor experience with real Persian text: RTL editing, ZWNJ entry, Jalali date fields, pasted Word text, image alt prompts. Reject CMS plugins that load foreign runtime assets for core flows (I-2).

## 6. D-AUTH: do we need accounts?

Need accounts only if there is per-user state the user returns for (orders history, saved data, paid content, roles). Otherwise: no accounts (guest checkout, magic links).
Options: none · email magic link · SMS OTP (common in Iran; see `iran-context.md` I-5) · password (+ optional OTP/2FA) · social login (check reachability and policy first) · SSO.
Never build cryptographic or session primitives by hand. Use a maintained library/service, and satisfy `security.md` §2. **Change your mind when** support tickets show login friction or SMS cost/abuse exceeds budget.

## 7. D-DB: which database?

Default **relational** (transactions, constraints, joins, mature tooling) for orders, users, payments, bookings, inventory. Document store only for genuinely flexible, aggregate-shaped data with weak relations. Dedicated search engine only when DB search fails the Persian acceptance table (`persian-ux.md` §6). Cache (in-memory) only after measuring. **No database** for static sites. SQLite-class embedded DB can be right for small single-node apps if backup/restore is tested.
Persian needs: UTF-8 everywhere; collation/sorting for Persian; store normalized search keys alongside display values; store money as integer + currency + denomination [I-3]; store time as UTC; national code and phone as **strings**.

## 8. D-HOST: where and how to host?

Inputs (from the brief and `iran-context.md`): user location · tolerance to international outages [E-020/E-021] · payment and SMS providers' reachability · team's ability to access vendors [E-023] · latency · data-protection stance · budget and currency of payment · need for managed services.

| Option | Good for | Watch for |
|---|---|---|
| Domestic hosting only | Iranian audience; domestic payment/SMS; outage resilience | Vendor quality/DDoS capacity, tooling limits, can't use many foreign managed services |
| Foreign hosting only | Diaspora/global audience; managed ecosystem | Reachability and speed for domestic users, vendor sanctions risk, payments in foreign currency [E-023] |
| **Split** (static/edge in one place, transactional core in another) | Mixed audiences | Complexity; keep one source of truth; test both reachability modes (I-2 test) |
| Active–passive across both | High availability needs | Cost; data sync; failover rehearsals |

**Decision rule (RECOMMENDATION, no field evidence yet; revisit with real data):**
1. Audience almost entirely inside Iran **and** payment/SMS providers are domestic → default to **domestic hosting** (or a split whose transactional core is domestic); foreign hosting only with a written reason and the I-2 test passing.
2. Audience mostly outside Iran or the business is paid in foreign currency → **foreign hosting**; verify that Iranian visitors, if any matter, can still reach it.
3. Mixed audience → **split**: public/static content reachable from both sides, transactional core placed where its payment/SMS providers live; one source of truth for data.
4. Outage tolerance "must work during international outages" → domestic transactional core is mandatory (E-020/E-021 context), with no foreign runtime dependencies (I-2).
5. If a required vendor is unavailable to the team (E-023) → choose the lawful alternative first; do not design around terms you cannot comply with.
If inputs are unknown, stop: this is a G0 gap, not a guess.

Always: backups in a *different failure domain*; DNS and domain registrar controlled by the client; documented exit plan; reachability test **from Iran and from outside** before committing. Pricing/speed claims about domestic hosting need evidence labels (E-022 is ASSUMPTION).

## 9. D-API: how do client and server talk?

No API if the framework's server-rendering/data layer suffices. REST/JSON with an OpenAPI description by default for public or multi-client APIs. GraphQL only with multiple clients with divergent data needs **and** a team that can operate it (query cost limits, authorization per field). RPC-style internal calls inside a monolith are fine. Every API: versioning policy, pagination, idempotency for unsafe operations, error format, auth, rate limits (`engineering.md`).

## 10. D-I18N: Persian-only or bilingual?

Decide at G0; retrofitting is expensive. If bilingual: URL strategy (`/fa/…`, `/en/…` or domains), `hreflang` pairs and `lang`/`dir` per document, translation keys and review workflow, direction-aware components, content parity rules (what happens when a page exists in only one language), fonts for both scripts, per-language metadata and sitemaps. If Persian-only: still keep user-visible strings out of code (one file/table) to preserve the option.

## 11. D-SEARCH: DB query or engine?

Start with DB queries + normalized key columns when < ~ thousands of records and the Persian acceptance table passes. Move to an engine when it fails (ranking, typo tolerance, inflection, facets) or latency exceeds budget. Verify the engine's **current** Persian support before choosing and record the date (`persian-ux.md` §6).

## 12. Architecture document (G4 content)

1. Context: users, systems, trust boundaries. 2. Containers/modules and responsibilities. 3. Key flows (primary journey, payment, auth, content publishing) as sequence diagrams (text/Mermaid is fine). 4. Data model summary + constraints. 5. NFR mapping: each NFR → mechanism → how it is verified. 6. Environments & deployment topology. 7. Security overview (assets, threats, controls → `security.md`). 8. Risks and open decisions. 9. ADR index.

## 13. G4: Architecture gate

- [ ] Every Must requirement maps to a component; every component maps to a requirement.
- [ ] ADRs exist for build-vs-adopt, rendering, stack, hosting, data, auth, i18n, payments (as applicable), each with date-stamped evidence and a "change if" trigger.
- [ ] Reachability and install/deploy tested from the real environments (team, CI, Iran, outside Iran).
- [ ] The riskiest requirement was proven by a spike.
- [ ] Complexity review: nothing included "for later".
