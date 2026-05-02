# Phase 1 — Email Deliverability + Sign-off Checklist

> Manual evidence artefact for NOTIF-07 + Phase 1 sign-off authority.
> Operator fills in evidence as items are completed.
>
> **Sender domain:** `chastnik.eu` (Open Decision #5 / D-17 / RESEARCH Q2 resolved — coalition confirmed `.eu` over `.bg` for semantic clarity ["частник" = private SMB owner] and clean EU residency).
> **Subdomain split (D-16):**
> - `auth.chastnik.eu` — transactional (registration OTP, login OTP, welcome). Owns its own DKIM.
> - `news.chastnik.eu` — newsletter (Phase 5 sender; DNS configured now). Owns its own DKIM.
> - `_dmarc.chastnik.eu` — apex DMARC; cascades down to subdomains via DMARC alignment rules.
>
> **Sender address:** `no-reply@auth.chastnik.eu`
> **DMARC reports inbox:** `emoadm@gmail.com` (apex `rua`); `rua@dmarc.brevo.com` (Brevo-managed subdomain `rua`).

---

## A. DNS records (NOTIF-07)

All records added in Cloudflare DNS for the chosen sender domain.

> **Note on chained DKIM:** Brevo's current onboarding (2025+) issues **chained CNAMEs** instead of the older flat
> `mail._domainkey.<sub> → mail._domainkey.brevo.com` pattern shown in some older docs. Each subdomain ends up with
> THREE CNAMEs (one user-facing alias + two intermediate hops to Brevo's per-domain DKIM signers). This is the
> structure live in Cloudflare today. The original plan template assumed flat structure — adapted below to actual.

### Auth subdomain (transactional — D-16)

| Record       | Type  | Host                                    | Value                                        | Status                  |
| ------------ | ----- | --------------------------------------- | -------------------------------------------- | ----------------------- |
| DKIM alias 1 | CNAME | `mail._domainkey.auth.chastnik.eu`      | `brevo1._domainkey.auth.chastnik.eu`         | [x] added [x] verified  |
| DKIM alias 2 | CNAME | `mail2._domainkey.auth.chastnik.eu`     | `brevo2._domainkey.auth.chastnik.eu`         | [x] added [x] verified  |
| DKIM hop 1   | CNAME | `brevo1._domainkey.auth.chastnik.eu`    | `b1.auth-chastnik-eu.dkim.brevo.com`         | [x] added [x] verified  |
| DKIM hop 2   | CNAME | `brevo2._domainkey.auth.chastnik.eu`    | `b2.auth-chastnik-eu.dkim.brevo.com`         | [x] added [x] verified  |

### News subdomain (newsletter — Phase 5; DNS configured now)

| Record       | Type  | Host                                    | Value                                        | Status                  |
| ------------ | ----- | --------------------------------------- | -------------------------------------------- | ----------------------- |
| DKIM alias 1 | CNAME | `mail._domainkey.news.chastnik.eu`      | `brevo1._domainkey.news.chastnik.eu`         | [x] added [x] verified  |
| DKIM alias 2 | CNAME | `mail2._domainkey.news.chastnik.eu`     | `brevo2._domainkey.news.chastnik.eu`         | [ ] added [ ] verified  |
| DKIM hop 1   | CNAME | `brevo1._domainkey.news.chastnik.eu`    | `b1.news-chastnik-eu.dkim.brevo.com`         | [x] added [x] verified  |
| DKIM hop 2   | CNAME | `brevo2._domainkey.news.chastnik.eu`    | `b2.news-chastnik-eu.dkim.brevo.com`         | [x] added [x] verified  |

> **Note (D-Phase5-prep):** `mail2._domainkey.news.chastnik.eu` not yet added — non-blocking for
> Phase 1 (news.* is the Phase 5 newsletter sender, not the Phase 1 transactional path which
> uses auth.*). Must be added in Cloudflare DNS before Phase 5 first send. Tracked in STATE.md
> Deferred Items table with `resolves_phase: 5`.

### SPF (apex) — defensive include

Per RESEARCH § Brevo SPF (line 698), Brevo passes DMARC via DKIM alignment so an apex SPF TXT is
not strictly required. Configured anyway as a defensive measure (some receiving MTAs still
penalize missing SPF on the From-header domain).

| Record | Type | Host           | Value                              | Status                  |
| ------ | ---- | -------------- | ---------------------------------- | ----------------------- |
| SPF    | TXT  | `chastnik.eu`  | `v=spf1 include:spf.brevo.com ~all` | [x] added [x] verified  |

### DMARC (apex + per-subdomain)

Per RESEARCH line 689-692. Brevo manages the subdomain DMARC records (`p=none`, reports flow to
Brevo's aggregator); the coalition owns the apex policy.

| Record           | Type | Host                       | Value                                                                                            | Status                  |
| ---------------- | ---- | -------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| DMARC (apex)     | TXT  | `_dmarc.chastnik.eu`       | `v=DMARC1; p=quarantine; rua=mailto:emoadm@gmail.com; pct=100; adkim=s; aspf=s`                  | [x] added [x] verified  |
| DMARC (auth sub) | TXT  | `_dmarc.auth.chastnik.eu`  | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`                                               | [x] added [x] verified  |
| DMARC (news sub) | TXT  | `_dmarc.news.chastnik.eu`  | `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`                                               | [x] added [x] verified  |

### Verification commands

Run these from any machine (Cloudflare DNS propagates within ~15 min globally):

```bash
# DKIM chain — auth subdomain
dig CNAME mail._domainkey.auth.chastnik.eu  +short
dig CNAME mail2._domainkey.auth.chastnik.eu +short
dig CNAME brevo1._domainkey.auth.chastnik.eu +short  # → b1.auth-chastnik-eu.dkim.brevo.com.
dig CNAME brevo2._domainkey.auth.chastnik.eu +short  # → b2.auth-chastnik-eu.dkim.brevo.com.

# DKIM chain — news subdomain
dig CNAME mail._domainkey.news.chastnik.eu  +short
dig CNAME mail2._domainkey.news.chastnik.eu +short
dig CNAME brevo1._domainkey.news.chastnik.eu +short  # → b1.news-chastnik-eu.dkim.brevo.com.
dig CNAME brevo2._domainkey.news.chastnik.eu +short  # → b2.news-chastnik-eu.dkim.brevo.com.

# DMARC
dig TXT _dmarc.chastnik.eu      +short  # apex (coalition-owned, p=quarantine)
dig TXT _dmarc.auth.chastnik.eu +short  # Brevo-managed, p=none
dig TXT _dmarc.news.chastnik.eu +short  # Brevo-managed, p=none

# SPF
dig TXT chastnik.eu +short  # → v=spf1 include:spf.brevo.com ~all
```

Expected: each command returns the configured value within 15 minutes of any DNS change.

### DMARC progression (D-16)

- [x] Week 1-2: keep apex `p=quarantine`, monitor `rua` reports landing in `emoadm@gmail.com`
- [ ] Week 4+: escalate apex to `p=reject` once Postmaster Tools shows consistent green domain reputation

## B. Brevo configuration

- [x] Brevo account created in EU region (verified in account settings — billing address in EU)
- [x] `BREVO_API_KEY` set as Fly secret: `fly secrets set BREVO_API_KEY=...` on `smbsite-prod`
- [x] Sender domain `auth.chastnik.eu` authenticated (Brevo dashboard shows green check on all 4 DKIM CNAMEs + DMARC)
- [x] Sender address `no-reply@auth.chastnik.eu` whitelisted as transactional sender
- [x] Test send via Brevo dashboard "Send test" → received in operator's Gmail (subject Cyrillic-safe per Pitfall I)
  - **Evidence:** Real test email landed in `emoadm@gmail.com` Promotions tab with Gmail's authentication panel showing `spf=PASS, dkim=PASS dkim_domain=auth.chastnik.eu, dmarc=PASS`. From `no-reply@auth.chastnik.eu`. Confirmed UTF-8 Cyrillic body renders without artifacts.
- [ ] Sender domain `news.chastnik.eu` authenticated (newsletter sender; configure in Brevo when Phase 5 ships, DNS partially in place — `mail2._domainkey.news` deferred to pre-Phase-5)

## C. Google Postmaster Tools v2 (NOTIF-07)

- [ ] `auth.chastnik.eu` added in Postmaster Tools at https://postmaster.google.com
- [ ] Ownership verified via TXT record (Google-provided value added in Cloudflare DNS as `<token>` on `auth.chastnik.eu`)
- [ ] First data appears within 24-48h of crossing 100 Gmail recipients/day (D-18 week 1 includes ≥10 Gmail addresses)
- [ ] Domain Reputation panel shows at least one of the 4 signals populated (IP rep, Domain rep, Spam rate, Authentication)
- [ ] (Phase 5 prep) `news.chastnik.eu` added to Postmaster Tools when newsletter sending begins

**Evidence:** screenshot of Postmaster Tools dashboard committed encrypted at `.planning/phases/01-foundation/postmaster-week1.png` (or filename referenced in the operator's secure share).

## D. Warm-up readiness (D-18)

- [ ] Internal soft-launch list assembled: 50–200 coalition staff/volunteers, including **at least 10 Gmail and 5 Abv.bg addresses** (Pitfall J — Abv.bg is Bulgaria's dominant local webmail and has stricter filters; Postmaster threshold needs Gmail addresses)
- [ ] Each member registered through `/register` flow (NOT bulk-imported into Brevo) — generates organic engagement signals; synthetic warm-up services (Mailwarm, Warmup Inbox) explicitly rejected (D-18)
- [ ] Warm-up cadence schedule (D-18):
  - [ ] Week 1: 20 sends/day (baseline)
  - [ ] Week 2: 50 sends/day (volume expansion)
  - [ ] Week 3: 150 sends/day (near-threshold; verify Postmaster "High" rep appears)
  - [ ] Week 4: full-volume readiness check (300/day Brevo free tier limit; upgrade to Starter €19/mo before QR drop)
- [ ] Daily reading: warm-up log (`01-WARMUP-LOG.md`) updated with sends/day, opens, complaints, Postmaster reputation

## E. Anti-bot blocklist + WAF refresh cadence

- [ ] Monthly cron / calendar reminder to bump `disposable-email-domains-js` minor version (Pitfall F)
- [ ] Monthly cron / calendar reminder to review Cloudflare WAF logs for new rule needs
- [ ] Quarterly review of rate-limit thresholds (D-07) against actual registration traffic from Phase 2 onwards

## F. Phase 1 sign-off — five ROADMAP success criteria

Reproduced verbatim from `ROADMAP.md` § Phase 1 → Success Criteria. Each item must be evidenced
before declaring Phase 1 complete. Evidence path = absolute repo path or external URL.

### SC-1 — Visitor can register, receive confirmation, activate within one session

> "A visitor can register with name and email, receive a confirmation email from the project's
> own sending domain, and activate their account — all within a single browser session."

- [ ] Test user registers via `https://chastnik.eu/register` with valid Bulgarian name + Gmail address
- [ ] Confirmation email arrives in Gmail inbox (NOT spam) within 30 seconds, From `no-reply@auth.chastnik.eu`
- [ ] OTP code validates → `/member` route loads showing the placeholder content
- [ ] Evidence: `tests/e2e/registration.spec.ts` passes against production URL (`PLAYWRIGHT_BASE_URL=https://chastnik.eu pnpm test:e2e -- registration`)

### SC-2 — Member logs in via OTP, stays logged in across refreshes, can log out from any page

> "A registered member can log in via magic link / OTP and stay logged in across browser
> refreshes; they can log out from any page."

- [ ] Test user logs in via `https://chastnik.eu/login` → OTP → `/member`
- [ ] Refresh `/member` 3 times → session persists (no re-prompt)
- [ ] Click "Изход" in header → redirected to `/login`; visiting `/member` again redirects to `/login`
- [ ] Evidence: `tests/e2e/login.spec.ts` passes against production URL

### SC-3 — Disposable-email + bot registration blocked

> "Disposable-email addresses and bot registrations are blocked: Cloudflare Turnstile must be
> solved, rate limits are active, disposable domains are rejected at the API."

- [ ] `mailinator.com` registration rejected with `auth.register.invalidEmail` Bulgarian message
- [ ] 4th registration from same IP within 24h returns `auth.register.rateLimited`
- [ ] Turnstile widget visible on `/register` (script load); absent on `/login` (D-05)
- [ ] Evidence: `tests/e2e/anti-abuse.spec.ts` passes against production URL

### SC-4 — Sending domain has SPF/DKIM/DMARC; first transactional send delivered; Postmaster shows domain active

> "The email sending domain has SPF, DKIM, and DMARC configured; the first transactional send
> (confirmation email) has been delivered and Google Postmaster Tools shows the domain as active
> — warm-up has begun."

- [x] DNS records from Section A all green for the Phase 1 transactional path (DKIM chain ×4 for `auth.chastnik.eu`, ×3 currently for `news.chastnik.eu` — `mail2._domainkey.news` deferred to pre-Phase-5, apex SPF, apex + 2 sub DMARCs)
- [x] First transactional send delivered: real email from `no-reply@auth.chastnik.eu` reached Gmail with `spf=PASS, dkim=PASS dkim_domain=auth.chastnik.eu, dmarc=PASS` (Section B evidence)
- [ ] Postmaster Tools shows `auth.chastnik.eu` with at least 1 day of reputation data
- [ ] Evidence: dig outputs from Section A + Postmaster screenshot at `postmaster-week1.png`

### SC-5 — Production deploy on EU region, Cloudflare WAF, Sentry active, structured logs, DB backups, CI/CD

> "The application is deployed to production (EU region), behind Cloudflare WAF, with Sentry
> error tracking and structured logging active; database backups and CI/CD pipeline are
> operational."

- [x] Production URL reachable: `curl -I https://chastnik.eu` returns 2xx (live as of plan 01-12 + 01-13 deploy)
- [x] Fly.io app running in Frankfurt (`fra` region per `fly.toml`); served via Cloudflare Sofia edge
- [x] Sentry EU DSN active (verified by `verify-eu-dsn` job in `.github/workflows/deploy.yml`); Sentry test event registered via `/api/_sentry-test` (plan 1.11; flag toggled off after)
- [x] Structured pino JSON logs shipping to Better Stack EU (per plan 1.11)
- [x] Payload admin user bootstrapped (id 2, email `emoadm@gmail.com`); bootstrap route `/api/admin-bootstrap` now disabled
- [ ] First nightly backup landed in Bunny Storage zone `smbsite-backups` > 1 KiB
- [x] GitHub Actions CI green on `main` (latest run on commit `ca15113`)
- [ ] Restore procedure dry-run passed (per OPS-RUNBOOK § 4)
- [x] Direct Fly.io URL test: `curl -I https://smbsite-prod.fly.dev` — *DEFERRED* — Cloudflare WAF custom rule blocking non-CF origin hits is **not yet activated** because the `$cloudflare_ip_ranges` managed list is gated to Cloudflare paid plans (deferred to Phase 2 when paid plan is acquired; see Section G)

**Evidence:** links to GitHub run + Sentry event + Bunny bucket listing — collected by operator.

## G. Deferred items tracked separately

Three items are knowingly carried forward and do **not** block Phase 1 sign-off. Each has a
`resolves_phase` target so they cannot be lost:

1. **GitHub `production` environment lacks required-reviewer protection** — environment protection
   rules are a GitHub paid-plan feature (Teams/Enterprise); the repo is on the free plan.
   Destructive-migration gate (D-23) currently relies on PR review discipline.
   `resolves_phase: 3` (when GHA paid plan is procured for tighter audit before voting goes live).

2. **Cloudflare WAF custom rule blocking non-CF origin hits not active** — the canonical rule
   `(not ip.src in $cloudflare_ip_ranges) and (http.host eq "chastnik.eu")` requires the
   `$cloudflare_ip_ranges` managed list which is gated to Cloudflare Pro+. Currently the Fly
   origin is reachable directly at `smbsite-prod.fly.dev`; the only mitigation is the Fly
   `auto_start_machines` behaviour and that traffic to `chastnik.eu` resolves through Cloudflare
   first (preventing DDoS-style direct hits in normal use). `resolves_phase: 2` (Cloudflare paid
   plan must land before public QR campaign).

3. **Payload `loadEnv.js` patch for `payload migrate` CLI not committed via patch-package** —
   payload@3.84 + next@15.3 incompatibility in `payload migrate` (default-import on `next/env`)
   was worked around by replacing the bootstrap script with a one-shot API route
   (`src/app/api/admin-bootstrap/route.ts` per plan 01-04 fix `fa4be23`). The clean fix is to
   `patch-package` the loadEnv default-import. `resolves_phase: 2` (before any second admin needs
   to be created via CLI rather than UI).

## H. Closing — Phase 1 sign-off

- [ ] All checkboxes in sections A through F that are not flagged "DEFERRED" or in Section G are ticked
- [ ] STATE.md updated to "Phase 1 complete; warm-up week 1 active"
- [ ] Operator signs the line below with date

Signed off: ___________________________ Date: __________

---

> **Status as of plan 01-13 completion (2026-04-30):** Phase 1 code-shipping is complete. DNS
> records and Brevo sender authentication are LIVE and verified (real test email from
> `no-reply@auth.chastnik.eu` reached Gmail with full SPF/DKIM/DMARC pass). Production deploy is
> LIVE at `https://chastnik.eu`. **Pending operator-side work:** Postmaster Tools enrollment,
> warm-up week 1 kickoff, restore-dry-run, first nightly backup verification, final sign-off
> signature. The 4-calendar-week warm-up window can run in parallel with Phase 2 development.
