# AI agent workflow: how to build the site with this skill

For an AI coding agent working alone or alongside people. The agent's value is speed and breadth; its characteristic failures are **confident fabrication, over-building, and claiming done without running anything**. This module is the guard against those.

## 1. Autonomy map

| The agent may do autonomously | The agent must verify before relying on it | The agent must ask/stop for a human |
|---|---|---|
| Draft research summaries and briefs from given sources | Library/API names, signatures, versions, config keys, CLI flags | Budget, contracts, vendor purchases |
| Write code, tests, fixtures, docs, ADRs | Payment/SMS provider APIs, status codes, amount units (E-027) | Legal entity details, legal text, privacy/terms wording |
| Run linters, tests, scanners, the scripts in `scripts/` | Statistics, market shares, benchmarks, browser support claims | Anything that sends real SMS/email, spends money, or publishes under a real name |
| Refactor, generate component variants, build catalogs | Security parameters (E-040..E-042), law-dependent rules (E-025) | Deleting data, irreversible migrations on real data |
| Produce Persian copy drafts using the glossary | Persian orthography, idioms, province/city data | Brand identity decisions, tone changes the owner has not approved |
| Review its own diffs with the audit list (§4) | Accessibility/Persian speech behaviour on real devices | Accepting a risk (the owner signs, with name and date) |

## 2. Hallucination hot spots and counter-measures

| Hot spot | Counter-measure |
|---|---|
| Non-existent or misnamed packages/functions (including **package-name hallucination**, which attackers can exploit by registering the invented name) | Before installing: confirm the package exists, its publisher, downloads/age, repository and license; read the installed types/docs; run the code |
| Outdated API usage (frameworks change quickly) | Check the **installed** version's docs/types; write a failing test first; do not trust memory of "current" syntax |
| Payment/SMS/maps vendor behaviour | Read the vendor's current docs; use the sandbox; record doc URL + date in the ADR; never invent endpoints or codes (E-027 is ASSUMPTION for exact codes) |
| Legal and compliance claims ("legally required", "PCI compliant", "WCAG compliant") | Replace with "to be confirmed by <client's lawyer / PSP / audit>"; cite the source if known; never present as settled |
| Invented facts about the business (addresses, phone numbers, ratings, testimonials, certifications, statistics) | Forbidden. Use clearly marked placeholders in non-production only, and fail the launch gate if any remain (AP-007) |
| Persian language quality (calques, wrong ZWNJ, register mixing, clichés) | Glossary + `ux-content.md` §6 patterns; mark launch copy "needs native review" in the handoff |
| Iran-specific data (province/city lists, postal rules, holidays, bank codes) | Use a maintained dataset; format-check only where rules are unverified; record the source and date |
| Security specifics (hash parameters, headers, CSP) | Use the OWASP cheat sheets (E-040..E-042); re-read at project start |
| Performance claims ("this makes it faster") | Measure before/after with the same tool and profile; keep the numbers |
| Browser/CSS feature support | Check the platform's compatibility data for the project's matrix (E-005) |

## 3. The working loop (per vertical slice)

1. **Plan** against the brief and the current gate; name the acceptance criteria and the Persian/edge cases that apply.
2. **Implement the smallest vertical slice** that could ship (UI → API → data), not horizontal layers across the whole app.
3. **Verify by running**: tests, linters, `node scripts/rtl-smells.mjs`, `contrast.mjs` on new color pairs; open the page at **360 px in RTL**; keyboard-tab through; try one failure path (offline, invalid input).
4. **Review** the diff with §4.
5. **Record**: ADR if a decision changed, assumptions register if you assumed something, changelog/handoff notes.
6. Repeat. Stop at gates and check their lists.

**Evidence of done** = commands executed with their results, test names, screenshots or measurements, and a list of **what was not verified and why**. If the environment cannot run a browser, network, or vendor sandbox, say so explicitly: "implemented, not verified".

## 4. Auditing AI-generated code (use on every diff)

