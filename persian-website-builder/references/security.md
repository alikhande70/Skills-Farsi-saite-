# Security

Security is a set of **controls with tests**, not a checklist of intentions. Each section: threat → control → **how to verify**. Organized against OWASP Top 10:2025 [E-003]. Output: `docs/security.md` (threat model, control→test table, results). Gate: **G-SEC** (inside G5).
Parameters below come from OWASP Cheat Sheets read on 2026-10-01 [E-040..E-042]; re-read them at project start. Handling real payments, health, or children's data: add a professional security review before launch.

## 0. Principles

Least privilege · deny by default · fail closed · defense in depth · secure defaults · minimize data · use maintained libraries (never invent crypto/auth) · every control has an owner and a test · security findings from automated tools are leads, not verdicts.

## 1. Threat model in one hour (every project)

1. **Assets**: accounts, orders/payments, personal data, admin access, reputation, SMS/email budget, availability.
2. **Actors & abuse cases** (not only hackers): anonymous visitor, logged-in user vs other users (IDOR), insider/editor, bot/scraper, fraudster (fake orders, coupon abuse, SMS pumping, card testing), compromised dependency/CI.
3. **Entry points**: forms, API routes, file uploads, callbacks/webhooks, admin panel, CI/CD, third-party scripts, SMS/email flows.
4. For each top risk: control → test → owner. Record in `docs/security.md`.

## 2. Authentication and sessions (A07)

| Threat | Control | Verify |
|---|---|---|
| Stolen password DB | **Argon2id** (m=19456 KiB, t=2, p=1 minimum) via a maintained library; scrypt/bcrypt/PBKDF2 only per E-040; per-password salt handled by the library | Unit test: stored value is a hash with expected prefix/params; no plaintext in DB/logs |
| OTP guessing/replay | CSPRNG 6+ digits; short expiry (minutes); single-use; ≤ 5 attempts then lock/delay; bound to number + purpose; constant-time compare | Test: reuse, expired, 6th attempt, other number |
| Session fixation/theft | Random session ID; **rotate on login/privilege change**; invalidate on logout/password change; idle + absolute timeouts | Test: pre-login ID differs from post-login ID |
| Cookie theft | `HttpOnly; Secure; SameSite=Lax` (Strict for admin); `__Host-` prefix when possible | Inspect `Set-Cookie`; JS cannot read the cookie |
| Account enumeration | Same response/timing for existing and non-existing identifiers where UX allows; rate-limit regardless (OTP flows leak existence: compensate with limits) | Compare responses for known/unknown identifier |
| Weak admin access | Mandatory MFA for admin/editors; separate admin origin or path with extra controls | Attempt admin login without MFA |
| Recovery abuse | Recovery uses the same strength as login; notify the user on changes | Walk the recovery flow as attacker |
| JWT misuse | Prefer server sessions for browser apps; if tokens: short-lived access + rotating refresh, verify algorithm, no secrets in payload | Tamper `alg`/signature test |

## 3. Broken access control, IDOR, SSRF (A01)

Controls: central policy functions; **object-level checks on every read/write**; function-level checks on every admin route; deny by default; scope multi-tenant queries at the data layer; do not trust hidden fields/role claims from the client; non-guessable IDs are *defense in depth only*.
**Verify**: an **authorization matrix test** (endpoints × roles × own/other object): user A requesting user B's order/address/invoice/file id must get 403/404; mass-assignment test (`role`, `price`, `isAdmin` in payload ignored); direct file URLs are authorized or signed.

**SSRF** (any server-side fetch of a user-influenced URL: webhooks, URL import, image proxy, link preview) [E-041]: allow-list hosts and build the request yourself; resolve and verify all A/AAAA records are public; disable automatic redirects (or re-validate each hop); restrict outbound network; block metadata endpoints. **Verify**: submit `http://127.0.0.1`, `http://[::1]`, `http://169.254.169.254`, a hostname resolving to a private IP, and a URL that redirects to an internal address: all rejected.

## 4. Injection and XSS (A05)

