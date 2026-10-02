# Cycle procedure (read this first in every two-hour run)

You start cold each cycle. This file turns the standing task into concrete steps so effort goes into improving the skill, not into re-deriving the process. The standing task is in the original instruction (Persian) and is summarized here.

**Mission**: maintain `persian-website-builder/`, a decision-and-execution skill for building Persian websites end to end. Success = an agent given "build me a professional Persian site" can understand the need, research, choose architecture, design UX/UI, build, secure, test, deploy and operate, without inventing the method each time.

## Hard rules

1. **Anti-inflation**: add content only if it reduces errors, improves decisions, raises quality, increases executability, covers a failure mode, or removes ambiguity. Otherwise do not add. If a module needs no change, deepen another or test a new scenario. Never add text only to have output.
2. **Evidence**: label every non-obvious claim (FACT / BEST PRACTICE / RECOMMENDATION / ASSUMPTION / EXPERIMENTAL). FACT needs a primary source or a reproducible experiment, with date. Add or update IDs in `references/evidence-register.md`.
3. **Reproduce hazards**: "X breaks in RTL/Persian" claims need a fixture (see E-018). Two of six bidi claims written from memory failed in run 1.
4. **Mechanical integrity**: run `node meta/tools/lint-skill.mjs` and all tests before and after your edits. Errors must be zero before commit.
5. **Never invent** vendor behaviour, law, statistics or Persian orthography facts. If a source is unreachable, record that in the register and keep ASSUMPTION.
6. **Versioning**: SemVer-like `0.MINOR.PATCH`. MINOR = new module/gate/tool/framework or behaviour-changing guidance. PATCH = corrections, evidence refresh, wording. **No bump** for meta-only notes. Keep `metadata.version` in `SKILL.md` equal to the top entry of `meta/CHANGELOG.md` (the linter checks).
7. Work on the designated git branch; commit with a clear message; push with `git push -u origin <branch>`. Do not open a pull request unless asked.

## The cycle

| Step | What to do | Concrete commands / outputs |
|---|---|---|
| 1 Read | Last entry of `meta/RUN-LOG.md`, `meta/OPEN-QUESTIONS.md` (top), `meta/RED-TEAM.md` (recent), `SKILL.md` §10 maturity table | `git log --oneline | head`; `node meta/tools/lint-skill.mjs --today=$(date +%F)`; `node --test persian-website-builder/scripts/*.test.mjs` |
| 2 Audit | Look for: missing topics, wrong or outdated advice, contradictions, ambiguity, duplication, overengineering, unexecutable steps, uncovered failure modes, new edge cases. Stale-evidence warnings from the linter are findings | Write findings in the run log |
| 3 Research | Only what needs new evidence: the NEXT RESEARCH TARGET plus any stale high-volatility claim. Prefer primary sources (docs, specs, law text, own experiments). Parallelize searches | `WebFetch` on primary pages; Node/Playwright experiments |
| 4 Improve | Edit the skill. Smallest change that removes the problem. Update the register and maturity table | |
| 5 Challenge | Red Team: pretend a professional team follows the skill literally. Where does it lead to a wrong decision or weak project? Record at least one attack in `meta/RED-TEAM.md` and apply the fix to the skill | |
| 6 Test | Run the skill on at least one hypothetical project (new scenario or a re-run of an old one with the changed text) and, where possible, execute things (tools, fixtures, browser) rather than reading | Add to `meta/VALIDATION.md` |
| 7 Simplify | Remove or merge anything unnecessary; shorten; check `SKILL.md` size budget (< 500 lines, < ~5000 tokens) | linter warns on size |
| 8 Integrate | Cross-references resolve, IDs consistent, tables of contents and routing in `SKILL.md` updated, tests green | linter + tests |
| 9 Document | `meta/CHANGELOG.md` (what, why, evidence, uncertainty), `meta/RUN-LOG.md` entry (Persian, in the report template) | |
| 10 Next | Choose the most important open question for the next run; write it at the top of `OPEN-QUESTIONS.md` | |

## Choosing what to work on (decision rule)

1. A **failing test or lint error** from the previous cycle.
2. A **stale or contradicted high-volatility claim** (linter warning, or a source you find has changed).
3. The **top item** in OPEN-QUESTIONS (the NEXT RESEARCH TARGET).
4. The **weakest module** by the maturity table that has the highest consequence of error (payments, security, money, legal, Persian input).
5. A **new validation scenario** that exercises a part of the skill not yet walked (see VALIDATION.md coverage list).
If two items are equal, take the one whose failure would be more expensive for a real project.

## Final report format (to the user, in Persian)

Skill Version · Research Performed · Audit Findings · Changes · Removed / Simplified · Evidence · Red Team Result · Validation · Remaining Gaps · Next Research Target. Be factual: say what was **not** verified.

## Environment notes (learned in run 1)

- `node --test <dir>` does not work as a directory argument in Node 22 here; use the glob `persian-website-builder/scripts/*.test.mjs`.
- Playwright resolves via `NODE_PATH` through `createRequire`; Chromium is pre-installed (do not run `playwright install`). Browser tests skip (not fail) when unavailable.
- Some Iranian vendor docs may be unreachable from the sandbox (HTTP 503 seen); note it, do not paper over it.
- A Persian-capable font in the sandbox is DejaVu Sans only (fine for bidi order, not for typography judgements).
- Search results include low-quality blogs; downgrade or ignore them (see E-023).