| Area | Question |
|---|---|
| Existence | Do all imports/packages/endpoints/config keys exist in the **installed** versions? |
| Behaviour | Does it do what the acceptance criteria say? Would a test **fail** if the behaviour were broken? |
| Security | Server-side validation? Authorization on each object? Parameterized queries? No secrets/PII in logs, bundle, or repo? Safe error messages? |
| Persian/RTL | Logical CSS? Digit/ZWNJ/ی-ک normalization? Bidi islands isolated? No letter-spacing/italics? Money via the one formatter? |
| Dependencies | Needed? Size measured? Maintained? Licensed? Reachable from Iran/CI? |
| Errors | No swallowed exceptions or fake-success paths; failure states exist for every async call |
| Fake data | No placeholder text/people/numbers/URLs; no hardcoded credentials, IDs, domains |
| Simplicity | Any abstraction with one user? Any generic "framework" inside the project? Would a senior reviewer delete it? |
| Consistency | Uses tokens/components; no new one-off styles |
| Accessibility | Semantic elements, labels, focus, names in Persian |
| Performance | Bundle and query impact (N+1, unbounded lists, large images) |
| Licensing | Copied code/assets/fonts/icons: license permits use? |
| Hygiene | No debug logs, commented-out code, TODOs without owner, test credentials |

## 5. Preventing over-engineering

- **Name the requirement** for every component, dependency, abstraction, service or config option. No name → delete.
- **Rule of three**: abstract on the third duplication, not the first.
- **Profile proportionality** (`discovery.md` §1): a Lite site does not get a custom design system, a queue, a CMS and a database. Complexity budget (EXPERIMENTAL starting points): Lite ≤ 3 runtime dependencies beyond build tooling; Standard ≤ ~15; anything above needs an ADR line.
- Prefer platform features (`<dialog>`, `<details>`, `Intl`, CSS grid, native forms) over libraries.
- Prefer deleting code to adding code. Each cycle ask: *what can be removed without losing a Must?*
- Time-box exploration; commit to the simplest option that passes the gate; revisit only on a "change your mind when" trigger.

## 6. Documenting decisions (short, dated, evidenced)

- **ADR** per significant decision (`templates/adr.md`): context, options, criteria + weights *set before scoring*, decision, evidence with labels and dates, consequences, **change-if triggers**, owner.
- **Assumptions register** (`templates/project-brief.md`): ID, assumption, category, P(wrong), cost, verification, status.
- **Decision log** in `docs/decisions/`; link ADRs from the architecture doc; write for the next maintainer, not for a grader.
- Keep documents short; if a document does not change a decision or prevent a mistake, do not write it.

## 6b. Persian copy protocol

1. Start from the glossary and the brand voice rules. 2. Write natively, not from English. 3. Check against `ux-content.md` §6 (calques, clichés, vague CTAs, unprovable superlatives) and `persian-ux.md` §2 (ZWNJ, punctuation). 4. No fabricated claims. 5. Flag in the handoff: "AI-drafted Persian copy: native editor review required before launch" (mandatory for legal, medical, financial, or brand-critical text).

## 7. Boundaries

Do not send real SMS/email or take real payments outside an approved test; use sandboxes. Do not push to protected branches or force-push; do not delete data you did not create. Do not store or print secrets. Do not scrape or abuse third-party services. Do not recommend circumventing vendors' terms or legal restrictions: if a needed vendor is unavailable to the team or the audience, choose a lawful alternative or escalate to the owner [E-023]. Report constraints neutrally.

## 8. Handoff package

README (run, test, deploy) · architecture doc + ADRs · assumptions register and open risks · test and gate reports with evidence · launch checklist (completed) · maintenance calendar with owners · known gaps and "needs native review" list · credentials handover procedure (never in the repo).

## 9. Self-check at every gate

*What did I assume? What did I not verify? What would a hostile reviewer break first? What did I add that no requirement asked for? What would I be embarrassed to find in production?* Answer in writing; fix or record.
