#!/usr/bin/env node
// Integrity linter for the persian-website-builder skill. Zero dependencies.
// Usage: node meta/tools/lint-skill.mjs [skillDir] [--today=YYYY-MM-DD]
// Exit code 1 if any error. Warnings never fail the run.
//
// Why: the skill is edited every cycle. Without mechanical checks, cross-references,
// IDs, versions and evidence dates drift silently.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const MAX_SKILL_LINES = 500;
const MAX_DESCRIPTION = 1024;
const STALE_DAYS = { high: 90, med: 180, low: 365 };

const read = (p) => readFileSync(p, 'utf8');
const mdFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort() : []);

function parseFrontmatter(text) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!m) return null;
  const fm = { raw: m[1] };
  const name = /^name:\s*(.+)$/m.exec(m[1]);
  const desc = /^description:\s*(.+)$/m.exec(m[1]);
  const ver = /^\s*version:\s*"?([^"\n]+)"?\s*$/m.exec(m[1]);
  fm.name = name?.[1].trim();
  fm.description = desc?.[1].trim();
  fm.version = ver?.[1].trim();
  return fm;
}

function definedIds(text, prefix) {
  // Definitions are table rows that start with `| PREFIX-123 |`
  const re = new RegExp(`^\\|\\s*(${prefix}-\\d{3})\\s*\\|`, 'gm');
  const ids = [];
  for (const m of text.matchAll(re)) ids.push(m[1]);
  return ids;
}

