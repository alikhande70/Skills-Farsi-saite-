# Research module

Research exists to **change decisions**. If a research activity cannot change a decision, skip it. Output: `docs/02-research.md`, ≤ 2 pages (Lite: ≤ half a page), ending with a section **"Decisions changed by this research"**: if that section is empty, the research was decoration or biased.

## 1. Time-box by profile

| Profile | Budget | Minimum |
|---|---|---|
| Lite | 1–2 h | 3 competitors, intent list, 1 differentiator |
| Standard | ~1 day | 5–8 competitors, intent map, 5 user conversations/tests, Persian-search check |
| Heavy | 2–3 days | + domain experts, data audit, technical feasibility spikes for risky integrations |

## 2. Market and competitor analysis

Choose 5–8 comparators across: **direct** (same offer, same audience), **indirect** (different solution to the same job), **aspirational** (best-in-class UX, any country), **local analogs** (same constraints: Iranian payment, SMS login, mobile-heavy). Include at least one failing or abandoned product: failure explains more than success.

For each comparator capture: offer and price positioning · primary journey steps and count · trust devices · mobile experience · Persian quality (copy, typography, digits, RTL bugs) · load/CLS by running PageSpeed/Lighthouse on mobile · stack hints (view-source; low confidence) · constraints they face (e.g. gateway redirect, OTP login).

### The anti-copy rule: pattern → mechanism → condition → decision
Never write "competitors have X, so we add X". Write:

| Pattern seen | Mechanism (why it plausibly works/fails) | Evidence & label | Condition under which it holds | Decision for us |
|---|---|---|---|---|
| e.g. phone-number-only checkout | removes password/register friction | observed on 4/6; no conversion data → ASSUMPTION | repeat buyers low; SMS reliable | test in prototype; measure drop-off |

A pattern with no stated mechanism is not adopted. Traffic/"market share" figures from estimation tools are estimates (S/W), never FACT.

## 3. Intent and search behaviour (Persian)

- Build an **intent map**: informational · navigational · commercial investigation · transactional, each with 5–15 real Persian phrasings. Sources: autocomplete/related searches, the client's support chat/DM/phone logs, Search Console for an existing site, sales calls, competitor category names.
- Capture variants as data: ZWNJ vs space (می‌خواهم / میخواهم / می خواهم), ی/ي and ک/ك, Persian vs Latin digits, brand/transliteration spellings, colloquial vs formal, Finglish (Persian in Latin letters). Which engine your audience uses is **not verified** (E-030): check the client's analytics or ask; don't assume one engine.
- Map intents → page types (see `product-ia.md`, `seo.md`). Intents without a page = content gaps; pages without intents = candidates to cut.

## 4. User understanding (small, real, cheap)

- 5 conversations or moderated tests with target users (not colleagues). Ask about **past behaviour** ("tell me about the last time you bought X online"), not opinions on your idea.
- Questions to answer: what do they try first, what makes them distrust a site, what makes them abandon (payment redirect fear, delivery cost surprise, fake reviews), which device/network, which channels they already use to contact businesses.
- Record verbatim quotes with a label: FACT (observed), ASSUMPTION (said they would). Stated intent ≠ behaviour.

## 5. Differentiation

State one **provable** reason to choose this site over comparators (speed of delivery, evidence, selection, price transparency, service). If you cannot prove it on the page (certificate, test, policy, numbers), it is a slogan; move it out of the headline.

## 6. Technical feasibility spikes (Heavy, or any risky integration)

Time-box ≤ 2 h each: gateway sandbox end-to-end; SMS provider delivery to 3 carriers; search engine Persian analyzer on 30 sample queries; PDF generation with Persian invoice; map/geocoding reachability from Iran; hosting reachability tests (see `iran-context.md`). A failed spike is a successful research result.

## 7. Research quality rules

1. Date every external fact; use `evidence-register.md` labels. 2. Prefer primary sources (docs, law text, own measurements). 3. Record sources that were unreachable. 4. Separate observation from interpretation. 5. Sample bias: friends, colleagues and the client are not users. 6. Stop when new sessions repeat earlier findings.
