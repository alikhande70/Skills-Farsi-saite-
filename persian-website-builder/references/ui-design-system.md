# UI, design system and mobile-first

Goal: an interface that is **usable, consistent, accessible, responsive, maintainable**. "Looks good" is the least important of the six. Outputs: tokens in code, component specs, `docs/06-design-system.md`. Gate: **G3**. Start only after G0–G2.

## 1. Build order (prevents page-by-page inconsistency)

Foundations (type, color, spacing, grid) → **tokens** → primitives (button, input, link, icon) → composites (card, form field, nav, modal, table) → templates → pages. A page may use only tokens and existing components. A new component requires: "I checked the catalog; nothing fits because …".

## 2. Design tokens

Three layers, named by role not by value:
1. **Primitive**: raw scales (`color.blue.600`, `space.4`, `font.size.300`).
2. **Semantic**: purpose (`color.text.default`, `color.surface.raised`, `color.action.primary`, `color.border.focus`, `color.feedback.error`).
3. **Component**: only when a component needs an override (`button.primary.bg`).

Delivery: CSS custom properties on `:root` (themeable at runtime), optionally a JSON source if a build step generates them. Tools and token file formats change; keep the contract (names + meaning), not the tool.

| Token family | Rules |
|---|---|
| Spacing | One scale from a base unit (4 or 8 px); components use scale steps only |
| Type | Scale tuned for Persian: body ≥ 16 px; paired line-heights (see `persian-ux.md` §2); few sizes (6–8); weights actually loaded; no `letter-spacing` |
| Color | Roles, not hues. Each ramp has ≥ 9 steps; **contrast pairs are precomputed** (`scripts/contrast.mjs`) and only listed pairs may be used for text |
| Radius / border / shadow | 3–4 steps each; elevation implies layering order |
| Z-index | Named layers (`dropdown`, `sticky`, `modal`, `toast`), never raw numbers |
| Motion | Duration and easing tokens; `prefers-reduced-motion` removes non-essential motion |
| Breakpoints | Set where the *content* breaks; prefer **container queries** for components so they adapt to their slot, not the screen |

Dark mode: add only if the audience/context justifies it (cost = double the contrast checks, images, shadows, brand). If added, it is a token theme, not a second stylesheet.

## 3. Color and contrast (WCAG 2.2 AA [E-002])

- Text 4.5:1; large text (≥ 24 px, or ≥ 18.66 px bold) 3:1; UI component boundaries, icons carrying meaning, and focus indicators 3:1 against adjacent colors.
- Never encode meaning by color alone (error = color + icon + text).
- Check hover/focus/disabled/visited states too, and text on images/gradients (use a scrim).
- Run `node scripts/contrast.mjs <fg> <bg>` on each text/background pair in the token file; fail the gate on any listed pair below threshold.

## 4. Components: the spec every component must have

Anatomy · variants (≤ 3 per axis) · sizes · **states** (default, hover, `:focus-visible`, active, disabled, loading, error, selected, read-only) · content rules (min/max text, long words, Persian digits, empty) · **RTL behaviour** (what mirrors) · **accessibility contract** (role, name, keyboard, ARIA, focus) · responsive behaviour · tests (unit + visual + a11y) · usage do/don't.

Core set by profile: Lite = button, link, input, textarea, select, checkbox/radio, card, nav, footer, form field + error, alert. Standard adds table, tabs, accordion, modal/dialog, pagination, breadcrumb, toast, skeleton, badge, search. Heavy adds data grid, date picker (Jalali), file upload, stepper/wizard, command/search palette, permission-aware UI.

### Pattern rules
- **Buttons**: one primary per view; label = verb + object; loading state keeps width (no layout shift); `button` for actions, `a` for navigation.
- **Modal**: use `<dialog>` where possible; focus moves in, is trapped, returns on close; Esc closes; not for complex multi-step flows on mobile (use a page or sheet).
- **Dropdown/select**: prefer native `<select>` on mobile/simple cases (best keyboard + OS UI); custom listbox only with the full ARIA pattern and tests.
- **Table**: real `<table>` with `<th scope>`; first column on the **right** in RTL; on mobile either a card layout (one record = one card) or horizontal scroll with a visible affordance and a sticky identifier column; numbers right-aligned in LTR islands or `text-align: end`; sort and filter state in the URL.
- **Notifications**: toasts never carry the only copy of an error; use `role="status"`/`"alert"` correctly; important messages persist; auto-dismiss ≥ 5 s and pause on hover/focus.
- **Icons**: one set, one stroke weight, SVG, each with a text alternative or `aria-hidden`; follow the mirror/no-mirror list (`persian-ux.md` §1).
- **Loading**: skeletons that match final layout; reserve image/embeds dimensions.

## 5. Layout

- Mobile-first CSS: base styles = smallest screen; enhance with `min-width` queries/container queries.
- Content width by measure: aim for a comfortable line length; verify with real Persian paragraphs (EXPERIMENTAL: do not copy a Latin "45–75 characters" number blindly).
- Grid: simple CSS grid/flex with tokens; avoid pixel-perfect absolute layouts; no fixed heights on text containers (text spacing and zoom [E-002]).
- Use `dvh/svh` for full-height mobile layouts and respect safe areas.

## 6. Mobile-first: design the small screen first, not shrink the large one

1. **Reference viewport**: design at 360 px wide first (verify against the site's own device data after launch); check 320 px reflow.
2. **Touch**: targets ≥ 44×44 CSS px recommended (RECOMMENDATION; platform guidelines are secondary sources), never below the WCAG 24×24 minimum [E-002]; ≥ 8 px between targets; no hover-only functionality.
3. **Thumb reach**: primary actions in the lower/lateral comfortable zone; destructive actions away from frequent taps; sticky bottom bars must not obscure focused fields [E-002 2.4.11].
4. **Keyboard and inputs**: correct `type`/`inputmode`/`autocomplete`/`enterkeyhint`; input font-size ≥ 16 px to avoid iOS auto-zoom (BEST PRACTICE; verify on device); keep the submit button reachable when the keyboard is open.
5. **Navigation**: ≤ 5 bottom destinations or a clear menu; search one tap away; no multi-level hover menus.
6. **Performance is a mobile feature**: set budgets at G3 (see `performance.md`); test on throttled mid-range Android profile (`iran-context.md` I-8).
7. **Images**: `srcset`/`sizes`, modern formats with fallback, explicit width/height, lazy-load below the fold only (never the LCP image), `fetchpriority="high"` for the LCP image (verify the effect).
8. **Network resilience**: forms survive flaky networks (retry, drafts), pages degrade without JS where feasible.

## 7. Preventing inconsistency (enforcement, not hope)

- Lint/CI: forbid raw hex colors, raw px spacing and unlisted font sizes outside the token files (stylelint-style rule; tool-agnostic).
- Visual regression on the component catalog at 360/768/1280 px, RTL (and LTR islands).
- A component catalog page is the source of truth; design system changelog; ownership.
- Periodic audit: count unique colors, font sizes, radii in the built CSS; the number should not grow without a decision record.

## 8. G3: UI gate

- [ ] Tokens + catalog exist; pages use only them; lint rule active.
- [ ] Every text/background pair checked with `contrast.mjs`; focus styles ≥ 3:1.
- [ ] Component specs include states, RTL and a11y contract.
- [ ] 360 px and 320 px reflow reviewed; touch targets measured.
- [ ] Persian gate items 1–3, 8, 12, 15 from `persian-ux.md` §10 pass on the catalog.
- [ ] Performance budget agreed (`performance.md`).
