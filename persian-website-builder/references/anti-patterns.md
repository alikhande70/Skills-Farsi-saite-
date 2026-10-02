# Anti-pattern library

Persistent catalogue of recurring mistakes. **Use it in reviews** (diff review, gate review). Add entries only for mistakes that are (a) real and recurring, (b) detectable, and (c) not already covered. IDs are permanent; never renumber. Format: symptom you can detect → why it hurts → what to do instead.

| ID | Anti-pattern | Detect by | Why it hurts | Instead |
|---|---|---|---|---|
| AP-001 | **Beautiful UI, weak UX** | Great screenshots; task test fails; funnel drop-off at forms/checkout | Visual polish does not complete tasks | Design flows and states first (`ux-content.md`); test tasks on phones before polishing |
| AP-002 | **Dependency bloat** | Package for a 5-line task; bundle > budget; many transitive deps | Size, security surface, upgrade cost, registry reachability | Admission check (`engineering.md` §1); use platform features |
| AP-003 | **Overengineering** | Abstractions with one user; services/queues/CMS on a Lite site; generic internal frameworks | Cost, bugs, slow change | Name the requirement; profile proportionality (`ai-agent-workflow.md` §5) |
| AP-004 | **Premature optimization / scaling** | Caching, sharding, micro-optimizations without measurements | Complexity without benefit | Measure first; fix queries/indexes before architecture |
| AP-005 | **Desktop-first, mobile patched later** | 360 px layout is a squeezed desktop; hover-only UI; tiny targets | Most traffic is mobile (verify per project) | Design the smallest viewport first (`ui-design-system.md` §6) |
| AP-006 | **Giant component / god module** | One file doing fetch + business rules + markup; hard to review | Bugs hide; no reuse; no tests | Split by responsibility; push rules to services |
| AP-007 | **Fake or placeholder data left in production** | lorem ipsum, `test@example.com`, `0912 000 0000`, invented reviews/counters, sample prices | Destroys trust; legal exposure | Content plan with owners; pre-launch placeholder scan (EC-092) |
| AP-008 | **Poor error handling** | Empty `catch`; spinners that never end; "خطایی رخ داد" only; success shown after failure | Silent data loss; support load | Error taxonomy, states and copy (`engineering.md` §1, `ux-content.md` §3) |
| AP-009 | **Hardcoded values** | Magic numbers/URLs/prices/credentials/`*10` rial↔toman in code | Breaks on change; leaks secrets | Config, tokens, one `money` module |
| AP-010 | **Missing server-side validation / authorization** | Rules only in the client; endpoints check login but not ownership | IDOR, fraud, data leaks | Validate and authorize on the server for every object (`security.md` §3) |
| AP-011 | **Inconsistent design** | Many button styles, ad-hoc colors/spacings, one-off components | Slower work, lower trust, a11y gaps | Tokens + catalog + lint (`ui-design-system.md` §7) |
| AP-012 | **SEO bolted on after build** | JS-only content, URL scheme chosen late, no redirects/canonical plan | Expensive rebuilds, traffic cliffs | SEO as architecture at G1/G4 (`seo.md`) |
| AP-013 | **Accessibility bolted on after build** | Div-buttons, no labels/focus, color-only states | Exclusion, rewrite cost | Semantic HTML and checks per phase (`accessibility.md`) |
| AP-014 | **RTL patched late** | `margin-left`, `float:left`, `text-align:left`, mirrored screenshots only | Endless bidi bugs | Logical CSS from line one; `rtl-smells.mjs` in CI |
| AP-015 | **Foreign runtime dependency on a critical path** | Google Fonts/analytics/captcha/CDN scripts required to render or log in | Fails when reachability breaks (E-020, E-021) | I-2: self-host; block-foreign test |
| AP-016 | **Float money / hardcoded rial↔toman conversion** | `price * 0.1`, floats, `/10` in components, unit unclear in UI | Rounding errors, 10× bugs, redenomination breakage (E-024) | Integer minor units + denomination + single formatter |
| AP-017 | **Trusting the client or the callback for payment truth** | Marking paid from redirect params; amount taken from the request | Free orders, double fulfilment | Server-side verify with DB amount; idempotency (`iran-context.md` I-4) |
| AP-018 | **Copying competitors' UI/policies without a mechanism** | "They have X"; copied legal text | Wrong fit, wrong facts, legal risk | Pattern → mechanism → condition → decision (`research.md` §2) |
| AP-019 | **Machine-translated or cliché Persian copy** | Calques, «تجربه‌ای بی‌نظیر», vague CTAs, register mixing | Low trust, low clarity | Glossary + patterns + native review (`ux-content.md` §6) |
| AP-020 | **Persian-only character validation for names** | Regex `[؀-ۿ ]+` on names/addresses | Rejects Latin, Kurdish, Azeri names; legit users blocked | `\p{L}\p{M}` + normalization (`persian-ux.md` §5) |
| AP-021 | **Technology chosen by popularity or résumé** | No criteria/weights; "everyone uses it" | Wrong fit, unmaintainable | D-STACK with weights set first |
| AP-022 | **Unverified AI claims, invented packages/APIs/facts** | Code that never ran; citations nobody checked | Bugs, supply-chain risk, false statements | `ai-agent-workflow.md` §2–§4 |
| AP-023 | **Metrics without decisions** | Dashboards nobody acts on; vanity counters | Noise, wrong incentives | Measurement plan row per decision (`ops.md` §7) |
| AP-024 | **Ignoring performance until the end** | Budgets absent; Lighthouse first run at launch | Costly rework, poor mobile UX | Budgets at G3; CI checks (`performance.md`) |
| AP-025 | **Untested backups / no restore drill** | "We have backups" but never restored | Data loss on the day it matters | Restore drill before launch and quarterly |
| AP-026 | **Scope growth by small additions** | Many "just one more" items; slipping dates | Never launches; quality drops | Scope freeze + admission rule (`product-ia.md` §2) |
| AP-027 | **Checklist as proof** | Boxes ticked without evidence; gates with no artifacts | False assurance | Each criterion needs evidence; waivers are signed (`quality-gates.md`) |
| AP-028 | **Staging settings shipped to production** | `noindex`, debug on, sandbox keys, test banners on prod; or prod crawlable staging | SEO invisibility, data leaks | Environment checks in the launch list; staging behind auth |
