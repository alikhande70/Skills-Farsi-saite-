# Quality gates

A gate is a **decision point with evidence**, not a ritual. A criterion is passed only when an artifact (command output, report, screenshot, measurement, signed decision) is attached. "Looks fine" is not evidence (AP-027).

## 1. Gate map

| Gate | Name | You may not … until it passes | Criteria live in |
|---|---|---|---|
| **G0** | Discovery | start UX/UI or architecture | `discovery.md` §6 |
| **G1** | Scope & IA | design screens; freeze MVP | `product-ia.md` §8 |
| **G2** | UX | start visual UI | `ux-content.md` §8 |
| **G3** | UI / design system | build pages | `ui-design-system.md` §8 |
| **G4** | Architecture | implement the core | `architecture-decisions.md` §13 |
| **G5** | Pre-production | launch with real users or money | G-FA, G-A11Y, G-PERF, G-SEO, G-SEC, G-TEST + `ops.md` §9 |
| **G6** | 30-day review | declare the launch successful | `ops.md` §10 |

Order: G0 → G1 → (G2 ∥ G4) → G3 → implementation by vertical slices → G5 → launch → G6. G2 and G4 may run in parallel; implementation of the core needs G0, G1, G2, G3 (tokens + catalog), G4.

## 2. The release floor (applies to every profile, non-negotiable)

1. No placeholder or invented content; legal/trust information is real (AP-007).
2. HTTPS, security headers, no secrets in the client, server-side validation and authorization on all non-public data (`security.md` §3, §6, §7).
3. Persian gate items 1, 2, 4, 5, 6, 7, 9 pass (`persian-ux.md` §10), plus the rest relevant to the product.
4. Keyboard operable, labels, contrast, `lang`/`dir`, alt text (`accessibility.md`).
5. LCP/INP/CLS meet targets in lab on the mobile profile for the key templates (`performance.md`).
6. Intended pages indexable; staging `noindex`/auth removed from production (AP-028); sitemap and canonicals right (`seo.md`).
7. Backups exist and a restore has been done; rollback is written and rehearsed (`ops.md` §4).
8. Monitoring and alerts reach a named human; error pages exist.
9. Critical journeys work with international/foreign hosts blocked (I-2) if the audience is in Iran.
10. If money moves: payment tamper/replay/double-callback tests pass; amount units verified in the sandbox (EC-070..074).

## 3. Profile adjustments (proportionality)

| Profile | Gates |
|---|---|
| **Lite** | G0–G4 may be merged into one **spec gate** (one page: outcome, audience, pages, content owners, stack choice, risks). G5 is full but light: the release floor, Persian gate, a11y basics, security basics, perf lab check, SEO basics, launch list. G6 optional (one review). |
| **Standard** | All gates. Manual keyboard + screen-reader smoke on the primary journey; staging environment; authz matrix; payment fault tests if payments. |
| **Heavy** | All gates + independent security review/penetration test, load and failure testing (fault injection), staged rollout, disaster-recovery drill, data-protection review, formal ADR set and runbooks. |

## 4. Gate record (one file per gate: `docs/gates/G<n>.md`)

```
Gate: G5      Date: 2026-__-__      Reviewer(s): ____      Profile: Standard
Build/commit: ____

| Criterion | Result (pass/fail/waived/N-A) | Evidence (link, command + output, report) | Notes |
|---|---|---|---|

Waivers (each needs a named owner and an expiry):
| ID | Criterion waived | Risk accepted | Owner (name) | Expires |

Decision: PASS / PASS WITH WAIVERS / FAIL
Open follow-ups: ____
```

Rules: a **FAIL** blocks the dependent work. A **waiver** is a risk acceptance by a named human (not the agent) with an expiry; waiving the release floor needs the project owner. Re-run a gate when its inputs change materially (e.g. a new payment provider re-opens G4 and the payment parts of G-SEC/G-TEST).

## 5. Gate review prompts (for the person or agent running the gate)

What evidence would convince a skeptical reviewer? Which criteria passed because nobody looked? What changed since the last gate? Which assumptions in the register are still unverified, and are they still acceptable? What is the cheapest test that could prove us wrong?

## 6. Executable evidence (attach outputs to the gate record)

| Gate item | Tool (paths relative to the skill directory) | Notes |
|---|---|---|
| Persian/RTL static smells | `node scripts/rtl-smells.mjs <src>` | Heuristic; justify every `rtl-ignore` |
| Page-level Persian, a11y basics, overflow at 320/360 px, foreign-host dependency, placeholders | `node scripts/page-audit.mjs <url\|file>` per template | Default mode blocks foreign hosts (I-2); needs Playwright |
| Mixed-direction strings render as intended | `node scripts/bidi-order.mjs <file> [selector]` | Real engine; also re-run after browser upgrades |
| Contrast pairs | `node scripts/contrast.mjs <fg> <bg>` | For every text/background pair in the tokens |
| Headers, cookies, exposed paths, CORS | `node scripts/security-smoke.mjs <staging-url>` | Authorized targets only |
| Input helpers behave | `node --test scripts/*.test.mjs` | Copy the helpers you ship and keep their tests |

**How to read a tool result at a gate:** PASS = every executed check passed and none was skipped. CONDITIONAL = attach the listed limits to the gate record; the release floor needs a named human to accept each limit, or a re-run that removes it (e.g. `security-smoke` on the **HTTPS staging URL**, not localhost). INCOMPLETE or exit code 2/3 = no evidence: the criterion stays open. A skipped test is not a passed test.

A tool run proves only what it checks. Everything it cannot check (keyboard flow, screen readers, copy quality, business logic, payment behaviour) still needs a human or a project-specific test.
