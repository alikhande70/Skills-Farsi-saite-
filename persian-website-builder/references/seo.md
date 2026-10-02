# SEO (technical and Persian search)

SEO is **architecture**, decided with IA and rendering (G1/G4), not a plug-in applied at the end (AP-012). It exists to let the right people find real pages that solve their intent. Output: `docs/seo.md` (intent→page map, URL rules, indexation policy, metadata templates, schema plan, test results). Gate: **G-SEO** (inside G5).
Evidence rule: ranking-factor claims are mostly **ASSUMPTION or EXPERIMENTAL**; only technical eligibility (crawl, render, index, canonicalization) is well documented by search engines. Don't promise rankings.

## 1. Strategy: intent → page → measurable result

1. Use the intent map from research (`research.md` §3): informational / commercial / transactional / navigational, Persian phrasing variants included.
2. Every important intent gets **one** best page (avoid cannibalization); every indexable page has a distinct purpose, a unique `title`, a unique description, and real content.
3. Thin, duplicate, auto-generated or doorway pages are not indexed (noindex) or not created.
4. Success is measured with Search Console-style data (impressions, clicks, queries, indexed pages) and conversions, not rankings alone (`ops.md`).
5. Which search engines matter for the audience is **not verified** [E-030]: check the client's analytics; assume Google-compatible technical SEO as the baseline and add others per evidence.

## 2. Crawlability and indexability

| Topic | Rule | Verify |
|---|---|---|
| Rendering | Content and links you need indexed are in the first HTML response (D-RENDER) | `curl` the URL: content and `<a href>` present without JS |
| Links | Real `<a href>` for navigation; no JS-only or `onclick` navigation | Crawl with JS disabled |
| `robots.txt` | Manages crawl traffic only; **not** for hiding pages [E-052]. Never block CSS/JS needed to render. Don't list secrets in it | Fetch `/robots.txt`; test sample URLs |
| `noindex` | Use for pages that must be reachable but not indexed (thin filters, internal search, thank-you pages). The page must remain **crawlable** or the tag is never seen [E-052] | Meta robots / `X-Robots-Tag` check |
| Status codes | 200 real, 301 permanent moves, 404/410 gone, 5xx only for real errors; no "soft 404" (200 with "not found" text) | Crawl and list non-200 |
| Canonical | One `<link rel="canonical">` per indexable page, absolute, self-referencing by default; same encoding form everywhere (see S-1) | Crawl: canonical consistent with sitemap and internal links |
| Duplicates | Normalize host (www/non-www), scheme (https), trailing slash, case, parameters; 301 to the canonical | Request each variant: one 301 hop |
| Pagination | Each page self-canonical and linked with crawlable links; avoid "view all" that is huge | Crawl |
| Faceted/filter URLs | Decide in IA which combinations are indexable (demand + unique content) and `noindex`/block/canonicalize the rest | Policy table in `docs/seo.md` |
| Sitemap | XML, only canonical indexable URLs, ≤ 50,000 URLs/50 MB per file (else index) [E-051]; `<lastmod>` only if accurate; skip `priority`/`changefreq` (ignored) [E-051]; referenced from robots.txt; submitted in webmaster tools | Validate; compare counts with indexed pages |
| Redirects | 301 on any URL change; no chains/loops | Crawl redirects |
| Speed & mobile | Core Web Vitals targets (`performance.md`); mobile-friendly layout | Field data |

## 3. Decision S-1: Persian or Latin slugs?

Facts: Google says non-ASCII URL characters should be percent-encoded and also recommends using the audience's language in URLs; hyphens, one case [E-050]. **No evidence found that either form ranks better** (treat any claim as EXPERIMENTAL).

| Condition | Choose |
|---|---|
| Persian-only content; audience reads/shares URLs in apps that display decoded Persian; slugs are human-meaningful | **Persian slugs** for content/category pages |
| URLs are pasted into systems that mangle encoding (SMS gateways, some email clients, legacy CMS/analytics), or the team cannot guarantee consistent encoding | **Latin slugs** (standard transliteration) |
| Utility/system routes (`/cart`, `/login`, `/search`) | Always Latin |
| Bilingual site | Per-language slug, linked via hreflang; keep a stable ID or redirect table |

