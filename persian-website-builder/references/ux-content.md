# UX, content design and trust

Outputs: `docs/05-ux.md` (flows, states, copy deck, glossary, trust inventory). Gate: **G2**. Persian specifics live in `persian-ux.md`; this file is the language-independent method plus content and trust.

## 1. UX principles turned into checks

| Principle | Operational rule | How to check |
|---|---|---|
| Task first | Draw the primary journey; count steps, fields, decisions; remove every step that does not serve the task or a legal/payment need | Walkthrough: can a new user finish it on a phone in one sitting? |
| Cognitive load | One primary action per screen; defaults for common choices; progressive disclosure for rare ones; chunk long forms | Tester can name the primary action in 5 s |
| Discoverability / affordance | Interactive things look interactive; icon-only buttons only for universally known icons; always a text label or accessible name | Five-second test; remove icons' colour: still clear? |
| Feedback | Every action acknowledges immediately; long operations show progress; success states say what happens next | Click everything: any silent action is a bug |
| Error prevention | Constrain input (types, pickers, masks that accept paste), confirm only destructive/costly actions, prefer **undo** to confirm | List destructive actions; each has undo or confirm |
| Recovery | Errors say what happened, why (if helpful), how to fix; input is preserved; a way out exists (support, alternative) | Induce each error; read the message cold |
| Consistency | Same thing, same name, same place, same behaviour (design system) | Glossary + token/component audit |

Numeric rules of thumb (response ≈ 0.1 s feels instant, ≈ 1 s keeps flow, ≈ 10 s loses attention) are widely used heuristics (BEST PRACTICE, NN/g tradition; not re-fetched). Use them to choose between "nothing", "spinner/skeleton" and "progress with explanation".

## 2. Forms (most revenue is lost here)

- One column, label above field, label always visible (a placeholder is a hint, never the label).
- Ask the minimum. Every field needs a reason you can state. Optional fields are marked **optional** (or all required fields are marked, consistently).
- Right input type + `inputmode` + `autocomplete` token + `enterkeyhint`. LTR data fields `dir="ltr"` (see `persian-ux.md` §5).
- Validate on blur and on submit; never block typing; never wipe the field. Show the error next to the field and in a summary on submit with focus moved to it.
- Prefer an enabled submit button that explains problems over a disabled one that hides them.
- Duplicate-submit protection: disable on submit **and** make the server idempotent.
- Long forms: save progress, show steps, allow going back without data loss.
- Avoid puzzle-CAPTCHAs on the primary path (conflicts with WCAG 3.3.8 [E-002] and with I-2 [no foreign runtime dependency]); prefer rate limiting, honeypots, proof-of-work or invisible server-side risk checks you host yourself.

## 3. States: every screen has more than the happy path

For each template (from `product-ia.md`) specify: **loading** (skeleton if > ~300 ms; reserve space to avoid CLS), **empty** (first use vs no results vs filtered-out; each with a next action), **error** (retry, contact, preserve work), **offline/slow** (message + retry), **partial** (some data failed), **permission denied** (why, what to do), **success/confirmation** (what happened, order/reference number, what next, how to get help).

## 4. Onboarding

Only if the product needs learning. Show value first; defer account creation until it unlocks something the user already wants; contextual hints over tours; skip is always available.

## 5. Evaluating UX (without pretending to be a lab)

1. **Heuristic review** by two people against the table in §1 and the 10 usability heuristics (NN/g), severity S1 (blocks journey) / S2 (major friction) / S3 (minor).
2. **Task test**: ≥ 5 target users × 3 tasks on a real phone; record success, time, errors, quotes. Run in rounds (3 → fix → 3) rather than once. The oft-quoted "5 users find ~85% of problems" is a heuristic about discoverable problems, not a guarantee.
3. **Funnel & behaviour after launch** (`ops.md`): drop-off by step, error rate per field, search with no results, rage clicks. Metrics trigger a hypothesis, then a test, not an automatic redesign.
Gate rule: no open S1; S2 only with owner and date.

## 6. Content design

