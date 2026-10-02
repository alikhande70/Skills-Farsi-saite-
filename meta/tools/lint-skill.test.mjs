import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintSkill } from './lint-skill.mjs';

const REAL = fileURLToPath(new URL('../../persian-website-builder', import.meta.url));

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'lint-skill-'));
  const dir = join(root, 'demo-skill');
  mkdirSync(join(dir, 'references'), { recursive: true });
  for (const [path, content] of Object.entries(files)) writeFileSync(join(dir, path), content);
  return dir;
}

test('the real skill has no lint errors', () => {
  const { errors } = lintSkill(REAL);
  assert.deepEqual(errors, []);
});

test('detects orphan references, undefined IDs, missing files and stale section refs', () => {
  const dir = fixture({
    'SKILL.md': '---\nname: demo-skill\ndescription: A demo skill.\nmetadata:\n  version: "0.1.0"\n---\n# Demo\nSee `references/a.md` §9 and `references/missing.md` and E-999 and AP-123.\n',
    'references/a.md': '# A\n## 1. Only section\ncites FM-777 and I-9\n',
    'references/orphan.md': '# Orphan\n',
    'references/evidence-register.md': '| ID | Claim |\n|---|---|\n| E-001 | x | FACT | s | 2020-01-01 | High | r |\n',
  });
  const { errors, warnings } = lintSkill(dir, { today: new Date('2026-10-01T00:00:00Z') });
  const text = errors.join('\n');
  assert.match(text, /orphan\.md is not mentioned/);
  assert.match(text, /E-999 which is not defined/);
  assert.match(text, /AP-123 which is not defined/);
  assert.match(text, /FM-777 which is not defined/);
  assert.match(text, /missing file references\/missing\.md/);
  assert.match(text, /a\.md §9 but that heading does not exist/);
  assert.match(text, /principle I-9/);
  assert.match(warnings.join('\n'), /E-001: verified \d+ days ago; high volatility/);
});

test('rejects invalid frontmatter: name mismatch, uppercase, long description, angle brackets', () => {
  const dir = fixture({ 'SKILL.md': `---\nname: Wrong_Name\ndescription: ${'x'.repeat(1100)} <b>\nmetadata:\n  version: "0.1.0"\n---\nbody\n` });
  const { errors } = lintSkill(dir);
  const text = errors.join('\n');
  assert.match(text, /invalid name/);
  assert.match(text, /description is 1\d{3} chars/);
  assert.match(text, /must not contain < or >/);
});
