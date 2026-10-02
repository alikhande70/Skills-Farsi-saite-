# Persian Web Ecosystem

زیرساخت Agent-Native برای ساخت وب‌سایت فارسی: Agent درخواست را می‌فهمد، منابع مناسب را انتخاب و ترکیب می‌کند، سایت می‌سازد و کیفیت خروجی را با **شواهد قابل بررسی** می‌سنجد.
An agent-native infrastructure for building Persian (RTL) websites: understand the request, choose and combine resources, build the site, and judge the output with verifiable evidence.

بنای فعلی بر **Skill** است (`persian-website-builder/`)، که پوشش محصول، UX، امنیت، پرداخت، backend، انتشار و نگهداری را دارد. پنج بخش منطقی پروتکل و وضعیت هر کدام در `meta/MASTER-BRIEF.md` و `meta/ROADMAP.md` آمده است.

| بخش | نقش | وضعیت امروز |
|---|---|---|
| Skill | تصمیم‌گیری و روش ساخت | `persian-website-builder/` |
| Contract | قواعد و قرارداد نسخه‌دار مشترک | مرحلهٔ ۱ (ساخته نشده) |
| Foundry | منابع، Registry، Resolver، Recipe | مرحلهٔ ۱ و ۲ (ساخته نشده) |
| Evaluator | آزمون و حکم با شواهد | هسته: `scripts/verdict.mjs`، `meta/tools/run-tests.mjs` |
| Corpus | محتوا و سناریوهای فارسی | `corpus/` |

## Layout

```
persian-website-builder/   # THE SKILL (installable): SKILL.md, references/, templates/, scripts/
corpus/                    # Persian scenarios and content (dev scenarios are NOT independent holdout)
sites/                     # built sample sites, each with its own limits and tests
meta/                      # how the project evolves (not shipped to the agent)
  MASTER-BRIEF.md          # the mother brief (owner's goals and protocol rules)
  ROADMAP.md               # single source of truth for the plan, stage and next action
  PROCEDURE.md             # mechanics of each scheduled Builder run
  RUN-LOG.md  CHANGELOG.md  OPEN-QUESTIONS.md  RED-TEAM.md  VALIDATION.md  DESIGN-DECISIONS.md
  tools/                   # lint-skill.mjs, run-tests.mjs (trustworthy runner + evidence)
  evidence/                # test reports bound to exact content and environment
```

## Install the skill

Copy or symlink `persian-website-builder/` into the agent's skills location (Claude Code: `~/.claude/skills/persian-website-builder/` or `.claude/skills/persian-website-builder/`). The format follows the Agent Skills specification.

## Verify the repository

```bash
node meta/tools/lint-skill.mjs      # integrity of the skill (links, IDs, versions, evidence dates)
node meta/tools/run-tests.mjs       # authoritative test verdict: PASS | FAIL | INCOMPLETE
node meta/tools/run-tests.mjs --verify=meta/evidence/tests-all.json   # is a stored result valid for THIS content and environment?
```

**Read results strictly:** only `PASS` is a pass. A skipped test (for example no browser) is `INCOMPLETE` (exit 3), not a success; raw `node --test` prints `ok` and exits 0 for skipped tests, so do not use it as evidence. Check tools (`security-smoke`, `page-audit`, `rtl-smells`) use the same model: PASS / CONDITIONAL / FAIL / INCOMPLETE with exit codes 0 / 0 / 1 / 3 and 2 for "could not run".

## Roles and limits

The Builder (an AI agent working on the schedule in `meta/PROCEDURE.md`) writes the code and its own tests. **Builder-side validation and red-team notes are not independent audit.** Independent evaluation, with a private scenario the Builder cannot see, is stage 4 of the roadmap. All sample data is fictional; no real payments, messages or medical data are used.

License: not yet chosen (owner decision, see `meta/OPEN-QUESTIONS.md` OQ-19).
