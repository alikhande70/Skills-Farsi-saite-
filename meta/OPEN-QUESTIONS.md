# Open questions (prioritized)

Each item: what we do not know · which decision it affects · how to research it (prefer primary sources) · status.
Priority = (cost of being wrong) × (how often the skill relies on it). Close items by moving the answer into `persian-website-builder/references/evidence-register.md` (with date and source) and striking the item here.

## Ordering

The **next action** is chosen in `ROADMAP.md` (single source of truth), not here. Research items below are pulled in only when the current stage needs them (for example OQ-02 when the Foundry needs a payment-related resource, or OQ-01 when legal/trust content is written). Close an item by moving the answer into `persian-website-builder/references/evidence-register.md` (dated, sourced) and striking it here.

## High priority

| ID | Question | Decision affected | How to research | Status |
|---|---|---|---|---|
| OQ-01 | Iran legal baseline for online businesses: exact text of the e-commerce law articles (33–38, 69), consumer-protection law, Enamad rules per PSP, e-invoicing/tax obligations for sellers, data-protection status, licensing for media/health/finance/education | `iran-context.md` I-7, `ux-content.md` §7 trust content, launch checklist | Primary: law texts (Majlis research center / official gazette), Enamad official site, tax authority site. Ask-a-lawyer items stay "client's lawyer" | open |
| OQ-02 | See NEXT RESEARCH TARGET | I-3, I-4, EC-070..076 | PSP official docs | open |
| OQ-03 | Persian search: which engines the audience really uses (Google share in Iran, local engines), and Persian analyzer support in common search engines (OpenSearch/Elasticsearch `persian` analyzer, Meilisearch, Typesense, PostgreSQL full-text) | `persian-ux.md` §6, `seo.md` §1/§7, D-SEARCH | Engine docs (primary), StatCounter/Similarweb (S, estimates), tests with a 30-query Persian acceptance set | open |

## Medium priority

| ID | Question | Decision affected | How to research | Status |
|---|---|---|---|---|
| OQ-04 | Chart/time-axis direction for Persian audiences | `persian-ux.md` §1, playbooks 4 and 8 | Design-system bidirectionality guidance (Material, Fluent), Persian dashboard examples, 5-user test | open |
| OQ-05 | Persian speech support in NVDA/VoiceOver/TalkBack: digits, dates, prices, ezafe | `accessibility.md` §4 | Hands-on tests with real devices/voices; vendor docs | open |
| OQ-06 | Bidi results in WebKit and Firefox (E-018 is Chromium only) | `persian-ux.md` §1 | Run `scripts/bidi-order.mjs` with Playwright's other engines | open |
| OQ-07 | Jalali date libraries/pickers: selection criteria and whether ICU matches the official astronomical calendar beyond the 33-year rule (E-014) | `persian-ux.md` §4, playbooks 4, 9 | Official calendar publisher (Tehran University Geophysics Institute calendar), cross-check years 1404–1450; survey maintained libs (do not hardcode names) | open |
| OQ-08 | Currently supported structured-data types (HowTo status; FAQ) | `seo.md` §5, E-004 | Google structured-data gallery, Search Central blog | open |
| OQ-09 | Primary-source confirmation of the January 2026 shutdown (E-021) | I-1, evidence weight | Cloudflare Radar, NetBlocks, IODA reports | open |
| OQ-10 | Currency redenomination: official timeline, naming, ISO code (E-024) | I-3, `money` module | Central Bank of Iran announcements, official gazette | open |
| OQ-11 | Domestic hosting capabilities (managed DB, object storage, CDN, DDoS protection) and which foreign vendors are actually reachable/lawful for Iranian teams | D-HOST rule, E-022, E-023 | Provider docs, reachability tests from Iranian networks, vendor ToS | open |
| OQ-12 | Native-editor review of Persian style choices: ZWNJ rules, list conjunction style («سیب، پرتقال و موز» vs ICU «، و»), CTA wording, error-message patterns | `ux-content.md` §6, `engineering.md` §1 | A native Persian editor; the Academy's orthography guide | open |
| OQ-13 | Accessibility legal status in Iran; WCAG 3 draft status | `accessibility.md` intro, E-002 | W3C status pages; counsel | open |
| OQ-14 | Multi-tenant isolation patterns (row-level security etc.) and PDF generation with Persian shaping: tooling criteria | playbook 4, `security.md` §3, `persian-ux.md` §7 | Database docs; test with a real Persian invoice | open |
| OQ-15 | Source of official holiday data (Jalali + lunar-based) for booking/delivery logic | playbooks 1, 9; `ops.md` §8 | Official publisher; machine-readable dataset licences | open |

## Low priority / ideas

| ID | Idea | Status |
|---|---|---|
| OQ-16 | Persian font license survey (Vazirmatn, other popular families) with license-file evidence | open |
| OQ-17 | Script to verify that an npm/pip package exists and is plausible before install (AI package hallucination guard) | idea |
| OQ-18 | Real-project field test: deploy `templates/starter-lite` as a real site, record every friction point; upgrade module maturity to M3 where used | open |
| OQ-19 | Choose a license for the repository/skill (owner decision; not set) | owner |
| OQ-20 | Validate E-006-equivalents: re-check the Agent Skills spec and Claude Code skill docs for format changes each quarter (see DESIGN-DECISIONS D-004) | recurring |
| OQ-21 | Evidence for lab-throttling profile numbers used in `page-audit.mjs --throttle` against the project's real audience | open |
| OQ-22 | Calibrate performance budget starting numbers (EXPERIMENTAL in `performance.md` §2) with measurements from built examples | open |
| OQ-23 | Pin the CI actions (`actions/checkout`, `setup-node`, `upload-artifact`) by commit SHA instead of tag. Needs the SHAs from the actions' own repositories, which this session's repository scope does not allow reading | `.github/workflows/ci.yml` supply-chain risk | Read the release tags of each action from its repository (or from the owner), record SHA and date; update the workflow | open |
