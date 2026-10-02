# Skills-Farsi-saite-

یک **Skill** برای AI Agent و تیم‌های توسعه که ساخت کامل وب‌سایت فارسی را از ایده تا انتشار و نگهداری پوشش می‌دهد: تحقیق، معماری، UX، UI، امنیت، SEO، عملکرد، تست، استقرار و پایش.
A skill for AI agents and engineering teams that covers building Persian (RTL) websites end to end. It is a **decision-and-execution system**, not a style guide: frameworks with change-triggers, quality gates with evidence, an evidence register with dates, and tested helpers.

## Layout

```
persian-website-builder/        # THE SKILL (this is what you install)
  SKILL.md                      # router: rules, lifecycle, gates, baselines, tools, maturity
  references/                   # 21 focused modules, loaded on demand
  templates/                    # brief + assumptions, ADR, launch checklist, starter-lite page
  scripts/                      # tested helpers (Node >= 18); 2 need Playwright
meta/                           # how the skill evolves (NOT shipped to the agent)
  PROCEDURE.md                  # runbook for the recurring (every ~2 h) improvement cycle
  CHANGELOG.md  RUN-LOG.md  OPEN-QUESTIONS.md  RED-TEAM.md  VALIDATION.md  DESIGN-DECISIONS.md
  tools/lint-skill.mjs          # integrity linter (links, IDs, versions, evidence staleness)
```

## Install

Copy or symlink the `persian-website-builder/` directory into the agent's skills location, e.g. for Claude Code `~/.claude/skills/persian-website-builder/` (user) or `.claude/skills/persian-website-builder/` (project). The format follows the Agent Skills specification.

## Verify the repository (from the repo root)

```bash
node --test persian-website-builder/scripts/*.test.mjs meta/tools/lint-skill.test.mjs   # 41 tests
node meta/tools/lint-skill.mjs                                                          # integrity lint
```
Browser tests need Playwright with Chromium; they are skipped when unavailable.

## Status

Version and history: `meta/CHANGELOG.md`. Module maturity (M1 drafted → M2 scenario-tested → M3 field-tested) is published in `persian-website-builder/SKILL.md` §10. Known gaps and the next research target: `meta/OPEN-QUESTIONS.md`.

License: not yet chosen (owner decision, see OQ-19).
