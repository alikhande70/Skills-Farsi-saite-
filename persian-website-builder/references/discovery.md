# Discovery module

Goal: turn "make me a Persian website" into a **brief that can be wrong in known ways**. Output: `docs/01-brief.md` (template: `templates/project-brief.md`) + assumptions & risk register. Gate: **G0**.

## 1. Triage first (decides how much process you run)

**Type** (pick the closest; mixed types → name the primary journey): brochure/company · services/lead-gen · online shop · marketplace · blog/media · education/courses · SaaS/app marketing + app · dashboard/internal tool · booking/reservation · directory/listing · community.

**Profile** by the highest-scoring row (proportionality rule: do not run Heavy process on a Lite site):

| Signal | Lite | Standard | Heavy |
|---|---|---|---|
| Pages/templates | ≤ 10 pages, ≤ 3 templates | 10–200 pages, ≤ 10 templates | many templates / generated pages |
| Users with accounts | none | one role | multiple roles / orgs / permissions |
| Money or sensitive data | none | payments via hosted gateway, basic PII | stored payments, marketplace payouts, regulated data |
| Integrations | form → email/SMS | 1–3 | many, or core business system |
| Editors | 1 person, rare edits | few, weekly | many, workflows/approvals |
| Availability need | "mostly up" | business hours matter | revenue-critical |

Profile → required artifacts and gate strictness are in `quality-gates.md`. Lite may merge brief+scope+IA into one page, but may **not** skip G-FA (Persian), accessibility basics, security basics, or the launch checklist.
**Lite document set (exactly two files):** `docs/spec.md` (≤ 2 pages: outcome, audience, pages + content owners, stack decision with date-stamped evidence, assumptions, top risks) and `docs/gates/G5.md`. Any additional document must name the decision it changes.

## 2. The 12 questions every brief must answer

For each: ask. If the answer is unavailable, write the **default assumption, its risk, and how you will detect that it is wrong** (assumptions register).

1. **Outcome**: what changes in the business if the site works? One primary outcome with a number or a decision it enables (not "brand presence").
2. **Audience segments & context**: who, where (Iran / diaspora), device (mobile share), network quality, digital literacy, language/dialect, accessibility needs, time pressure. Max 3 segments; rank them.
3. **Offer & model**: what is sold/promised, price structure, how the money flows, margins that constrain shipping/returns.
4. **Primary journey**: the one path that must be excellent (e.g. find → compare → pay; read → subscribe; discover → call). Write it as steps.
5. **Content**: who writes, who approves, what exists today, when it will be ready, who maintains it after launch. *Content readiness is the most common cause of delay and fake data at launch.*
6. **Functional scope**: features as user stories; MVP vs later (see `product-ia.md`).
7. **Non-functional targets** with numbers where possible: performance (E-001 targets on a throttled mobile profile), accessibility (WCAG 2.2 AA [E-002]), availability, security level, SEO goals, browser/device matrix, languages.
8. **Constraints**: budget, deadline, team skills, existing systems/brand assets, hosting and vendor restrictions (Iran: `iran-context.md` §0), legal entity.
9. **Existing evidence**: analytics, search queries, support logs, sales calls, competitor knowledge, prior failed attempts.
10. **Success metrics**: 1 primary, ≤ 3 secondary, ≥ 1 guardrail (e.g. conversion up, but refund rate/page weight not worse). Each metric: definition, source, owner, review date (see `ops.md`).
11. **Risks**: top 5 with probability, impact, early signal, mitigation.
12. **Out of scope**: explicit list. This is the first anti-feature-creep device.

## 3. Assumptions: classify, then verify the dangerous ones first

Assumption register columns: `ID · assumption · category (money/legal/security/identity/content/users/tech/other) · P(wrong) · cost if wrong · how to verify · deadline · status`.
Priority = P(wrong) × cost. Verify the top three **before** UI work starts (G0).

**Never proceed on an unverified assumption in:** payments & money units, legal obligations, identity/verification, hosting reachability, data you must not store, licenses (fonts, images, code), and claims the site will make about the business (prices, guarantees, certifications).

## 4. Interactive vs non-interactive operation

- **Can ask the user**: batch all blocking questions in one message, ordered by cost-of-being-wrong; give a recommended default with each.
- **Cannot ask** (autonomous run): proceed with documented defaults for *reversible* choices (palette, typography, layout details, copy tone). **Stop and report** instead of guessing for *hard-to-reverse* choices: legal entity/business info shown publicly, payment provider/contract, regulated-data handling, domain/hosting purchase, anything that sends messages to real people or spends money.

## 5. Requirements that can be tested

- Story: `As a <segment> I want <capability> so that <outcome>`.
- Acceptance: `Given <state> When <action> Then <observable result>`; include at least one error and one empty/edge case per story.
- NFR example: "LCP ≤ 2.5 s at p75 on the checkout page, measured in the field after launch and in lab on throttled mobile" [E-001]. A requirement without a way to check it is a wish.

## 6. G0: Discovery gate (all must be true)

- [ ] Primary outcome stated with a number/decision; primary journey written as steps.
- [ ] Profile (Lite/Standard/Heavy) chosen with reasons.
- [ ] Top 3 assumptions by priority verified or explicitly accepted by the owner (name + date).
- [ ] Money/legal/identity/hosting questions answered or marked "blocked: needs client".
- [ ] Out-of-scope list exists. MVP boundary exists.
- [ ] Content plan: who provides what by when; placeholder content policy ("no lorem ipsum or fake data in production": see AP-007).
- [ ] Metrics have owners.

## 7. Failure modes here (see `failure-modes.md`)

FM-001 building before the outcome is defined · FM-002 the stakeholder's taste replaces user evidence · FM-003 unowned content · FM-004 assumed payment/hosting feasibility · FM-005 scope growth by "small additions".

## 8. Mini example (shape, not a template to copy)

Request: «یک سایت برای فروش عسل طبیعی». Triage: online shop, Standard (single role, hosted gateway). Questions that change the design: Who buys (gifting vs. household)? Is the product perishable/seasonal (stock model)? Shipping methods and where to (province rules)? Does the business have a legal entity and an Enamad path [E-026]? How does trust get built (lab test results, beekeeper story, return policy [E-025])? What is the primary journey (landing from search → product → pay in ≤ 4 steps on mobile)? Out of scope for MVP: accounts, wishlists, blog, discount engine → listed with revisit triggers.
