import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { newRef } from './ref.mjs';

export class StoreError extends Error {}

const payloadHash = (v) => createHash('sha256').update(JSON.stringify([v.name, v.mobile, v.service, v.day, v.window, v.note])).digest('hex');

/**
 * Append-only JSONL file + in-memory indexes. The check-then-insert in submit() is fully synchronous, so two
 * simultaneous requests with the same idempotency key cannot both create a record in one process.
 * Not safe for multiple processes (documented in LIMITATIONS.md).
 */
export function createStore({ dir }) {
  const file = join(dir, 'appointments.jsonl');
  const byKey = new Map();
  const records = [];
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split('\n').filter(Boolean)) {
      try { const r = JSON.parse(line); records.push(r); byKey.set(r.key, r); } catch { /* a torn last line must not stop the server */ }
    }
  }
  return {
    file,
    size: () => records.length,
    findByKey: (key) => byKey.get(key) ?? null,
    countRecentByMobile: (mobile, sinceMs) => records.filter((r) => r.mobile === mobile && r.createdAt >= sinceMs).length,
    recentTimesByMobile: (mobile, sinceMs) => records.filter((r) => r.mobile === mobile && r.createdAt >= sinceMs).map((r) => r.createdAt).sort((a, b) => a - b),
    /** Returns { status: 'created' | 'replayed' | 'conflict', ref }. Throws StoreError if the record cannot be persisted. */
    submit({ key, values, now }) {
      const hash = payloadHash(values);
      const existing = byKey.get(key);
      if (existing) return existing.hash === hash ? { status: 'replayed', ref: existing.ref } : { status: 'conflict', ref: null };
      const record = { key, hash, ref: newRef(), createdAt: now, ...values };
      try {
        mkdirSync(dir, { recursive: true });
        appendFileSync(file, `${JSON.stringify(record)}\n`);
      } catch (e) { throw new StoreError(`cannot persist: ${e.code ?? e.message}`); }
      records.push(record); byKey.set(key, record); // indexed only after the write succeeded
      return { status: 'created', ref: record.ref };
    },
  };
}