Implementation rules whichever you choose: normalize slugs (`slugifyFa`: ی/ک canonical, ZWNJ → hyphen, no punctuation), lowercase Latin, hyphens; canonical/sitemap/internal links use **one** encoding form; the server accepts both percent-encoded and decoded input and **301s** non-canonical forms (including ی/ي and ک/ك variants and Persian digits) to the canonical URL; never use the slug as the identity (keep an ID/key); slug changes create 301s. **Verify**: paste sample URLs into the channels the audience uses; `curl` the encoded and decoded forms; check canonical equality in the crawl.

## 4. On-page and semantic HTML

- `<html lang="fa" dir="rtl">`; `lang` on foreign fragments.
- `<title>` unique and descriptive (front-load the key words; avoid keyword stuffing; keep readable in Persian); `meta description` unique, written for humans (it is a snippet candidate, not a ranking promise).
- One `h1`, logical heading hierarchy, descriptive link text, meaningful `alt`, semantic landmarks (also accessibility).
- Content: answers the intent completely and originally; first-hand details, evidence, up-to-date facts; clear author/business identity for YMYL-like topics; no auto-spun or machine-translated filler. Persian writing quality matters (`ux-content.md` §6).
- Internal linking: every indexable page reachable in ≤ 3 clicks; contextual links with descriptive anchors; breadcrumbs; related items; no orphan pages (compare crawl vs sitemap).
- Images: descriptive filenames and alt, dimensions, modern formats, sitemap for important images if needed.
- Dates: use ISO 8601 in markup/structured data; display Jalali to users. Keep `dateModified` honest.

## 5. Structured data

Use only types that match **visible page content** and are documented as supported; validate with the engine's rich-result and schema validators. Check the current supported-features list before planning (support changes: e.g. FAQ rich results were restricted to authoritative government/health sites in Aug 2023 [E-004]; HowTo status unverified): don't add FAQ markup "for SEO". Typical valuable types: `Organization`/`LocalBusiness`, `BreadcrumbList`, `Product` + `Offer` (price, currency, availability must match the page; mind the rial/toman unit [I-3]), `Article`, `WebSite`. JSON-LD preferred; generate it from the same data as the page to prevent drift.

## 6. International/bilingual

If both Persian and other languages exist: hreflang with reciprocal return links, self-reference, `x-default`, valid codes (`fa`, optionally `fa-IR`), in HTML, headers or sitemap [E-053]; each language version has its own canonical, `lang`, metadata and sitemap entries; don't auto-redirect by IP/language without a visible switcher.

## 7. Persian search behaviour (apply per project, measure)

- Index and match variants (`persian-ux.md` §6): ZWNJ vs space vs joined, ی/ي, ک/ك, digits in three scripts, colloquial vs formal, transliteration/Finglish. Search engines do not unify all of these, and Persian morphology/compounding reduces retrieval quality in all engines [E-030] → cover important variants **in natural copy and in internal search**, not by hidden keyword lists.
- Create content for questions users actually ask (support logs, autocomplete, forums), phrased as users phrase them.
- Local intent (city/province names, "near me") needs consistent name data and a complete business profile in the engines/maps the audience uses (verify which; I-2 reachability applies to maps embeds).

## 8. Tests for G-SEO

Crawl the staging site with JS off and on; verify: status codes, canonicals, indexability directives, sitemap vs crawl, redirects, orphan pages, duplicate titles/descriptions, hreflang reciprocity, structured data validity, internal link depth, mobile rendering, Core Web Vitals. After launch: submit sitemap, monitor coverage/indexing reports, fix errors weekly for the first month.

## 9. G-SEO

- [ ] Intent→page map exists; no two pages target the same primary intent.
- [ ] S-1 decided and tested end to end; one canonical form everywhere.
- [ ] Crawl report clean: no unintended noindex/blocked pages, no soft 404s, no redirect chains, no duplicate titles/descriptions.
- [ ] Sitemap/robots/canonical consistent; structured data validates and matches visible content.
- [ ] Production launch plan: redirect map for any migrated URLs, webmaster-tool verification, monitoring.
