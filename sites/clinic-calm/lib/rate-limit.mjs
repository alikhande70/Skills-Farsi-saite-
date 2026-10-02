// Sliding-window counter per key. In-memory, single process (documented limitation).
export function createLimiter() {
  const hits = new Map();
  return {
    /** Records one hit and returns { ok, retryAfterSec }. */
    hit(key, limit, windowMs, now) {
      const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (list.length >= limit) { hits.set(key, list); return { ok: false, retryAfterSec: Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000)) }; }
      list.push(now); hits.set(key, list);
      return { ok: true, retryAfterSec: 0 };
    },
  };
}
