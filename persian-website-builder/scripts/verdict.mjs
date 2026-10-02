// Shared result model for the skill's check tools. Zero dependencies.
//
// Two separate axes, never mixed:
//   1. EXECUTION of each check:  pass | fail | warn | info | incomplete | unknown | skipped | not-applicable
//   2. OUTCOME of the whole run: PASS | CONDITIONAL | FAIL | INCOMPLETE
//
// Rules (the reason this file exists: a check that could not run must never read as success):
//   - FAIL         any check failed.                                   (hard condition violated; certain)
//   - INCOMPLETE   no failure, but a check was tried and could not complete ("incomplete"/"unknown"),
//                  or nothing was executed at all.                      (evidence missing)
//   - CONDITIONAL  no failure, everything ran, but there are warnings or checks skipped by declared scope
//                  (limits are listed explicitly).                      (not a full success)
//   - PASS         at least one check passed and every executed check passed; no warnings, no skips.
//   - "info" and "not-applicable" never change the outcome; they are still listed in the report.
// Precedence: FAIL > INCOMPLETE > CONDITIONAL > PASS.
//
// Exit codes shared by the CLIs: 0 = PASS or CONDITIONAL, 1 = FAIL, 2 = could not run at all (bad usage,
// target unreachable), 3 = INCOMPLETE. CI must treat anything other than 0 as "not verified".

export const STATUSES = ['pass', 'fail', 'warn', 'info', 'incomplete', 'unknown', 'skipped', 'not-applicable'];
export const VERDICTS = ['PASS', 'CONDITIONAL', 'FAIL', 'INCOMPLETE'];

export function createLedger() {
  const checks = [];
  return {
    checks,
    add(id, status, msg, extra = {}) {
      if (!STATUSES.includes(status)) throw new Error(`unknown check status "${status}"`);
      checks.push({ id, status, msg, ...extra });
    },
  };
}

export function summarize(checks) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const c of checks) counts[c.status] += 1;
  const reasons = [];
  const limits = [];
  let verdict;
  if (counts.fail > 0) {
    verdict = 'FAIL';
    reasons.push(`${counts.fail} check(s) failed`);
  } else if (checks.length === 0 || counts.incomplete + counts.unknown > 0) {
    verdict = 'INCOMPLETE';
    reasons.push(checks.length === 0 ? 'no check was executed' : `${counts.incomplete + counts.unknown} check(s) could not be completed`);
  } else if (counts.warn > 0 || counts.skipped > 0) {
    verdict = 'CONDITIONAL';
    if (counts.warn) reasons.push(`${counts.warn} warning(s)`);
    if (counts.skipped) reasons.push(`${counts.skipped} check(s) skipped by scope`);
  } else if (counts.pass === 0) {
    verdict = 'INCOMPLETE';
    reasons.push('no check produced positive evidence');
  } else {
    verdict = 'PASS';
  }
  for (const c of checks) if (c.status === 'skipped') limits.push(`${c.id}: ${c.msg}`);
  for (const c of checks) if (c.limit) limits.push(`${c.id}: ${c.limit}`);
  return { verdict, counts, reasons, limits };
}

export function exitCodeFor(verdict) {
  return { PASS: 0, CONDITIONAL: 0, FAIL: 1, INCOMPLETE: 3 }[verdict] ?? 2;
}

/** Plain-text rendering. Lists every check that is not a plain pass, then the verdict. Never says "no errors" unless PASS. */
export function renderText(report, { showPasses = false } = {}) {
  const lines = [];
  for (const c of report.checks) {
    if (c.status === 'pass' && !showPasses) continue;
    if (c.status === 'not-applicable' && !showPasses) continue;
    lines.push(`${c.status.toUpperCase().padEnd(14)} ${c.id}  ${c.msg}${c.detail ? `\n${' '.repeat(15)}-> ${c.detail}` : ''}`);
  }
  const k = report.counts;
  lines.push('');
  lines.push(`Executed ${report.checks.length} check(s): ${k.pass} pass, ${k.fail} fail, ${k.warn} warn, ${k.incomplete + k.unknown} incomplete, ${k.skipped} skipped, ${k['not-applicable']} not-applicable, ${k.info} info`);
  lines.push(`VERDICT: ${report.verdict}${report.reasons.length ? ` (${report.reasons.join('; ')})` : ''}`);
  if (report.limits.length) { lines.push('Limits of this result:'); for (const l of report.limits) lines.push(`  - ${l}`); }
  if (report.verdict === 'INCOMPLETE') lines.push('Not verified: re-run after fixing the cause; do not record this as passed.');
  return lines.join('\n');
}

export function buildReport(tool, meta, checks) {
  return { tool, ...meta, checks, ...summarize(checks) };
}
