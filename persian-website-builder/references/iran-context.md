# Iran context module

Use when the audience, payments, hosting or legal entity touch Iran. Read `evidence-register.md` labels first:
most statements here are **S-grade or ASSUMPTION**, because laws, vendors and connectivity change faster than any skill can track.
The agent's job is to turn this module into **questions asked, tests run and decisions recorded**, not into confident claims.

Stay technical and neutral. Describe constraints as engineering inputs; do not editorialize.

## 0. Questions to settle before design (ask the client; if non-interactive, record as ASSUMPTION)

1. Where are the users: inside Iran, diaspora, both? What share? (decides hosting, payment, language of fallbacks)
2. Is there a legal entity, and which? (needed for gateway, Enamad, policy pages)
3. Does the site take money, personal data, or national-ID/phone verification?
4. Which services must work if international traffic is unavailable? (name them: login, checkout, content reading)
5. Is the team inside Iran? (affects which vendors/package registries/CI the team can actually reach: test, don't assume) [E-023]
6. Regulated domain? (health, finance, education, news/media, children, medicines) → obtain the licensing/legal requirements **from the client's lawyer**, record them, do not infer.

## 1. Principles

**I-1 Connectivity is a design input.** Whole-country outages happened in June 2025 [E-020]; a longer one in Jan 2026 is reported but unverified [E-021]. Therefore:
- Define for each critical journey its *mode*: works on full internet / works with domestic-only reachability / unavailable (and shows a clear message).
- Test the "domestic-only" mode by blocking all non-origin and non-domestic hosts (see I-2 test).

**I-2 No critical flow may depend on a foreign third-party runtime service.** Fonts, scripts, analytics, captcha, maps, error tracking, auth, SMS, email-sending, payment, and CDNs are all in scope.
- Self-host fonts (Vazirmatn or chosen font, license checked [E-015]), bundle JS/CSS, vendor icons.
- Non-critical enhancements (e.g. a foreign analytics script) may exist only if they load `async`, never block render/interaction, and fail silently.
- **Test (mandatory before launch):** block every host except your own origin and the domestic services you chose → the critical journeys still complete, no console-error loops, no layout shift from missing assets. `scripts/rtl-smells.mjs` flags the obvious URLs (IRN001–IRN003) but not dynamic loads.
- Reachability *from Iran* of any vendor must be tested from an Iranian network, not assumed; reachability *from the dev/CI location* matters too [E-023].

**I-3 Money is a versioned unit, not a number.** Iran approved removing four zeros from the rial; transition up to 3 years; the name and ISO code of the new unit are not settled in the sources found [E-024]. Colloquial "تومان" (= rial ÷ 10 today) can become **ambiguous**.
- Store integer amounts + `currency` + `denomination` (e.g. `IRR`, `v1`) in one column set. No floats.
- One `money` module is the only place that converts or formats (see `scripts/persian-utils.mjs: formatMoney`). Never write `/10` or `*10` in components.
- Always show the unit word next to a price. Do not rely on "everyone knows it's toman".
- Each PSP states its own amount unit: read it from the docs, write it into the ADR, and test with a sandbox amount [E-027]. A 10× unit error is the classic payments bug.
- Keep a `docs/decisions/money-redenomination.md` note: current assumption, trigger to revisit (Central Bank announcement), migration plan (data job + feature flag).

**I-4 Payments: the server decides.** Pattern [E-027]: request → redirect → callback → **server-side verify using the amount from your DB** → fulfil once.
- Never trust amount/status coming from the browser or the callback query string.
- Idempotent fulfilment: verifying/fulfilling twice must not double-ship (unique constraint on `payment_id`; "already verified" is a normal state).
- Handle "paid but user closed the tab / callback never arrived": a reconciliation job that checks pending payments with the PSP.
- Store minimal PSP identifiers (authority, ref id, masked card) and never raw card data.
- Sandbox first; test: failure, cancel, timeout, double callback, amount tamper, expired authority.
- A gateway typically requires Enamad for e-commerce [E-026]; budget calendar time for it.

**I-5 Phone-OTP login is common; treat it as a costly, abusable service.** (RECOMMENDATION; prevalence not measured here.)
- The SMS provider is a dependency that can fail or be rate-limited → provide a visible retry timer, an alternative (email link or password) where the product allows, and a monitored provider-failure alert.
- Abuse: per-number, per-IP, per-device and global rate limits; cap daily SMS spend; block premium/odd ranges you do not serve. (See `security.md`, "OTP abuse".)
- Normalize input with `normalizeIranMobile`; accept Persian digits and `+98`/`0098`/`09`.
- Verifying that a mobile number belongs to a national code (Shahkar-type services) exists as a regulated integration; availability and legal basis are **unverified here**: only for a real regulatory need, via an official provider.

**I-6 Hosting location is a decision, not a default.** Use `architecture-decisions.md`, framework **D-HOST**. Inputs: audience location, outage tolerance, payment/SMS provider locations, sanctions exposure of vendors [E-023], latency, data-protection stance, team access. Possible shapes: all-domestic; all-foreign; **split** (static/content edge abroad, transactional core domestic or vice versa); active-passive. Record the pricing/speed claims you rely on with their evidence label (the 2018 NIN pricing claim is ASSUMPTION [E-022]).

**I-7 Legal facts come from the client's lawyer; the site must make them findable.** Starting points to verify, not to assert:
- Consumer withdrawal right in distance transactions: ≥ 7 working days with exceptions [E-025] → refund/return policy must state it correctly or state the legal exception.
- Supplier information duties (Arts. 33–34) → business information page (name, registration, address, phone, support hours, how to complain).
- Enamad display and verification link for shops [E-026].
- Tax and invoicing: obligations for e-invoicing and VAT for online sellers (the national e-invoicing system for taxpayers is often mentioned by practitioners) were **not verified here** → ask the client's accountant early; it affects invoice PDFs, order data fields and checkout copy.
- Recurring/subscription billing: whether and how the chosen PSP supports it (direct debit, wallet, tokenized cards) is **unverified** → read the PSP's docs before promising subscriptions in a SaaS brief.
- Personal-data rules: the state of Iranian data-protection law was **not verified** → record ASSUMPTION; data-minimization and clear privacy text are good regardless.
- `.ir` domain registration conditions: not verified → ask the registrar.

**I-8 Design for the real device and network.** (RECOMMENDATION; usage statistics not verified this run.) Assume mobile-first, mid/low-end Android, variable and metered networks. Default test profile: throttled network + 4× CPU slowdown + 360×640 viewport. Validate with field data (RUM) after launch; adjust the budget with real numbers.

## 2. Local data & integrations: what to decide per project

| Area | Decision | Pitfall |
|---|---|---|
| Provinces/cities | Use a maintained dataset; store stable IDs, not display strings; allow free-text fallback for new cities. | Hand-typed lists, ی/ي variants, divisions that change. |
| Address form | Province → city → full address → 10-digit postal code → recipient name + mobile. Format-check postal code only; do not reject on unverified deeper rules. | Over-validation blocking real addresses. |
| Bank identifiers | Sheba (IR + 24 chars, ISO 13616 mod-97) and card number (Luhn): `isValidSheba`, `isValidCardNumber`. Collect only if a refund/payout flow needs them; never log; mask. | Storing PAN; trusting format = account exists. |
| Maps/geo | Choose a provider reachable under I-2; confirm tile/API terms and availability from Iran. | Silent dependency on a blocked map API. |
| Shipping | Integrate per carrier API or manual rate table; model delivery by *province/city rules + calendar* (weekend/holidays configurable). | Hardcoded weekend; unrealistic ETA promises. |
| Calendar | Jalali display, Gregorian/UTC storage, IANA `Asia/Tehran` (no DST from 2023 on [E-013]); week starts Saturday, weekend Friday per ICU [E-014]; official holidays come from a maintained source, not code. | Lunar-calendar religious holidays have no fixed Jalali dates: fetch them from an authoritative list. |
| Notifications | SMS (domestic provider), email deliverability is variable: do not make email the only channel for critical steps. | Emails to certain providers delayed/blocked: measure, don't assume. |

## 3. Failure scenarios to rehearse

| Scenario | Minimum acceptable behaviour |
|---|---|
| International internet unreachable | Domestic users still complete critical journeys; non-critical features degrade silently. |
| PSP down or slow | Cart preserved; clear message; retry; no duplicate orders. |
| SMS provider down | User sees why; alternative or timed retry; ops alert within minutes. |
| User pays, never returns to site | Reconciliation job finds and fulfils or refunds. |
| A vendor becomes unreachable/blocked | Replaceable by config + documented fallback; no code change needed for critical vendors. |
| Currency redenomination announced | Change confined to the `money` module + data migration + copy; no hunt through components. |
