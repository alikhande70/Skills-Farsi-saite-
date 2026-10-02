import { createStore } from './store.mjs';
import { createLimiter } from './rate-limit.mjs';
import { runtimeConfig } from './config.mjs';

// One store/limiter per server process. globalThis survives module re-evaluation between route bundles.
export function getRuntime() {
  const g = globalThis;
  if (!g.__clinicRuntime) {
    const cfg = runtimeConfig();
    g.__clinicRuntime = { store: createStore({ dir: cfg.dataDir }), limiter: createLimiter(), faulted: new Set() };
  }
  return g.__clinicRuntime;
}
