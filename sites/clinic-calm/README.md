# clinic-calm — pilot P0

A **fictional** clinic site in a Luxury/Calm style: a services introduction and a trial-appointment request with success, error and retry paths. Persian, RTL, mobile first.

Status: **pilot P0**. Built by the Builder with the Skill only, before the Foundry protocol exists, so it is a *baseline*, not a protocol result and **not an independent audit**. Read `LIMITATIONS.md` before relying on anything here. Licences: `LICENSES.md`. The scenario it answers: `corpus/scenarios/clinic-luxury-calm.md`.

All data is invented. The form stores a request in a local file and sends nothing to anyone: no SMS, no email, no payment.

## What it does

- `/` home: hero, four services, how a first visit works, FAQ, closing call to action.
- `/appointment` form: name, mobile number, service, day (next bookable days, Jalali labels), time window, optional note, consent.
- `POST /api/appointments` JSON API with an idempotency key. Outcomes: created (201), replayed (200), validation error (422), bad request (400), too large (413), key reused with another payload (409), rate limited (429, `Retry-After`), storage unavailable (503, `Retry-After`), internal error (500, no detail).
- The form is a client-side state machine (idle, validating, submitting, success, validation error, rate limited, unavailable, unknown error). **Retry reuses the same idempotency key**, so a retried request cannot create a second record; "another request" makes a new key.
- Without JavaScript the submit button is disabled and a notice explains why; a native submit never puts personal data in the URL (the form is `method="post"`).

## Reference environment

The tests that exist today were run under exactly this environment. Another one may behave differently.

| Item | Value |
|---|---|
| Node | 22.22.0 (`engines`: `>=22`) |
| npm | 10.9.4 |
| Next.js / React | 16.3.8 / 19.3.0 (exact pins, lockfile v3, install scripts off via `.npmrc`) |
| Font | Vazirmatn 33.0.3, self-hosted from the pinned package |
| Browser tests | Playwright 1.56.1 with the pre-installed Chromium 141 (found through `NODE_PATH`); without it the browser tests are skipped and the runner reports INCOMPLETE |

## Run

```bash
cd sites/clinic-calm
npm ci
npm run build
npm start            # http://localhost:3000, data in .data/ (ignored by git)
```

Optional: `CLINIC_ENFORCE_HTTPS=1` adds HSTS and `upgrade-insecure-requests` (only behind real HTTPS). `CLINIC_DATA_DIR` moves the data file. Test hooks (fault injection, fixed clock, tiny limits) work only when `CLINIC_TEST_FAULTS=1`; never set it outside tests.

## Test

The authoritative verdict comes from the runner at the repository root, which also checks that dependencies and a browser are present:

```bash
node meta/tools/run-tests.mjs            # all suites; PASS | FAIL | INCOMPLETE
node meta/tools/run-tests.mjs --suite=clinic-p0
```

`npm test` runs the same files through plain `node --test`, which prints `ok` and exits 0 for skipped tests; use it for quick feedback only, not as evidence.

| File | What it covers |
|---|---|
| `tests/lib.test.mjs` | validation, digit and character normalization, Jalali day list, reference format, rate limiter, store and idempotency, as units |
| `tests/api.test.mjs` | every response code of the API against the real production server, fault injection, concurrent duplicates, restart persistence, privacy of logs |
| `tests/e2e.test.mjs` | real Chromium at a 360 px viewport: main path, error summary and focus, double submit, retry with the same key, server failure and recovery, no-JS behaviour, keyboard order, CSP |
| `tests/audit.test.mjs` | the Skill's own tools (`page-audit`, `security-smoke`, `rtl-smells`, `contrast`) applied to the site, copy lint, licence record, dependency and asset policy |
