# Evidence register

Every non-obvious claim in this skill that can go stale or be wrong carries an ID like `[E-001]`.
This file is the single place that says how much to trust it, where it came from, and how to re-check it.

## Labels (use exactly these)

| Label | Meaning | May an agent act on it without checking? |
|---|---|---|
| **FACT** | Verified against a primary source or by a reproducible experiment, with date. | Yes, until its re-verify date. |
| **BEST PRACTICE** | Broadly accepted engineering practice, with a named authority (OWASP, W3C, web.dev, MDN...). | Yes, unless project context contradicts it. |
| **RECOMMENDATION** | This skill's judgement, derived from facts + reasoning. Not independently proven. | Yes, but record a deviation if you deviate. |
| **ASSUMPTION** | Plausible, secondary-source-only or unverified. | **No.** Verify, or record it in the project assumptions register with a risk and a reversal plan. |
| **EXPERIMENTAL** | A hypothesis worth trying, with a way to measure it. | Only behind a measurement. |

Source strength: **P** primary (spec, official docs, the law text, own experiment) · **S** secondary (reputable article, vendor blog, Wikipedia citing sources) · **W** weak (anonymous blog, SEO article, forum).
A claim backed only by **W** is an ASSUMPTION no matter how plausible it sounds.

## Rules for using evidence

1. **Never store volatile specifics in a project from memory** (framework versions, API shapes, prices, legal thresholds). Re-check at project start and write the date in the project's `decisions/`.
2. Date-stamp: if today is later than `Verified + re-verify window` (High = 90 days, Medium = 180, Low = 365) treat the claim as ASSUMPTION until re-checked.
3. When a source is unreachable (a 503 happened during research of E-017), say so. Do not fill the gap from memory and label it FACT.
4. Disagreeing sources are a finding, not noise: record both (see E-013).
5. **A label without a source and a date is invalid** and is treated as ASSUMPTION. "FACT" requires a primary-source URL or a reproducible experiment path plus the date. Hazard claims ("X breaks in RTL") need a reproduction fixture, not a recollection (E-018 replaced two such claims that failed reproduction).
6. Legal and payment rules are never settled by this register. They are settled by the client's lawyer / the chosen payment provider's current documentation.

## Register

Columns: ID · claim · label · source (strength) · verified on · volatility · how to re-verify.

### Web platform & standards

| ID | Claim | Label | Source | Verified | Vol. | Re-verify |
|---|---|---|---|---|---|---|
| E-001 | Core Web Vitals = LCP, INP, CLS. "Good" at the 75th percentile of page loads: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. INP replaced FID (stable since 2024). All three currently "Stable". | FACT | web.dev/articles/vitals (P) | 2026-10-01 | Med | Fetch the page; check "Stable" lifecycle note. |
| E-002 | WCAG 2.2 added 9 success criteria: 2.4.11 Focus Not Obscured (Min) AA, 2.4.12 (Enh) AAA, 2.4.13 Focus Appearance AAA, 2.5.7 Dragging Movements AA, 2.5.8 Target Size (Min) AA (24×24 CSS px, with exceptions), 3.2.6 Consistent Help A, 3.3.7 Redundant Entry A, 3.3.8 Accessible Authentication (Min) AA, 3.3.9 (Enh) AAA. 4.1.1 Parsing was removed. | FACT | w3.org/WAI/standards-guidelines/wcag/new-in-22/ (P) | 2026-10-01 | Low | W3C page. Check whether a newer WCAG version became a Recommendation. |
| E-003 | OWASP Top 10:2025 = A01 Broken Access Control, A02 Security Misconfiguration, A03 Software Supply Chain Failures, A04 Cryptographic Failures, A05 Injection, A06 Insecure Design, A07 Authentication Failures, A08 Software or Data Integrity Failures, A09 Security Logging and Alerting Failures, A10 Mishandling of Exceptional Conditions. | FACT | top10.owasp.org/2025 (P) | 2026-10-01 | Low | Fetch page. (SSRF folded into A01 per S sources, not seen on the page text fetched.) |
| E-004 | Google restricted FAQ rich results (Aug 2023) to well-known authoritative government/health sites; unused structured data is harmless. HowTo status after Sept 2023 **not verified**. | FACT (FAQ) / ASSUMPTION (HowTo) | developers.google.com/search/blog/2023/08/howto-faq-changes (S snippet) | 2026-10-01 | High | Google Search Central "structured data gallery" lists what is currently supported. |
| E-005 | CSS logical properties (`margin-inline-start`, `inset-inline-*`, ...) are broadly supported in current browsers. | ASSUMPTION (high confidence) | Not verified this run: MDN page lacked the Baseline label. | 2026-10-01 | Low | MDN property pages → "Baseline" badge; caniuse. Check against the project's browser matrix. |

