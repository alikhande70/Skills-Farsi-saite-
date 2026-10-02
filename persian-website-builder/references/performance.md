# Performance

Performance is a **requirement with a budget from day one**, designed in (architecture, images, fonts, JS), then verified with **field data**. Optimization without measurement is AP-004; ignoring performance until the end is AP-024. Output: `docs/performance.md` (budget, measurements, regressions). Gate: **G-PERF** (inside G5; budget agreed at G3).

## 1. Targets [E-001, E-060]

At the **75th percentile of real page loads**, measured separately for mobile and desktop:

| Metric | Good | Notes |
|---|---|---|
| LCP | ≤ 2.5 s | the largest above-the-fold element: usually hero image or headline |
| INP | ≤ 200 ms | responsiveness over the whole visit; replaced FID |
| CLS | ≤ 0.1 | visual stability |
| TTFB (not a Core Web Vital) | ≤ 0.8 s guideline | drives LCP; poor > 1.8 s |

Targets are for the **user's real conditions**: use the throttled mobile profile in `iran-context.md` I-8 for lab tests, and RUM from real visitors after launch.

## 2. Budgets (derive, don't copy)

Budget = what must be true for the LCP target on the target network/device. Starting numbers below are **EXPERIMENTAL**: record them as hypotheses, then replace with measurement.

| Item | Lite | Standard | Heavy |
|---|---|---|---|
| JS per route (compressed) | ≤ ~100 KB | ≤ ~200 KB | per-route budget set from profiling |
| LCP image | ≤ ~100 KB, responsive | same | same |
| Fonts (Persian + Latin) | 1–2 files, subset, WOFF2 | same | same |
| Third-party scripts | 0 on critical path | ≤ 2, deferred | audited quarterly |
| Requests before LCP | minimal | minimal | tracked in CI |

A budget with no CI check is a wish: add a lab check (Lighthouse-style CI or equivalent) that fails the build on regression.

## 3. Measurement stack

- **Lab**: repeatable runs with throttling (mobile profile) on every template; compare before/after for each change.
- **Field/RUM**: collect Core Web Vitals from real users (e.g. the open-source `web-vitals` library posting to **your own** endpoint: I-2), segmented by route, device class, connection. Public datasets (CrUX-style) may lack data for low-traffic or Iran-heavy sites (ASSUMPTION): do not depend on them.
- **Profiling**: browser performance panel for INP/long tasks; network waterfall for LCP; bundle analyzer for JS.
- Record each measurement with date, tool+version, profile, and URL set.

## 4. Levers, in the order to try them (verify each by measurement)

1. **TTFB**: cache HTML where possible (CDN/edge/reverse proxy), host close to users (D-HOST), avoid blocking upstream calls in SSR, compression (Brotli/gzip), keep-alive/HTTP/2+, fast DNS/TLS, no redirects chains.
2. **LCP** [E-061]: identify the LCP element on mobile; make it **discoverable in the initial HTML**; `fetchpriority="high"`; **never** `loading="lazy"` on it; right-size and modern format; preload only when it is referenced from CSS/JS; avoid render-blocking CSS/JS; inline or split critical CSS. Aim for the breakdown TTFB ≈ 40%, load delay < 10%, load ≈ 40%, render delay < 10%: whichever subpart dominates tells you where to work.
3. **CLS** [E-062]: width/height or `aspect-ratio` on all media; reserved space for embeds/dynamic blocks; no content inserted above existing content; fonts with matched fallbacks (`size-adjust`) or `optional`; animate `transform`/`opacity` only; keep pages bfcache-eligible.
4. **INP**: break long tasks (> 50 ms), defer non-critical work, avoid heavy hydration of whole pages, virtualize long lists, debounce expensive handlers, remove or delay third-party scripts, avoid layout thrash.
5. **JavaScript weight**: remove dependencies (AP-002), route-level splitting, lazy-load below-the-fold widgets, tree-shaking, modern output targets as your browser matrix allows.
6. **CSS**: ship only what the page uses; no `@import` chains; avoid giant frameworks for small sites.
7. **Images**: responsive `srcset`/`sizes`, AVIF/WebP with fallback, correct dimensions, lazy-load below the fold, compress; video: poster + `preload="none"` unless it is the hero.
8. **Fonts**: self-hosted, subset, WOFF2, one variable font where it reduces files, preload only above-the-fold files **and check that the hint is actually used: one network request per font file (FM-055)**, `font-display` strategy chosen with CLS in mind (`persian-ux.md` §2).
9. **Caching**: hashed assets `Cache-Control: public, max-age=31536000, immutable`; HTML short TTL or revalidation; API caching headers intentional; purge strategy documented. A service worker only with a stated purpose and an update strategy (otherwise it creates stale-content bugs).
10. **Third parties**: each has an owner, a budget, and a removal date; load after interaction/idle; never in the critical path (I-2).

## 5. Persian/Iran-specific performance notes

- Persian fonts can be large: subset to the Arabic/Persian/Latin/digit/punctuation set actually used and verify ZWNJ and punctuation survive; avoid shipping both a Persian and a full Latin family when one covers both.
- International traffic may be slow, throttled or unavailable [E-020, E-022]: self-host everything on the critical path; test with foreign hosts blocked (I-2).
- Mid/low-end Android and metered data: CPU throttling (4×) in lab; keep JS and image bytes low; avoid autoplay media and heavy animations.
- Bundle-size creep from Persian/Jalali date libraries or UI kits: measure before adding; prefer `Intl` where it meets the need [E-010].

## 6. Process rules

- Budgets agreed at G3; checked in CI at every merge; regressions block merge unless the owner records an exception with an expiry.
- Every significant new feature states its performance cost (bytes, requests, main-thread time).
- After launch: weekly RUM review for the first month, then monthly; investigate p75 regressions by route.

## 7. G-PERF

- [ ] Field-ready RUM in place (own endpoint) or a plan with date; lab results for every template on the mobile profile.
- [ ] LCP, INP, CLS meet targets in lab on all key templates; no layout shift from fonts/images/embeds.
- [ ] Budgets enforced in CI; third-party list reviewed.
- [ ] Caching rules documented and tested (first visit, repeat visit, after deploy).
- [ ] Domestic-only/foreign-blocked mode still performs (I-2 test).