export function lintSkill(skillDir, { today = new Date() } = {}) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  const skillPath = join(skillDir, 'SKILL.md');
  if (!existsSync(skillPath)) return { errors: [`SKILL.md missing in ${skillDir}`], warnings };
  const skillText = read(skillPath);
  const refsDir = join(skillDir, 'references');
  const repoRoot = resolve(skillDir, '..');

  // 1. Frontmatter
  const fm = parseFrontmatter(skillText);
  if (!fm) err('SKILL.md: missing YAML frontmatter');
  else {
    if (!fm.name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(fm.name) || fm.name.length > 64) err(`SKILL.md: invalid name "${fm.name}"`);
    else if (fm.name !== basename(resolve(skillDir))) err(`SKILL.md: name "${fm.name}" must equal directory name "${basename(resolve(skillDir))}"`);
    if (!fm.description) err('SKILL.md: missing description');
    else {
      if (fm.description.length > MAX_DESCRIPTION) err(`SKILL.md: description is ${fm.description.length} chars (max ${MAX_DESCRIPTION})`);
      if (/[<>]/.test(fm.description)) err('SKILL.md: description must not contain < or >');
    }
    if (!fm.version) err('SKILL.md: metadata.version missing');
  }
  const body = skillText.replace(/^---\n[\s\S]*?\n---\n/, '');
  if (body.length > 16000) warn(`SKILL.md body is ${body.length} chars (~${Math.round(body.length / 3.2)} tokens); the Agent Skills spec recommends < 5000 tokens`);
  if (fm?.raw && /^compatibility:\s*(.+)$/m.test(fm.raw) && RegExp.$1.length > 500) err('SKILL.md: compatibility exceeds 500 chars');
  const lines = skillText.split('\n').length;
  if (lines > MAX_SKILL_LINES) err(`SKILL.md has ${lines} lines (max ${MAX_SKILL_LINES}); move detail into references/`);

  // 2. Every reference is mentioned from SKILL.md
  const refs = mdFiles(refsDir);
  for (const f of refs) if (!skillText.includes(f)) err(`references/${f} is not mentioned in SKILL.md (orphan)`);

  // 3. File-path mentions resolve; section references resolve
  const allFiles = [['SKILL.md', skillText], ...refs.map((f) => [`references/${f}`, read(join(refsDir, f))])];
  const tplDir = join(skillDir, 'templates');
  const scrDir = join(skillDir, 'scripts');
  for (const f of mdFiles(tplDir)) allFiles.push([`templates/${f}`, read(join(tplDir, f))]);

  const resolveMention = (m) => {
    const candidates = [join(skillDir, m), join(refsDir, m), join(repoRoot, m)];
    return candidates.find((c) => existsSync(c));
  };
  for (const [file, text] of allFiles) {
    for (const m of text.matchAll(/`((?:references|scripts|templates|meta)\/[A-Za-z0-9_./-]+\.(?:md|mjs|json))`/g)) {
      if (!resolveMention(m[1])) err(`${file}: mentions missing file ${m[1]}`);
    }
    for (const m of text.matchAll(/`(?:references\/)?([a-z0-9-]+\.md)`\s*§(\d+)/g)) {
      const target = join(refsDir, m[1]);
      if (!existsSync(target)) { err(`${file}: §${m[2]} refers to missing ${m[1]}`); continue; }
      const heading = new RegExp(`^#{2,3}\\s+${m[2]}[.\\s]`, 'm');
      if (!heading.test(read(target))) err(`${file}: refers to ${m[1]} §${m[2]} but that heading does not exist`);
    }
  }

  // 4. ID registries
  const registry = (prefix, file) => {
    const p = join(refsDir, file);
    const defs = existsSync(p) ? definedIds(read(p), prefix) : [];
    const seen = new Set();
    for (const id of defs) {
      if (seen.has(id)) err(`${file}: duplicate ${id}`);
      seen.add(id);
    }
    return seen;
  };
  const E = registry('E', 'evidence-register.md');
  const AP = registry('AP', 'anti-patterns.md');
  const FM = registry('FM', 'failure-modes.md');
  const EC = registry('EC', 'testing-edge-cases.md');
  const cited = { E: new Set(), AP: new Set(), FM: new Set(), EC: new Set() };
  const defsBy = { E, AP, FM, EC };
  for (const [file, text] of allFiles) {
    for (const prefix of Object.keys(defsBy)) {
      for (const m of text.matchAll(new RegExp(`\\b(${prefix}-\\d{3})\\b`, 'g'))) {
        cited[prefix].add(m[1]);
        if (!defsBy[prefix].has(m[1])) err(`${file}: cites ${m[1]} which is not defined`);
      }
    }
  }
  for (const id of E) if (!cited.E.has(id) || [...allFiles].filter(([f, t]) => !f.endsWith('evidence-register.md') && t.includes(id)).length === 0) warn(`evidence ${id} is never cited outside the register`);

  // Iran principles I-n, decision frameworks D-X, S-1
  const iranText = existsSync(join(refsDir, 'iran-context.md')) ? read(join(refsDir, 'iran-context.md')) : '';
  const principles = new Set([...iranText.matchAll(/\*\*(I-\d)\b/g)].map((m) => m[1]));
  const archText = existsSync(join(refsDir, 'architecture-decisions.md')) ? read(join(refsDir, 'architecture-decisions.md')) : '';
  const decisions = new Set();
  for (const h of archText.matchAll(/^##\s+\d+\..*$/gm)) for (const m of h[0].matchAll(/\bD-[A-Z0-9]+\b/g)) decisions.add(m[0]);
  const seoText = existsSync(join(refsDir, 'seo.md')) ? read(join(refsDir, 'seo.md')) : '';
  if (/Decision S-1/.test(seoText)) decisions.add('S-1');
  for (const [file, text] of allFiles) {
    for (const m of text.matchAll(/(?<![A-Za-z])(I-\d)\b/g)) if (!principles.has(m[1])) err(`${file}: cites principle ${m[1]} which is not defined in iran-context.md`);
    for (const m of text.matchAll(/(?<![A-Za-z])(D-[A-Z][A-Z0-9]+)\b/g)) {
      if (!decisions.has(m[1])) err(`${file}: cites decision framework ${m[1]} which is not defined`);
    }
    for (const m of text.matchAll(/(?<![A-Za-z])S-1\b/g)) if (!decisions.has('S-1')) { err(`${file}: cites S-1 which is not defined`); break; }
  }

  // 5. Version consistency with changelog
  const clPath = join(repoRoot, 'meta', 'CHANGELOG.md');
  if (existsSync(clPath) && fm?.version) {
    const top = /^##\s+v?(\d+\.\d+(?:\.\d+)?)/m.exec(read(clPath));
    if (!top) err('meta/CHANGELOG.md: no "## vX.Y" heading');
    else if (top[1] !== fm.version && !fm.version.startsWith(`${top[1]}.`) && !top[1].startsWith(`${fm.version}.`) && top[1] !== fm.version.replace(/\.0$/, '')) {
      err(`version mismatch: SKILL.md says ${fm.version}, top of CHANGELOG is ${top[1]}`);
    }
  } else if (!existsSync(clPath)) warn('meta/CHANGELOG.md missing');

  // 6. Evidence staleness
  const regPath = join(refsDir, 'evidence-register.md');
  if (existsSync(regPath)) {
    for (const line of read(regPath).split('\n')) {
      const cells = line.split('|').map((c) => c.trim());
      const id = /^(E-\d{3})$/.exec(cells[1] ?? '')?.[1];
      if (!id) continue;
      // columns: ID | claim | label | source | verified | volatility | re-verify
      const date = /^(\d{4}-\d{2}-\d{2})$/.exec(cells[5] ?? '')?.[1];
      const vol = /^\**(High|Med|Low)\**$/i.exec(cells[6] ?? '')?.[1]?.toLowerCase();
      if (!date || !vol) { warn(`${id}: missing verification date or volatility column`); continue; }
      const age = Math.floor((today - new Date(`${date}T00:00:00Z`)) / 86400000);
      if (age > STALE_DAYS[vol]) warn(`${id}: verified ${age} days ago; ${vol} volatility window is ${STALE_DAYS[vol]} days (re-verify)`);
    }
  }

  // 7. Leftover markers
  for (const [file, text] of allFiles) if (/(^|\s)(TODO|FIXME)[:(]/m.test(text.replace(/`[^`]*`/g, ''))) warn(`${file}: contains TODO/FIXME marker`);

  // 8. Scripts have tests
  if (existsSync(scrDir)) {
    for (const f of readdirSync(scrDir).filter((x) => x.endsWith('.mjs') && !x.endsWith('.test.mjs'))) {
      if (!existsSync(join(scrDir, f.replace(/\.mjs$/, '.test.mjs')))) warn(`scripts/${f} has no .test.mjs`);
    }
  }

  return { errors, warnings, stats: { lines, references: refs.length, evidence: E.size, antiPatterns: AP.size, failureModes: FM.size, edgeCases: EC.size } };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const todayArg = args.find((a) => a.startsWith('--today='))?.split('=')[1];
  const dir = resolve(args.find((a) => !a.startsWith('--')) ?? join(dirname(process.argv[1]), '..', '..', 'persian-website-builder'));
  const { errors, warnings, stats } = lintSkill(dir, { today: todayArg ? new Date(`${todayArg}T00:00:00Z`) : new Date() });
  for (const e of errors) console.log(`ERROR  ${e}`);
  for (const w of warnings) console.log(`WARN   ${w}`);
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)  ·  ${JSON.stringify(stats)}`);
  process.exit(errors.some((e) => /^SKILL\.md missing/.test(e)) ? 2 : errors.length ? 1 : 0); // 2 = could not run, 1 = problems found
}