### Persian language & locale (Intl, Unicode)

| ID | Claim | Label | Source | Verified | Vol. | Re-verify |
|---|---|---|---|---|---|---|
| E-010 | `Intl.DateTimeFormat('fa-IR')` resolves to calendar `persian` and numbering system `arabext` (۰-۹, U+06F0–06F9); `fa-IR-u-nu-latn` gives Latin digits; `en-US-u-ca-persian` gives Jalali with Latin text. Example: 2026-10-01 → "۱۴۰۵ مهر ۹" (9 Mehr 1405). | FACT | Own experiment, Node 22.22.0 (P) | 2026-10-01 | Low | Re-run in **each target browser**; runtime ICU differs. |
| E-011 | Persian text has duplicate code points: ی U+06CC vs ي U+064A (and ى U+0649), ک U+06A9 vs ك U+0643, digits ۰-۹ U+06F0.. vs ٠-٩ U+0660.., ZWNJ U+200C. `String.prototype.normalize('NFKC')` does **not** unify any of these. | FACT | Own experiment (P) | 2026-10-01 | Low | `node --test scripts/*.test.mjs` |
| E-012 | `Intl.NumberFormat('fa-IR', {style:'currency', currency:'IRR'})` emits an invisible LRM and puts "ریال" before the number ("‎ریال ۱٬۲۵۰٬۰۰۰"). "Toman" is not formatted by Intl (no ISO code); append the word manually. | FACT | Own experiment (P) | 2026-10-01 | Low | Re-run per browser. |
| E-013 | In ICU data Asia/Tehran applied DST through summer **2022** (+04:30 in Jul 2020, 2021, 2022) and **not from 2023 on** (+03:30 in Jul 2023–2026; +03:30 in every January). Never hardcode an offset; use the IANA zone and a current tz database; historical timestamps depend on the old rules. | FACT | ICU data in Node 22.22.0 (P) | 2026-10-01 | Med | Re-run; check IANA tz release notes if Iran changes policy. |
| E-014 | In ICU, Persian leap years for 1380–1450 match the 33-year arithmetic rule (leap: 1399, 1403, 1408, 1412, 1416, ...); 30 Esfand 1403 exists, 1404 is not leap; 2026-03-21 = 1 Farvardin 1405. Whether it matches the *official astronomical* calendar for every year is **not verified**. `Intl.Locale('fa-IR').getWeekInfo()` → firstDay 6 (Saturday), weekend [5] (Friday). | FACT (ICU behaviour) / ASSUMPTION (agreement with official calendar) | Own experiment (P) | 2026-10-01 | Low | Compare with the official published calendar for the years the product needs. |
| E-016 | CLDR/ICU Persian plural categories are only `one` and `other`, and `0` and `1` both select `one`. In Persian a numeral is followed by a **singular** noun (۳ کتاب); English-style plural logic does not transfer. | FACT (ICU behaviour) / BEST PRACTICE (grammar) | Own experiment, Node 22.22.0 (P) | 2026-10-01 | Low | `new Intl.PluralRules('fa').select(n)` per target browser. |
| E-017 | `Intl.ListFormat('fa')` joins as «سیب،‏ پرتقال، و موز»: it includes an invisible RLM after the first comma and a comma before «و». Common Persian prose style is «سیب، پرتقال و موز». Compact number notation rounds (1,250,000 → «۱٫۳ میلیون»). | FACT (output) / ASSUMPTION (style norm: needs native editor confirmation) | Own experiment (P) | 2026-10-01 | Low | Re-run; have a native editor choose the house style. |
| E-018 | Bidi rendering in plain RTL text, measured in Chromium (Playwright 1.56.1, DejaVu Sans): phone numbers with spaces/dashes/`+` render with digit groups in reverse visual order and a stranded `+` ("98+"); `<bdi dir="ltr">` fixes it. ASCII `-` and U+2212 before digits render to the right of the digits; `Intl.NumberFormat('fa').format(-500)` emits LRM + U+2212 and renders correctly; percent signs render left of the digits by default and right inside `<bdi>`; `dir="auto"` handles user text starting with Latin. Sentence-final punctuation after a trailing English phrase and parentheses around Latin were **not** a problem in the simple case tested. | FACT (Chromium only; Safari/Firefox unverified) | Own experiment: `scripts/fixtures/bidi-hazards.html`, `scripts/bidi-order.test.mjs` (P) | 2026-10-01 | Med | Run `node --test scripts/bidi-order.test.mjs` after browser upgrades; repeat in WebKit/Firefox via Playwright. |
| E-015 | Vazirmatn is licensed under the SIL OFL from v27 (public domain before), is available as a variable font, and ships Latin glyphs from Roboto. | FACT (S) | npm / GitHub README via search snippet | 2026-10-01 | Low | Read `OFL.txt` in the repo you actually ship. Other Persian fonts have different licenses: always check. |