| Threat | Control | Verify |
|---|---|---|
| SQL injection | Parameterized queries/ORM; no string-built SQL; raw-query escape hatches reviewed | Inject `'`, `" OR 1=1 --` into every param; SAST finds zero string-built queries |
| Command injection | Avoid shells; pass argument arrays; allow-list inputs | Inject `; id`, `$(id)` in anything reaching a process |
| **XSS** (stored/reflected/DOM) | Framework auto-escaping; never inject untrusted HTML (`innerHTML`, `dangerouslySetInnerHTML`, `v-html`, `|safe`); rich text via a maintained sanitizer with allow-list; CSP (§6) | Payloads in every text field: `<script>`, `"><img onerror=…>`, `javascript:` URLs; verify they render inert |
| Template injection | No user input in template source | `{{7*7}}` stays literal |
| Header/CRLF injection, open redirect | Strip CR/LF; redirect targets from an allow-list or relative paths only | `%0d%0a`, `next=https://evil.example` |
| Path traversal | Resolve and confine to a base dir; no user-controlled paths | `../../etc/passwd`, encoded variants |
| Bidi/Unicode spoofing | Strip or reject bidi control characters (U+202A–202E, U+2066–2069) in usernames, filenames, slugs; keep ZWNJ/RLM only where intended | Upload `invoice‮gpj.exe`; create username with RLO |

## 5. CSRF

Cookie-authenticated state changes need: `SameSite` cookies **and** a CSRF token (or Fetch-Metadata/Origin check, or a custom header for JSON APIs); GET never changes state; CORS allow-list (never `*` with credentials). **Verify**: a cross-site form POST without the token fails; `Sec-Fetch-Site: cross-site` is rejected on state-changing routes.

## 6. Headers and transport [E-042]

`Content-Security-Policy` (start in report-only, then enforce; avoid `unsafe-inline`; with I-2 satisfied, `default-src 'self'` plus explicit allows is realistic) · `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (**`preload` is hard to reverse**; adopt only when every subdomain is HTTPS forever) · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy` disabling unused features · `Cross-Origin-Opener-Policy: same-origin` · clickjacking via CSP `frame-ancestors` (or `X-Frame-Options: DENY`) · remove `X-Powered-By`/`Server` details · `Cache-Control: no-store` on authenticated/sensitive pages. TLS 1.2+ (prefer 1.3), automated renewal with alerts.
**Verify**: header scanner in CI against staging; CSP report endpoint shows no violations from your own pages.

## 7. Secrets

No secrets in the repository, client bundle, logs or screenshots; per-environment secrets; least-privilege keys; documented rotation; secret scanning in CI and pre-commit. If a secret leaks: **revoke and rotate first**, then clean history. **Verify**: CI secret scan passes; `grep` the built bundle for key patterns; `.env*` ignored.

## 8. File upload

