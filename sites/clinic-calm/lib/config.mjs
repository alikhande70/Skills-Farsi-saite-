// Single place for constants and environment switches.
// Test hooks (fault injection, fixed clock, tiny rate limits) are honoured ONLY when CLINIC_TEST_FAULTS=1.
// A production start never sets it; the security smoke test runs against a server started without it.

export const SERVICE_IDS = ['consult', 'skin', 'hair', 'followup'];
export const WINDOW_IDS = ['morning', 'afternoon', 'evening'];
export const LIMITS = { nameMin: 2, nameMax: 80, noteMax: 300 };

const testMode = process.env.CLINIC_TEST_FAULTS === '1';
const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

export const runtimeConfig = () => ({
  testMode,
  dataDir: process.env.CLINIC_DATA_DIR || '.data',
  // per client address: requests per window (all requests, including invalid ones)
  ipLimit: num(testMode && process.env.CLINIC_RATE_LIMIT_IP, 20),
  ipWindowMs: 10 * 60 * 1000,
  // per mobile number: NEW appointment requests per 24 hours (idempotent replays do not count)
  mobileLimit: num(testMode && process.env.CLINIC_RATE_LIMIT_MOBILE, 3),
  mobileWindowMs: 24 * 60 * 60 * 1000,
  fixedNow: testMode && process.env.CLINIC_FIXED_NOW ? Date.parse(process.env.CLINIC_FIXED_NOW) : null,
  enforceHttps: process.env.CLINIC_ENFORCE_HTTPS === '1',
});

export const nowMs = () => runtimeConfig().fixedNow ?? Date.now();
