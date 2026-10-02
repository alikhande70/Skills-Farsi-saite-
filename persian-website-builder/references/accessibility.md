# Accessibility

Baseline: **WCAG 2.2 level AA** [E-002] as a design constraint from discovery onward, not a review at the end. Output: `docs/a11y-report.md`. Gate: **G-A11Y** (inside G5).

Claim discipline: say "designed to meet WCAG 2.2 AA; known gaps: …" unless a full evaluation supports a conformance claim. The legal status of accessibility duties for Iranian sites was **not verified** here: treat accessibility as a quality, reach and risk-reduction requirement, and ask the client's lawyer if a legal duty is claimed.

## 1. Where accessibility enters each phase

| Phase | Accessibility work |
|---|---|
| Discovery | Ask about users with disabilities, older users, low-literacy, bright-sun/low-bandwidth contexts |
| IA/UX | Landmarks, heading outline, flows that work without drag, time limits, authentication without cognitive tests |
| UI | Contrast pairs, focus styles, target sizes, text resizing, motion preferences |
| Build | Semantic HTML first; ARIA only to fill gaps; focus management |
| Test | Automated + keyboard + screen-reader smoke + zoom/reflow |
| Launch/maintain | Statement with honest gaps; regression checks on every release |

## 2. Semantic HTML first

- Landmarks: `header`, `nav`, `main` (one), `footer`, `aside`; label multiple `nav`s.
- One `h1`; headings nest without skipping levels; headings describe content, not styling.
- Buttons for actions, links for navigation; lists for lists; `<label for>` for every control; `<fieldset>/<legend>` for grouped radios/checkboxes; tables with `<th scope>` and `<caption>`.
- Native widgets before custom: `<dialog>`, `<details>`, `<select>`, `<input type=…>`.
- **ARIA**: no ARIA is better than wrong ARIA; use it only when native HTML cannot express the role/state, and implement the full keyboard pattern. Names via visible text where possible; `aria-label` only when there is no visible text (and then in Persian).
- DOM order = visual and reading order. In RTL, avoid `flex-direction: row-reverse`, `order`, and positive `tabindex` to simulate layout: they desynchronize focus and reading order.

## 3. Keyboard and focus

- Everything operable by keyboard; no traps; Esc closes layers; visible `:focus-visible` indicator with ≥ 3:1 contrast.
- Skip link to `main`. Sticky headers/footers/cookie bars must not hide the focused element: use `scroll-padding`/`scroll-margin` [E-002: 2.4.11].
- Focus management: on SPA route change move focus to the new page's heading or main; on dialog open move focus in and return it on close; on async errors move focus to the error summary.
- Target size ≥ 24×24 CSS px minimum [E-002: 2.5.8]; design for 44 px. Any drag interaction (sliders, reordering, maps) has a single-pointer alternative [E-002: 2.5.7].

## 4. Persian-specific points

- Set `lang="fa"` on the page and `lang="en"` (etc.) on foreign-language fragments so screen readers switch voice.
- **Persian speech support varies by OS/screen reader/voice** and is not verified here (ASSUMPTION): test the three core flows with the actual target stack (NVDA + a Persian voice if available, VoiceOver, TalkBack) and record what is read correctly (digits, dates, prices, the Persian comma and ezafe-heavy phrases).
- Icon-only buttons and images get Persian accessible names that describe **purpose**, not "تصویر …". Decorative images: `alt=""`.
- Strike-through/old prices and badges need text for assistive tech (e.g. visually hidden «قیمت قبلی»).
- Do not split a sentence or number into styled spans that read as separate fragments; keep money in one text node (`formatMoney`).
- Mixed-direction strings: `<bdi>` keeps reading order sane for both visual and speech order.

## 5. Forms, errors, authentication

- Programmatic label + hint (`aria-describedby`); errors tied to fields (`aria-invalid`, `aria-describedby`), error summary receives focus after a failed submit; error text states how to fix.
- `autocomplete` tokens on personal data fields [WCAG 1.3.5]; do not make users re-enter information already given in the same session [E-002: 3.3.7].
- **Accessible authentication** [E-002: 3.3.8]: allow paste and password managers; no puzzle/transcription tests without an alternative; for OTP use `autocomplete="one-time-code"`, accept pasted codes, generous expiry, resend control, and an alternative method where possible.
- Time limits (OTP expiry, sessions, carts): warn, allow extend, never silently lose the user's work.

## 6. Color, contrast, zoom, motion

- Text 4.5:1, large text 3:1, UI/icons/focus 3:1 (`scripts/contrast.mjs`); not color alone; test `forced-colors` and, if offered, dark mode.
- Reflow at 320 CSS px width (400% zoom) without two-direction scrolling (except data tables/maps); text-spacing overrides must not clip Persian text (no fixed heights; test line-height 1.5 + larger word/letter spacing); use `rem`/relative units.
- Honor `prefers-reduced-motion`; no autoplay with sound; no flashing > 3/s; provide captions/transcripts for audio/video.

## 7. Testing method (what each layer can and cannot do)

| Layer | Catches | Misses |
|---|---|---|
| Automated (axe-style engine, Lighthouse a11y, linting) | Missing names/labels/alt, many contrast, some ARIA misuse, `lang` | Meaning (is the alt useful?), keyboard flows, focus order, cognitive load. Do not quote a fixed "% caught"; studies vary |
| Keyboard pass (tab, shift+tab, Enter/Space/Esc/arrows) on the core flows | Focus order, traps, hidden focus, missing operability | Screen-reader semantics |
| Screen-reader smoke (3 core flows × target readers) | Names, roles, state announcements, reading order, Persian speech problems | Full audit coverage |
| Zoom/reflow/text-spacing/contrast manual checks | Layout failures, clipped text | |
| People who use assistive tech (when possible) | What really blocks them | |

Evidence for the gate: `docs/a11y-report.md` listing pages/flows tested, criteria checked, failures with severity, fixes, **known gaps**, date, and tools/versions.

## 8. G-A11Y

- [ ] Automated scan: zero critical/serious findings on all templates (record tool + version).
- [ ] Keyboard pass and screen-reader smoke on the primary journey; results written down.
- [ ] Contrast pairs verified; focus visible; targets measured; reflow at 320 px.
- [ ] Forms/errors/authentication meet §5; no cognitive-test blockers.
- [ ] Persian speech/`lang` findings recorded; known gaps listed in the public statement if applicable.
