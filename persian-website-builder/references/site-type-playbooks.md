# Site-type playbooks

Use after triage (`discovery.md` §1) to avoid re-deriving what each kind of site usually needs. These are **starting hypotheses**: confirm each against the brief. Each playbook lists: primary journey · templates · data and integrations · Persian/Iran specifics · default shape · what usually goes wrong (IDs from `failure-modes.md`, `testing-edge-cases.md`) · metrics. Types are combinable (a shop with a blog = shop + blog).

## 1. Online shop (usually Standard)
- **Journey**: land (search/category) → product → cart → address + shipping → payment (gateway redirect) → confirmation → tracking/returns.
- **Templates**: home, category (filters, sort), product (variants, stock, price, delivery estimate), cart, checkout steps, payment result (success/fail/cancel), order status, optional account, search, policies, 404.
- **Data/integrations**: order state machine (created → pending_payment → paid → processing → shipped → delivered → canceled/refunded); stock with atomic decrement; money as integer + denomination; province/city IDs; shipping rules; coupons; PSP (`iran-context.md` I-4); SMS (order notices, optional OTP); carriers; accountant questions on invoicing (I-7).
- **Persian/Iran**: unit word on every price (I-3); search normalization + synonyms; Persian slugs decision S-1; withdrawal right and supplier information (E-025); Enamad (E-026); delivery promises using a configurable holiday calendar; guest checkout (phone-OTP optional).
- **Default shape**: hybrid; SSG/SSR + cache for catalog, dynamic cart/checkout; relational DB; hosted gateway.
- **Failure modes**: FM-021, FM-022, FM-023, FM-024, FM-032, FM-050. **Edge cases**: EC-070…076, EC-080, EC-081, EC-072.
- **Metrics**: step conversion, payment success rate, cart abandonment reasons, refund/return rate (guardrail), search no-results rate.

## 2. Company / brochure site (Lite)
- **Journey**: land → understand the offer → trust → contact.
- **Templates**: home, services, about (real people/entity), contact, optional case studies, policies if needed. Start from `templates/starter-lite/`.
- **Data/integrations**: contact form → server endpoint that stores and notifies (SMS/email/chat), spam defense (honeypot + rate limit; no foreign CAPTCHA on the critical path), no accounts, no DB unless submissions must be kept.
- **Persian/Iran**: typography quality is the product; real contact channels and hours; local business info consistency.
- **Default shape**: static pages + CDN/host reachable from the audience (D-HOST).
- **Failure modes**: FM-003, FM-040, AP-007, AP-028. **Edge cases**: EC-021, EC-022, EC-092.
- **Metrics**: qualified contact submissions; spam rate (guardrail).

## 3. Services / lead generation (Lite→Standard)
- **Journey**: search intent → service page → proof → quote/call/booking.
- **Templates**: one page per distinct intent (avoid cannibalization), pricing/quote form (multi-step if long), proof (real testimonials/cases), FAQ from real questions, contact.
- **Data/integrations**: lead store + notification; call-tracking via `tel:` links; messaging channels the audience actually uses (verify reachability).
- **Persian/Iran**: local-intent pages only with genuinely distinct content; mobile-first (calls); consent text for contact use.
- **Failure modes**: FM-043 (thin location pages), FM-044, FM-007. **Edge cases**: EC-020, EC-022.
- **Metrics**: leads and lead quality, call clicks, form completion.

## 4. SaaS (Standard→Heavy)
- **Journey**: discover → sign up (OTP/email) → onboarding → activation → pay → retain.
- **Templates**: marketing (static), pricing, docs, app shell, billing, settings, team/roles, status page.
- **Data/integrations**: tenants/roles/permissions, audit log, billing (recurring support at the PSP is **unverified**: I-7), invoices as PDFs with Persian shaping, exports.
- **Persian/Iran**: Jalali date-range pickers, Saturday-first; chart axis direction is unresolved (`persian-ux.md` §1); Excel exports (UTF-8 BOM, digit script decision); Persian numerals in tables; vendor reachability for the app's critical dependencies (I-2).
- **Default shape**: static marketing + SPA/app; modular monolith; relational DB; queue for emails/SMS/invoices.
- **Failure modes**: FM-021, FM-030, FM-031, FM-035, FM-070. **Edge cases**: EC-030…034, EC-050…055, EC-067, EC-011.
- **Metrics**: activation, retention/churn, time-to-value, support tickets per active account (guardrail).

