---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Source: `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (unit)** | Vitest (latest stable) — co-located with source |
| **Framework (E2E)** | Playwright 1.x + `@playwright/test` |
| **Config file (unit)** | `vitest.config.mts` (project root) — Wave 0 |
| **Config file (E2E)** | `playwright.config.ts` (project root) — Wave 0 |
| **Quick run command** | `pnpm test:unit` |
| **Full suite command** | `pnpm test:unit && pnpm test:e2e --project=chromium` |
| **Estimated runtime (quick)** | ~10 s |
| **Estimated runtime (full)** | ~60–90 s |

---

## Sampling Rate

- **After every task commit:** Run `pnpm test:unit` (max ~10 s feedback)
- **After every plan wave:** Run full E2E (`pnpm test:e2e --project=chromium`)
- **Before `/gsd-verify-work`:** Full suite green + manual deliverability checklist signed
- **Max feedback latency:** 90 s

---

## Per-Task Verification Map

> Built from `01-RESEARCH.md` § Validation Architecture → "Requirement → Test Map".
> Final task IDs (`{N}-{plan}-{task}`) are filled in by the planner; here we map
> requirement → test artefact so the planner knows what each plan owes Wave 0.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| AUTH-01 | Registration form submits name + email + sector + role + consents | E2E | `pnpm test:e2e -g "register"` | ❌ Wave 0 → `tests/e2e/registration.spec.ts` | ⬜ pending |
| AUTH-02 | Required consent checkboxes block submission when unchecked | E2E | `pnpm test:e2e -g "consent"` | ❌ Wave 0 → `tests/e2e/registration.spec.ts` | ⬜ pending |
| AUTH-03 | OTP email enqueued on BullMQ within 200 ms of registration | Unit (queue spy) | `pnpm test:unit queue` | ❌ Wave 0 → `tests/unit/queue.test.ts` | ⬜ pending |
| AUTH-04 | Unverified user blocked from `/member/*` | E2E | `pnpm test:e2e -g "auth gate"` | ❌ Wave 0 → `tests/e2e/login.spec.ts` | ⬜ pending |
| AUTH-05 | Login OTP request → code in DB (hashed) → code accepted → session created | E2E | `pnpm test:e2e -g "login flow"` | ❌ Wave 0 → `tests/e2e/login.spec.ts` | ⬜ pending |
| AUTH-06 | Logout server action clears session cookie | E2E | `pnpm test:e2e -g "logout"` | ❌ Wave 0 → `tests/e2e/login.spec.ts` | ⬜ pending |
| AUTH-07 | Session cookie set on register; survives full page refresh | E2E | `pnpm test:e2e -g "session"` | ❌ Wave 0 → `tests/e2e/registration.spec.ts` | ⬜ pending |
| AUTH-08 | Turnstile token verified server-side (Cloudflare test keys in `.env.test`) | Unit | `pnpm test:unit turnstile` | ❌ Wave 0 → `tests/unit/turnstile.test.ts` | ⬜ pending |
| AUTH-09 | Rate-limit returns 429 on 4th registration from same IP within window | Unit | `pnpm test:unit ratelimit` | ❌ Wave 0 → `tests/unit/rate-limit.test.ts` | ⬜ pending |
| AUTH-10 | Disposable email domain rejected at API boundary (Zod refinement) | Unit | `pnpm test:unit disposable` | ❌ Wave 0 → `tests/unit/disposable-email.test.ts` | ⬜ pending |
| NOTIF-07 | DNS records present (SPF, DKIM CNAMEs ×2, DMARC TXT) | Manual | `dig TXT _dmarc.<sender-domain>` + Postmaster screenshot | Manual checklist | ⬜ pending |
| NOTIF-08 | Confirmation email job created on BullMQ within 200 ms | Unit | `pnpm test:unit queue-timing` | ❌ Wave 0 → `tests/unit/queue.test.ts` | ⬜ pending |
| OPS-01 | Non-Cloudflare origin IP returns 403 (Fly.io HTTP service restricted to CF IP ranges) | Manual smoke | `curl -I https://<fly-host>.fly.dev/` from non-CF IP | Manual checklist | ⬜ pending |
| OPS-02 | Sentry captures a forced exception via `/api/_sentry-test` | E2E smoke + dashboard | trigger route + verify Sentry event | ❌ Wave 0 → `tests/e2e/smoke.spec.ts` | ⬜ pending |
| OPS-03 | Structured log emits JSON with no PII (no email, no IP) | Unit | `pnpm test:unit logger` | ❌ Wave 0 → `tests/unit/logger.test.ts` | ⬜ pending |
| OPS-06 | Daily `pg_dump` runs and uploads encrypted artefact to Bunny Storage | Manual (verify first nightly run) | inspect Bunny bucket + artefact size | Manual checklist | ⬜ pending |
| OPS-07 | CI runs lint + typecheck + Drizzle check + unit + Playwright + deploy | CI green run | GitHub Actions log | ❌ Wave 0 → `.github/workflows/ci.yml` | ⬜ pending |
| BRAND-01 | Sinya Bulgaria primary palette tokens live in Tailwind theme | Unit (CSS token snapshot) | `pnpm test:unit theme` | ❌ Wave 0 → `tests/unit/theme.test.ts` | ⬜ pending |
| BRAND-02 | Logo SVG renders in header on every page | E2E | `pnpm test:e2e -g "branding"` | ❌ Wave 0 → `tests/e2e/branding.spec.ts` | ⬜ pending |
| BRAND-03 | Cyrillic web font (Roboto/Noto Sans Cyrillic) loads — `font-display: swap` | E2E (computed style) | `pnpm test:e2e -g "branding"` | ❌ Wave 0 → `tests/e2e/branding.spec.ts` | ⬜ pending |
| BRAND-06 | Modern design refresh — no legacy sinyabulgaria.bg styles | E2E (smoke vs UI-SPEC tokens) | `pnpm test:e2e -g "branding"` | ❌ Wave 0 → `tests/e2e/branding.spec.ts` | ⬜ pending |
| PUB-05 | No hardcoded Bulgarian string in `.tsx` components — all via `t()` | CI lint | `pnpm lint:i18n` (custom grep rule) | ❌ Wave 0 → ESLint custom rule or grep script | ⬜ pending |
| PUB-06 | No horizontal scroll on 360 px viewport on every Phase 1 page | E2E | `pnpm test:e2e -g "responsive"` | ❌ Wave 0 → `tests/e2e/responsive.spec.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

The planner MUST allocate a Wave 0 plan that creates the test scaffolding before any
feature implementation. Specifically:

- [ ] `playwright.config.ts` — Playwright config; viewport projects 360 px, 375 px, 768 px, 1440 px; CI project pins Chromium
- [ ] `vitest.config.mts` — Vitest config; co-located `*.test.ts` discovery
- [ ] `.env.test` — Cloudflare Turnstile test keys (`1x00000000000000000000AA` site / `1x0000000000000000000000000000000AA` secret), test Postgres URL, test Brevo sandbox key
- [ ] `tests/e2e/registration.spec.ts` — SC-1, AUTH-01, AUTH-02, AUTH-07
- [ ] `tests/e2e/login.spec.ts` — SC-2, AUTH-04, AUTH-05, AUTH-06
- [ ] `tests/e2e/anti-abuse.spec.ts` — SC-3 (mocked Turnstile + rate-limit reset between tests)
- [ ] `tests/e2e/smoke.spec.ts` — SC-5 (prod URL HTTP 200, Sentry trigger)
- [ ] `tests/e2e/branding.spec.ts` — BRAND-02/03/06 (logo, font, palette)
- [ ] `tests/e2e/responsive.spec.ts` — PUB-06 (no horizontal scroll across breakpoints)
- [ ] `tests/unit/disposable-email.test.ts` — AUTH-10
- [ ] `tests/unit/rate-limit.test.ts` — AUTH-09
- [ ] `tests/unit/otp-generator.test.ts` — AUTH-03 (6-digit numeric, HMAC-hashed before persist)
- [ ] `tests/unit/turnstile.test.ts` — AUTH-08 (mocked siteverify response)
- [ ] `tests/unit/queue.test.ts` — AUTH-03, NOTIF-08 (BullMQ enqueue spy + latency)
- [ ] `tests/unit/logger.test.ts` — OPS-03 (no email / IP in serialised JSON)
- [ ] `tests/unit/theme.test.ts` — BRAND-01 (Tailwind theme token snapshot)
- [ ] `pnpm` script `lint:i18n` — fails CI if a Bulgarian string is grep-able outside `messages/bg.json` (PUB-05)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| SPF / DKIM / DMARC DNS records present | NOTIF-07 | DNS state lives outside the repo | `dig TXT <sender-domain>` (SPF) · `dig CNAME mail._domainkey.<sender-domain>` (Brevo DKIM ×2) · `dig TXT _dmarc.<sender-domain>` (DMARC `p=none rua=mailto:`) |
| Google Postmaster Tools shows domain "active" | NOTIF-07 | External dashboard, no API for first-touch verification | Verify domain in Postmaster Tools; capture screenshot showing domain reputation reading at least one of the four signal panels (Spam rate, IP rep, Domain rep, Authentication) |
| Cloudflare WAF blocks non-CF origin requests | OPS-01 | Requires hitting Fly.io origin IP from outside Cloudflare | From a server outside CF: `curl -I https://<fly-host>.fly.dev/` → expect 403 (firewall rule scoped to CF IP ranges) |
| First nightly `pg_dump` upload to Bunny | OPS-06 | First-run verification; subsequent runs covered by alerting | After 24 h: list Bunny Storage bucket; expect dated artefact ≥ 1 KiB; restore test in dev environment from the artefact |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify, or are listed in Manual-Only Verifications, or are Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verify (planner enforces)
- [ ] Wave 0 covers all ❌ references in the table above
- [ ] No `--watch` flags in any test command
- [ ] Feedback latency < 90 s for full suite
- [ ] `nyquist_compliant: true` set in frontmatter when Wave 0 ships green

**Approval:** pending
