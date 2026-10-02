# Product architecture and information architecture

Outputs: `docs/03-scope.md` (MVP, later, not-now, stories, acceptance) and `docs/04-ia.md` (sitemap, templates, navigation, URLs). Gate: **G1**.

## 1. MVP definition

MVP = the smallest set that lets the **primary user complete the primary journey** and lets the business **measure whether it works**. Everything else is "Later" with a revisit trigger.

Method:
1. List candidate features as user stories (stories trace to a segment and an outcome from the brief).
2. Mark each **Must / Should / Could / Won't-now** (MoSCoW). A "Must" is something whose absence makes the primary journey impossible, illegal, or unmeasurable.
3. Estimate cost (S/M/L) and risk (integration, content, legal).
4. Cut until the MVP can be built, tested and launched inside the constraints. Anything cut gets one line: *trigger to reconsider* (e.g. "wishlist: after 30% of orders are repeat buyers").

Core Flow = primary journey (designed first, tested most). Secondary Flows = account recovery, returns, contact, search, errors. Failing a secondary flow gracefully still counts as design work.

## 2. Anti-feature-creep device (after the scope freeze at G1)

A new feature enters only with: (a) the metric it moves, (b) an equal-cost item removed or deferred, (c) acceptance criteria, (d) an owner for maintenance. Otherwise it goes to "Later". "Small additions" accumulate: log each with its cost; review the log weekly.

## 3. Stories and acceptance criteria

`As a <segment> I want <capability> so that <outcome>` + Given/When/Then. Each story has: happy path, ≥ 1 error path, ≥ 1 empty/edge case (from `testing-edge-cases.md`), and the Persian-specific case if input/display is involved (digits, ZWNJ, bidi).
Definition of Done for a story: acceptance criteria pass · keyboard and screen-reader smoke test · mobile layout checked · Persian correctness items relevant to the story · error states written · analytics event (if the story is in a metric) · no placeholder content.

## 4. Information architecture by size

| Profile | Structure |
|---|---|
| Lite | Flat. ≤ 7 top-level items. One page per intent; one primary call-to-action per page. |
| Standard | 2–3 levels. Category pages, detail pages, utility pages. Search/filters only if users must scan long lists (rule of thumb: if finding an item takes scanning more than ~20 entries, add search or filters; RECOMMENDATION, verify in tests). |
| Heavy | Content model first (entities, attributes, relations), then taxonomy with owners and naming rules, then faceted navigation with an indexation policy (see `seo.md`). Governance: who may create categories/tags. |

**Template inventory over page inventory**: list *templates* (home, category, detail, article, checkout step, account page, error) and for each: purpose · primary action · required data · states (loading, empty, error, partial, permission-denied) · SEO role. Pages are instances.

## 5. Navigation

- Primary nav ≤ 7 items, labelled with the user's words (verify with a card sort or tree test when > 30 pages; ≥ 5 participants).
- Mobile: bottom bar works for 3–5 frequent destinations in app-like products; a menu button is acceptable for content sites. Test thumb reach (see `ui-design-system.md`). Search is always one tap away on content/catalog sites.
- Show where the user is (current item state, breadcrumbs for depth ≥ 3). Breadcrumb separators mirror in RTL.
- Utility links (login, cart, support, language) have consistent positions on every page. Do not hide the primary action in a hamburger.
- Footer: legal/trust links required for the business type (see `ux-content.md` §Trust, `iran-context.md` I-7); not a dumping ground.

## 6. URLs

- Lowercase, hyphen-separated, hierarchical, stable, human-readable; no session IDs/parameters for indexable content; one canonical form (trailing slash, www, https).
- **Persian vs Latin slugs**: decision S-1 in `seo.md`.
- Never change a published URL without a 301 and an update of sitemap/internal links. Plan slugs for products/articles that may be renamed (ID in the path or redirect table).
- Faceted/filter/sort parameters: decide index/noindex/canonical rules before building filters.

## 7. Search & filters (when present)

Filters mirror how users decide (price, size, brand, availability), ordered by usage. Show counts and an obvious "clear all". Empty results offer a way out (remove filters, nearby queries). The search box accepts Persian variants (see `persian-ux.md` §6). Persist filter state in the URL for sharing/back button.

## 8. G1: Scope & IA gate

- [ ] MVP list with Must/Should/Could and "Later" list with triggers.
- [ ] Every Must traces to a segment and an outcome; every story has acceptance criteria incl. error and edge.
- [ ] Template inventory with states; sitemap; navigation model; URL rules.
- [ ] Integrations and legal/payment dependencies identified with owners and dates.
- [ ] Scope freeze recorded (date, owner).