### Security (OWASP Cheat Sheet Series, fetched 2026-10-01)

| ID | Claim | Label | Source | Verified | Vol. | Re-verify |
|---|---|---|---|---|---|---|
| E-040 | Password storage: **Argon2id** preferred, minimum m=19456 KiB (19 MiB), t=2, p=1. Fallbacks: scrypt (N=2^17, r=8, p=1); bcrypt only for legacy (work factor ≥ 10, 72-byte input limit); PBKDF2-HMAC-SHA256 ≥ 600,000 iterations only where FIPS is required. | FACT | cheatsheetseries.owasp.org Password Storage (P) | 2026-10-01 | Med | Re-read the cheat sheet at project start; parameters drift upward. |
| E-041 | SSRF prevention: allow-list hosts and build the request yourself; validate resolved IPs (A and AAAA) are public; disable automatic redirects; segment outbound network access; block cloud metadata (169.254.169.254, use IMDSv2); deny-lists only as a last resort (127.0.0.0/8, RFC1918, metadata IPs). | FACT | cheatsheetseries.owasp.org SSRF Prevention (P) | 2026-10-01 | Med | Same. |
| E-042 | Recommended response headers: `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (preload is hard to reverse: commit deliberately); `Permissions-Policy` restricting unused features; `Cross-Origin-Opener-Policy: same-origin`; `X-Frame-Options: DENY` (or CSP `frame-ancestors`); CSP tailored per site. Remove `X-Powered-By`/`Server` detail; set `X-XSS-Protection: 0` or omit; HPKP and Expect-CT are obsolete. | FACT | cheatsheetseries.owasp.org HTTP Headers (P) | 2026-10-01 | Med | Same. |

### Iran: connectivity, platforms, money, law

| ID | Claim | Label | Source | Verified | Vol. | Re-verify |
|---|---|---|---|---|---|---|
| E-020 | A near-total internet outage occurred 17–18 June 2025 (~97% collapse per TechCrunch; ~80% bandwidth drop per NYT; observed by NetBlocks, Cloudflare Radar). Earlier shutdowns: 2019, 2022. | FACT (S, multi-attributed) | en.wikipedia.org/wiki/2025_Internet_blackout_in_Iran | 2026-10-01 | Med | NetBlocks / Cloudflare Radar / IODA. |
| E-021 | A prolonged shutdown beginning ~1–8 Jan 2026 (≈ 2–3 weeks) is *reported*, including failure of OTP SMS and banking logins. Mostly unsourced in the only article read. | ASSUMPTION | circleid.com article (S/W, partly cites Cloudflare) | 2026-10-01 | High | Cloudflare Radar / NetBlocks / IODA reports for Jan 2026 **before relying on it**. |
| E-022 | Iran's National Information Network (NIN) separates domestic from international traffic; in 2018 a 50% data discount for domestically hosted services was reported. | ASSUMPTION (dated) | thenetmonitor.org, 2018-02-21 (S) | 2026-10-01 | High | Ask a current Iranian ISP/hosting provider; do not design pricing assumptions on this. |
| E-023 | US sanctions cause some foreign platforms/cloud vendors to restrict Iranian users; the picture changes often (e.g. GitHub obtained a license in Jan 2021; GitLab blocked users). 2026 specifics from one low-quality blog **not accepted**. | ASSUMPTION | thenextweb 2019, others (S/W) | 2026-10-01 | High | Test the vendor's ToS and actual access from the team's location **before choosing it**. |
| E-024 | Iran's parliament approved removing four zeros from the rial on 5 Oct 2025; the Guardian Council approved afterwards (reported early Nov 2025); old and new currency may circulate up to 3 years; the Central Bank must set procedures within 2 years. **Sources disagree on the name of the new unit** ("rial redefined = 10,000 old rials, with qiran subunit" vs Wikipedia: "toman = 10,000 rials, 100 qirans"). Implementation dates and ISO code not found. | FACT (approval) / ASSUMPTION (naming, dates, ISO code) | iranintl.com 2025-10-05, rudaw.net 2025-11-08, newarab.com, Wikipedia "Iranian rial" (S) | 2026-10-01 | **High** | Central Bank of Iran announcements; ask the payment provider how they will represent amounts. |
| E-025 | Iran Electronic Commerce Law, Art. 37: in distance transactions the consumer has at least **7 working days** to withdraw without penalty or reason (only return shipping cost); the withdrawal clock starts after the supplier gave the information required by Arts. 33–34; exceptions exist (Art. 38). | FACT (S: law text quoted by legal sites) | ekhtebar.ir, edalatsara.com | 2026-10-01 | Med | Law text on the Majlis research center site / the client's lawyer. |
| E-026 | Payment providers / Shaparak practice: an e-commerce business typically needs Enamad (نماد اعتماد الکترونیکی) to obtain a gateway. | FACT (S, vendor-published) / project-specific | zarinpal.com blog | 2026-10-01 | Med | The chosen PSP's current onboarding page. |
| E-027 | Payment flow pattern: request → redirect user to gateway → user returns to `callback_url` with an authority/token → **server calls verify with the amount read from your own database** → success code (100 in Zarinpal's v4 API; "already verified" is a different code). Amount unit must be read from the PSP docs. | BEST PRACTICE (pattern) / ASSUMPTION (exact codes) | zarinpal.com docs via search snippet; docs returned HTTP 503 when fetched | 2026-10-01 | High | PSP docs of the gateway actually chosen. |
| E-028 | Iranian mobile numbers: 11 digits starting `09` (or 10 digits starting `9`, or `+98 9…`). National code: 10 digits, checksum Σ(dᵢ·(10−i)) mod 11, reject all-same-digit codes. Postal code: 10 digits. | FACT (format) | Several validation libraries and articles (S) + own tests (P) | 2026-10-01 | Low | `persian-utils.test.mjs`. Operator prefix lists change; do not hardcode. |

### Search & language

| ID | Claim | Label | Source | Verified | Vol. | Re-verify |
|---|---|---|---|---|---|---|
| E-030 | Academic studies find Google retrieves Persian pages better than Bing/Yahoo; Persian morphology, compounding, colloquial forms and polysemy hurt all engines. Current search-engine **market share in Iran is not verified.** | ASSUMPTION | nastinfo.nlai.ir / ensani.ir (S, dated) | 2026-10-01 | High | StatCounter / Similarweb for Iran; Search Console data of the real site. |

### SEO and performance (primary sources, fetched 2026-10-01)

| ID | Claim | Label | Source | Verified | Vol. | Re-verify |
|---|---|---|---|---|---|---|
| E-050 | Google: non-ASCII characters in URLs **should be percent-encoded** (its Arabic example `%D9%86…`); it also recommends using the audience's language in URLs; use hyphens not underscores; URLs are case-sensitive so keep one case. No source found claiming a ranking benefit of Persian vs Latin slugs. | FACT | developers.google.com/search/docs/crawling-indexing/url-structure (P) | 2026-10-01 | Med | Same page. |
| E-051 | Sitemap limits: 50 MB uncompressed or 50,000 URLs per file (else split + index). Google **ignores** `<priority>` and `<changefreq>`; uses `<lastmod>` only if consistently and verifiably accurate. | FACT | developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap (P) | 2026-10-01 | Med | Same page. |
| E-052 | `robots.txt` manages crawler traffic; it is **not** a way to keep a page out of Google (blocked URLs can still appear if linked). Use `noindex` (page must stay crawlable) or authentication. | FACT | developers.google.com/search/docs/crawling-indexing/robots/intro (P) | 2026-10-01 | Low | Same page. |
| E-053 | hreflang: `language[-REGION]` (ISO 639-1, ISO 3166-1 alpha-2), reciprocal return links required (else ignored), each page lists itself and all alternates, `x-default` as fallback; placeable in HTML `<link>`, HTTP `Link` header, or sitemap `xhtml:link`. | FACT | developers.google.com/search/docs/specialty/international/localized-versions (P) | 2026-10-01 | Low | Same page. |
| E-060 | TTFB is **not** a Core Web Vital; guideline "good" ≤ 0.8 s, "poor" > 1.8 s. | FACT | web.dev/articles/ttfb (P) | 2026-10-01 | Med | Same page. |
| E-061 | LCP ideal breakdown: TTFB ≈ 40%, resource load delay < 10%, resource load duration ≈ 40%, element render delay < 10%. The LCP resource should be discoverable in the initial HTML (not `data-src`/JS-injected); use `fetchpriority="high"`; never `loading="lazy"` on the LCP image; preload when only referenced from CSS/JS; avoid render-blocking CSS/JS. | FACT | web.dev/articles/optimize-lcp (P) | 2026-10-01 | Med | Same page. |
| E-062 | CLS causes/fixes: image `width`/`height` or `aspect-ratio`; reserve space for ads/embeds; avoid inserting content above existing content; fonts: `font-display: optional` or matched fallbacks + preload; animate with `transform`, not `top/left/box-shadow`; keep pages bfcache-eligible. | FACT | web.dev/articles/optimize-cls (P) | 2026-10-01 | Med | Same page. |