### Voice and register (Persian)
- Default to polite-friendly «شما», short sentences, active verbs, one idea per sentence. Decide the brand voice once (formal / warm / playful) and write it into the content guide with 5 do/don't examples.
- **Terminology glossary** (واژه‌نامه) is mandatory: one term per concept (e.g. سبد خرید, ثبت سفارش, پیگیری سفارش, ورود/ثبت‌نام). Mixed synonyms are UX bugs.
- Write Persian natively. Do not translate English UI copy word by word.

### Translationese and AI-cliché patterns to avoid (EXPERIMENTAL list: extend per project; **a native editor must review launch copy**)
| Avoid | Why | Prefer |
|---|---|---|
| «ما در اینجا هستیم تا به شما کمک کنیم» | calque of "We're here to help"; says nothing | The concrete help: «سؤالی دارید؟ همین حالا بپرسید» + channel and hours |
| «تجربه‌ای بی‌نظیر را رقم بزنید» | empty superlative; AI-cliché | State the benefit: «ارسال تا ۴۸ ساعت در تهران» (only if true) |
| «در دنیای امروز…» openings | filler | Start with the point |
| «خطایی رخ داده است» alone | passive, no help | «سفارش ثبت نشد. اتصال اینترنت را بررسی کنید و دوباره امتحان کنید.» |
| «نتیجه‌ای یافت نشد» alone | dead end | «موردی پیدا نشد. فیلترها را کم کنید یا عبارت دیگری را جست‌وجو کنید.» |
| Vague button «ارسال» / «تأیید» | no object | «ثبت سفارش», «دریافت کد تأیید», «ذخیره تغییرات» |
| Unprovable superlatives (بهترین، ارزان‌ترین، تضمینی) | credibility and potential legal exposure | Evidence or numbers; ask the client's lawyer for regulated claims |
| Mixed formal/colloquial register in one screen | feels sloppy | One register per product |
| Wrong ZWNJ/punctuation, Latin `? ,` | typography errors | See `persian-ux.md` §2 |

### Page and component copy
- **Headline**: states what it is and for whom or what you gain, concretely. **CTA**: verb + object, specific, one primary per view; avoid mouse-only verbs on touch contexts.
- **Product copy**: facts first (size, material, price, delivery), then story. Every claim has a source on the page.
- **FAQ**: built from real support questions; the first sentence of each answer is the answer; link to the policy page for details; no FAQ that exists only for SEO.
- **Error/empty/confirmation microcopy**: write the full deck up front (`docs/05-ux.md`), not at the end of development.
- **Placeholder rule**: no lorem ipsum, fake testimonials, fake counters in production (AP-007). If content is not ready, the page is not ready.

## 7. Trust and credibility (commercial sites)

Add trust content **because a real need exists** (legal, payment-provider, or user hesitation observed in research), and fill it with **real** content, never boilerplate copied from another site (wrong facts, legal exposure).

| Site type | Likely needed (verify each against client, law, PSP) |
|---|---|
| Any commercial site | Who we are (real people/entity), ≥ 2 contact channels + hours, privacy statement matching actual data practices |
| Shop / paid services | Shipping and delivery details, return/refund policy consistent with consumer withdrawal rules [E-025], supplier/business information [E-025], payment explanation that is accurate, Enamad badge **only if issued** and linked to the verification page [E-026] |
| Marketplace | Seller verification rules, dispute process, fee transparency |
| Health/finance/education/legal | Credentials, licenses, review/editorial process; regulatory statements from the client's lawyer |
| SaaS | Security/uptime page (true), data location, pricing transparency, status page |

Never: fake scarcity timers, fake "N people are viewing", invented ratings/reviews, a badge image without verification, copied policy text. They destroy trust when discovered and may be unlawful (ask counsel).

## 8. G2: UX gate

- [ ] Primary journey flow documented; steps/fields counted and justified.
- [ ] All template states specified; copy deck written; glossary agreed.
- [ ] Heuristic review done; ≥ 1 task-test round on real phones; no open S1.
- [ ] Forms follow §2; Persian field rules from `persian-ux.md` §5 applied.
- [ ] Trust inventory complete per §7 with owners for real content.