Allow-list type by extension **and** sniffed content; size limits; random server-side names (never trust the client's, including Persian or RTL-override names); store outside the web root/in object storage; serve with correct `Content-Type`, `nosniff`, and `Content-Disposition`; re-encode images (also strips EXIF/location); no user SVG unless sanitized; scan if risk warrants; limit archive expansion. **Verify**: upload `.php`, double extension, polyglot, SVG with script, oversized file, zip bomb, RLO filename.

## 9. Dependencies and supply chain (A03) [E-003]

Lockfiles committed; new dependency passes the admission check (`engineering.md` §1); audit in CI with a policy for criticals; automated update PRs with tests; remove unused packages; review install scripts; 2FA on registry/hosting/CI accounts; protected branches; CI secrets scoped and not exposed to untrusted PRs; verify integrity hashes if using a private mirror (needed when official registries are unreachable from the team's location [E-023]).
**Verify**: audit report attached to the gate; `npm ci`-style reproducible install from lockfile in a clean runner.

## 10. API abuse, rate limiting, OTP/SMS abuse

Rate limits per IP, per account, per **phone number**, and global on login, OTP send/verify, password reset, search, checkout, coupon use; `429` + `Retry-After`; **hard daily cap on SMS/email spend with an alert** (SMS pumping and card testing are cost attacks); block unserved number ranges; per-device or proof-of-work friction before expensive calls; pagination and size limits; GraphQL depth/cost limits if used. Prefer self-hosted friction over foreign CAPTCHAs (I-2, WCAG 3.3.8).
**Verify**: a script exceeding each limit gets `429`; the spend alert fires in staging; enumeration of IDs is throttled.

## 11. Misconfiguration (A02)

Debug off in production; generic error pages; no directory listing; admin not exposed publicly (MFA, allow-list or VPN); no `.git`, `.env`, `.sql`, backups, or source maps with secrets in the web root; default credentials removed; CORS tight; storage buckets private; unnecessary services/ports closed; config as code with parity between environments.
**Verify**: scan for common exposed paths (`/.git/`, `/.env`, `/backup.sql`, `/admin`, `/phpinfo`); run a baseline config scan on staging.

## 12. Cryptography, data protection, identifiers (A04)

TLS everywhere; sensitive data never in URLs; encrypt data at rest as the risk warrants (disk/DB level; field-level for the few secrets that need it); random tokens from a CSPRNG; constant-time comparison for secrets; no homegrown crypto.
**Lookalike identifiers**: Persian has duplicate code points (ی/ي, ک/ك) and invisible characters (ZWNJ) [E-011]. Enforce uniqueness on the **normalized** form of usernames, emails' display names, slugs and brand names; reject bidi controls and zero-width characters in identifiers. **Verify**: register `علی` then `علي` (Arabic yeh): the second is rejected as a duplicate.

## 13. Logging, detection, alerting (A09)

Log security events (login success/failure, OTP sent/verified, role/permission change, payment state changes, data export, admin actions) with request id and **no secrets/PII**. Alert on: spikes of failures/403s/429s, payment verify mismatches, OTP volume anomalies, new admin creation, error-rate jumps. **Verify**: simulate each condition in staging; alert reaches a human within the agreed time.

## 14. Exceptional conditions (A10) [E-003]

Fail closed; catch specific errors; no partially applied state (transactions/compensation); timeouts and bounded retries; clean up resources; generic messages outward, detail in logs. Example rule: if payment **verify throws or times out, the order is not marked paid**; it goes to reconciliation.
**Verify**: fault injection in staging: DB down, PSP timeout, SMS provider error, disk full: no data corruption, no false "paid", user sees a clear message.

## 15. Payment-specific controls (Iran and generally)

Use the gateway's **hosted page**: card data never touches your servers. Server-side verify with amount from your DB; idempotent fulfilment; unique constraint on payment id; reject replays; limit retries; log gateway ids (not card data). Refund/payout identifiers (Sheba, card) validated, masked, access-controlled and not logged. Obtain the PSP's current security requirements in writing (E-027 details are ASSUMPTION).
**Verify**: tampered amount, replayed callback, double callback, callback with unknown/expired authority, forged success parameters: none fulfil an order.

## 16. G-SEC: security gate (before real users or money)

Executable evidence: `node scripts/security-smoke.mjs <staging-url>` (headers, cookie flags, exposed paths, CORS reflection; run only against systems you own) and the project's own authorization/injection tests. Attach the output to `docs/gates/G5.md`. The G-SEC criterion needs verdict **PASS on the HTTPS staging URL** (CONDITIONAL = http-only/limited scope, INCOMPLETE = a probe could not run: neither counts as verified). Automation is a smoke test; it never replaces the checks below.

- [ ] Threat model exists; top risks have controls and tests.
- [ ] Authorization matrix test passes; SSRF and injection payload suites pass; CSRF test passes.
- [ ] Headers verified (incl. CSP enforced or report-only with zero own-page violations).
- [ ] Rate limits and spend caps tested; alerts reach a human.
- [ ] Secrets scan clean; dependency audit reviewed; lockfile reproducible install.
- [ ] Backups restore-tested; admin MFA on; production debug off; no exposed sensitive paths.
- [ ] Payment fault/tamper tests pass (if payments).
- [ ] For payments/health/children/Heavy: independent review or penetration test done or explicitly waived by the owner in writing.