## 5. Marketplace (Heavy)
- **Journey**: buyer: search → compare → buy; seller: onboard → list → fulfil → get paid; admin: moderate → resolve disputes.
- **Templates**: all of shop + seller dashboard, seller profile/storefront, messaging, disputes, admin console.
- **Data/integrations**: seller verification, commissions, payouts (Sheba), escrow-like flows. **Holding or splitting customers' money may carry licensing or PSP-contract requirements that are unverified here: obtain them from the client's lawyer and the PSP before designing payouts.**
- **Persian/Iran**: user-generated content with mixed direction (`dir="auto"`), lookalike identities (`security.md` §12), moderation of Persian text, seller-supplied prices/units validated.
- **Default shape**: modular monolith, strong authorization model, search engine likely needed, audit trail.
- **Failure modes**: FM-022 (highest), FM-030, FM-031, FM-032, FM-021. **Edge cases**: EC-061, EC-066, EC-080…082, EC-091.
- **Metrics**: liquidity (searches that lead to contact/purchase), dispute rate, seller activation, fraud rate.

## 6. Blog / media (Lite→Standard)
- **Journey**: search/social → read → subscribe/return.
- **Templates**: article, category/tag (indexation policy), author, search, archive, newsletter.
- **Data/integrations**: CMS (D-CMS), RSS, comment moderation (spam, UGC), structured data `Article` with ISO dates.
- **Persian/Iran**: reading typography (measure, leading: `persian-ux.md` §2), Jalali display + ISO in markup, image/font licensing, media/news licensing requirements **unverified** (ask), ad/third-party scripts are the usual performance killer (I-2, `performance.md`).
- **Default shape**: SSG/SSR with caching; CMS or Markdown-in-Git.
- **Failure modes**: FM-043, FM-041, FM-051, FM-052. **Edge cases**: EC-012, EC-013, EC-091.
- **Metrics**: returning readers, read depth, subscriptions, CWV p75 (guardrail).

## 7. Education / courses (Standard)
- **Journey**: discover → preview → pay → learn → progress → certificate.
- **Templates**: course catalog, course page, lesson player, quiz, progress, certificate, instructor profile.
- **Data/integrations**: video hosting/delivery (**foreign video embeds may be unreachable: choose delivery per D-HOST and test with foreign hosts blocked**), captions/transcripts (RTL WebVTT), progress tracking, certificates as Persian PDFs, payments and refunds.
- **Persian/Iran**: caption direction and font, schedule display in Jalali for live sessions, low-bandwidth modes (adaptive bitrate, audio-only).
- **Default shape**: hybrid; relational DB; background jobs for media/certificates.
- **Failure modes**: FM-051, FM-070, FM-013 (captions). **Edge cases**: EC-004, EC-005, EC-067.
- **Metrics**: completion rate, activation (first lesson), refund rate (guardrail).

## 8. Dashboard / internal tool (Standard→Heavy)
- **Journey**: log in → find data → act → export.
- **Templates**: login, overview, data tables with filters/saved views, detail, forms, admin/roles, audit log.
- **Data/integrations**: authz model first, audit, exports, large datasets with pagination.
- **Persian/Iran**: RTL data tables (first column right), Persian/Latin digit policy in tables, Jalali ranges, keyboard efficiency, Excel export encoding; charts direction unresolved.
- **Default shape**: SPA behind auth; static login/landing; relational DB; MFA.
- **Failure modes**: FM-030, FM-035, FM-064. **Edge cases**: EC-011, EC-030…034, EC-053, EC-067.
- **Metrics**: task time, error rate, adoption by role.

## 9. Booking / reservation (Standard)
- **Journey**: choose service → pick slot (Jalali calendar) → confirm (OTP) → reminder → attend/cancel/reschedule.
- **Templates**: service list, availability picker, confirmation, my bookings, provider/admin calendar, policies.
- **Data/integrations**: slot model (durations, buffers, capacity), time stored UTC and rendered in `Asia/Tehran` (E-013), working days/holidays as configuration, **double-booking prevention by DB constraint/atomic hold**, SMS reminders, optional deposit payment, cancellation windows, no-show handling. Health or other regulated data: requirements from the client's lawyer.
- **Persian/Iran**: accessible Jalali picker (keyboard, Saturday-first), Friday weekend and Thursday rules are client configuration, Nowruz/holiday closures, phone-OTP identity.
- **Default shape**: server-rendered pages + small interactive picker; relational DB with exclusion/unique constraints; queue for reminders.
- **Failure modes**: FM-031, FM-065, FM-012. **Edge cases**: EC-050…055, EC-080, EC-007, EC-021.
- **Metrics**: booking completion rate, no-show rate, reminder delivery rate.

## 10. Using a playbook

0. For commodity types (shop, blog, booking, courses) run **D-BUILD** first: adopting a maintained engine is often the right default.
1. Pick the type(s); copy its templates and edge cases into `03-scope.md` and `08-test-plan.md`. 2. Challenge every line against the brief: delete what the client does not need (AP-003). 3. Add what the playbook missed to `meta/OPEN-QUESTIONS.md` of the skill's repository so the next cycle improves it.
