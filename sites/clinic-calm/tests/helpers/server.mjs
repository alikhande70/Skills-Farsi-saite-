// Starts the REAL production server (next build + next start) for tests. No mocks of the application.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = fileURLToPath(new URL('../../', import.meta.url));
const NEXT_BIN = join(SITE, 'node_modules/next/dist/bin/next');
const BUILD_ID = join(SITE, '.next/BUILD_ID');
const LOCK = join(SITE, '.build.lock');
const SOURCES = ['app', 'lib', 'content', 'proxy.js', 'next.config.mjs', 'package.json'];

const newestMtime = (p) => {
  const full = join(SITE, p);
  if (!existsSync(full)) return 0;
  if (!statSync(full).isDirectory()) return statSync(full).mtimeMs;
  return Math.max(0, ...readdirSync(full).map((n) => newestMtime(join(p, n))));
};
const buildIsFresh = () => existsSync(BUILD_ID) && statSync(BUILD_ID).mtimeMs >= Math.max(...SOURCES.map(newestMtime));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Builds when needed. Several test files may call this at once: an atomic mkdir lock lets exactly one build. */
export async function ensureBuilt() {
  const deadline = Date.now() + 240000;
  while (!buildIsFresh()) {
    let mine = false;
    try { mkdirSync(LOCK); mine = true; } catch { /* another process is building */ }
    if (mine) {
      try {
        const r = spawnSync(process.execPath, [NEXT_BIN, 'build'], { cwd: SITE, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }, encoding: 'utf8' });
        if (r.status !== 0) throw new Error(`next build failed (exit ${r.status})\n${r.stdout}\n${r.stderr}`);
      } finally { rmSync(LOCK, { recursive: true, force: true }); }
    } else {
      if (Date.now() > deadline) throw new Error('timed out waiting for another process to finish next build');
      await sleep(500);
    }
  }
}

const freePort = () => new Promise((resolve, reject) => {
  const s = createServer();
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => resolve(port)); });
  s.on('error', reject);
});

export async function startServer({ env = {}, dataDir: reuseDir = null } = {}) {
  await ensureBuilt();
  const port = await freePort();
  const dataDir = reuseDir ?? mkdtempSync(join(tmpdir(), 'clinic-data-'));
  const child = spawn(process.execPath, [NEXT_BIN, 'start', '-p', String(port), '-H', '127.0.0.1'], {
    cwd: SITE,
    env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', CLINIC_DATA_DIR: dataDir, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  let exited = false;
  child.on('exit', () => { exited = true; });
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60000;
  for (;;) {
    if (exited) throw new Error(`server exited early:\n${log}`);
    try { const r = await fetch(`${url}/robots.txt`); if (r.ok) break; } catch { /* not ready */ }
    if (Date.now() > deadline) { child.kill('SIGKILL'); throw new Error(`server not ready in 60 s:\n${log}`); }
    await sleep(200);
  }
  return {
    url, port, dataDir,
    logs: () => log,
    records: () => { const f = join(dataDir, 'appointments.jsonl'); return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []; },
    async stop() { child.kill('SIGTERM'); await new Promise((r) => { child.on('exit', r); setTimeout(() => { child.kill('SIGKILL'); r(); }, 5000); }); if (!reuseDir) rmSync(dataDir, { recursive: true, force: true }); },
  };
}

/** Deterministic test environment: fixed clock (Monday 13 Mehr 1405) and test hooks enabled. */
export const TEST_ENV = { CLINIC_TEST_FAULTS: '1', CLINIC_FIXED_NOW: '2026-10-05T08:00:00Z' };
