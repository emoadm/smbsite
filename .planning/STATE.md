---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 1 code-shipping complete — operator warmup + sign-off pending (tracked in 01-DELIVERABILITY-CHECKLIST.md)
last_updated: "2026-05-02T13:42:00.000Z"
last_activity: 2026-05-02 -- Quick task 260502-lhc complete-with-caveat (CI webServer regression fixed: 0/21 → 14/22 passing; surfaced 7 pre-existing app failures tracked as D-CI-app-failures for /gsd-debug). DKIM checklist row corrected.
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 13
  completed_plans: 13
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** Когато един собственик на МСП види сайта, разбира идеята достатъчно, за да даде името и имейла си — и след това продължава да се връща, защото гласът му се вижда и брои.
**Current focus:** Phase 01 — foundation

## Current Position

Phase: 01 (foundation) — CODE-SHIPPING COMPLETE; operator warmup + sign-off pending
Plan: all 13 plans shipped; Phase 1 wall-clock completion gated on operator's 4-week warmup ladder + final sign-off in 01-DELIVERABILITY-CHECKLIST.md Section H
Status: Plan 01-13 complete (01-DELIVERABILITY-CHECKLIST.md + 01-WARMUP-LOG.md produced; chastnik.eu DNS live and verified end-to-end via Gmail SPF/DKIM/DMARC PASS)
Last activity: 2026-05-01 -- Plan 01-13 complete

Progress: [██████████] 100% (13/13 plans complete)

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: Not started

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Pre-roadmap: WhatsApp Business API forbidden for political parties — using WhatsApp Channels + Telegram links from site
- Pre-roadmap: Email domain warm-up starts Phase 1 (blocks QR campaign launch)
- Pre-roadmap: GDPR Art.9 legal opinion required before Phase 3 (voting) can begin — external dependency
- Plan 01-12: Confirmed coalition sender domain = `chastnik.eu` (D-17 / Open Decision #5 resolved); pinned in fly.toml AUTH_URL and throughout OPS-RUNBOOK
- Plan 01-12: Fly.io app declares two process groups (web + worker) sharing one image; worker entry `node --import tsx scripts/start-worker.ts` runs the same plan-01-10 BullMQ worker in production
- Plan 01-12: deploy.yml splits into 3 jobs (verify-eu-dsn -> migrate -> deploy); destructive-migration human gate enforced via GitHub Actions `production` environment + required reviewers (D-23)
- Plan 01-13: Brevo issues chained DKIM CNAMEs (4 records per subdomain — alias×2 + hop×2) instead of the older flat 2-CNAME pattern; checklist documents actual chain for both auth.chastnik.eu and news.chastnik.eu
- Plan 01-13: Apex DMARC `rua=mailto:emoadm@gmail.com` (coalition operator inbox); subdomain DMARCs use Brevo-managed `rua@dmarc.brevo.com` aggregator
- Plan 01-13: Production Payload admin bootstrapped via `/api/admin-bootstrap` HTTP route (now disabled) — fly-ssh procedure in OPS-RUNBOOK §2 hits payload@3.84+next@15.3 loadEnv incompatibility; patch-package fix deferred to phase 2

### Pending Todos

None yet.

### Blockers/Concerns

- **Phase 3 blocker**: GDPR Article 9 legal opinion (political opinion as special-category data) must be obtained from external legal counsel before voting phase begins. Coalition must commission this in parallel with Phase 1-2 development.
- **Phase 1 dependency**: Coalition must confirm email sender domain before Phase 1 completes so warm-up starts on time (must be 4+ weeks before QR mail drop).
- **Open decisions**: Name visibility on votes/proposals (decision required before Phase 3) — still open; MSB status verification approach — RESOLVED in Phase 1 CONTEXT.md (no BULSTAT in v1; sector + role dropdowns serve as soft self-identification).
- **Phase 1 plan-check warnings (non-blocking)**: N-1 anonymous cookie-consent persistence deferred to Phase 6 schema migration (CookieYes first-party cookie satisfies D-20 in interim); N-2 stale "Note on Auth.js signIn" paragraph in plan 07 line 505 (verify command makes it harmless). See `.planning/phases/01-foundation/01-PLAN-CHECK.md` § 2.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260502-jo0 | deploy hardening: prebuild env validator, post-deploy smoke gate, drop unused input-otp | 2026-05-02 | be98b62 | [260502-jo0-deploy-hardening-prebuild-env-validator-](./quick/260502-jo0-deploy-hardening-prebuild-env-validator-/) |
| 260502-lhc | CI webServer regression fix + DKIM mail2 checklist correction (complete-with-caveat: surfaced D-CI-app-failures) | 2026-05-02 | a5d47af | [260502-lhc-fix-ci-webserver-regression-correct-news](./quick/260502-lhc-fix-ci-webserver-regression-correct-news/) |

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| ops | GitHub `production` environment required-reviewer protection (free-plan limitation) | resolves_phase: 3 | Plan 01-13 |
| ops | Cloudflare WAF custom rule `(not ip.src in $cloudflare_ip_ranges) and (http.host eq "chastnik.eu")` (free-plan limitation on `$cloudflare_ip_ranges`) | resolves_phase: 2 | Plan 01-13 |
| ops | Payload `loadEnv.js` patch-package fix for `payload migrate` CLI (payload@3.84 + next@15.3 incompat) | resolves_phase: 2 | Plan 01-13 |
| ops | Operator-side: Postmaster Tools enrollment, 4-week warmup ladder execution, restore dry-run, first nightly backup verification, final Phase 1 sign-off signature | tracked in 01-DELIVERABILITY-CHECKLIST.md | Plan 01-13 |
| ops | `D-Phase5-prep` — `mail2._domainkey.news.chastnik.eu` CNAME not yet added in Cloudflare DNS (must add before Phase 5 first newsletter send; news.* is Phase 5 sender, Phase 1 transactional path uses auth.*) | resolves_phase: 5 | Quick 260502-lhc |
| qa | `D-CI-app-failures` — 7 Playwright specs fail on a5d47af with real assertions (registration/login redirect, AUTH-08 Turnstile widget, SC-5 root render, BRAND-02/03/06, D-15 draft marker). Hypotheses: H1 NEXT_PUBLIC_TURNSTILE_SITE_KEY not in CI bundle, H2 NEXT_PUBLIC_COOKIEYES_SITE_KEY placeholder breaks hydration, H3 Server Actions throw on placeholder env. **BLOCKING** Phase 1 sign-off Section H. Resolve via `/gsd-debug` (single root cause likely → single fix). | resolves_phase: 1 | Quick 260502-lhc |

## Session Continuity

Last session: 2026-05-02
Stopped at: Quick task 260502-lhc complete-with-caveat — webServer fix landed (CI now boots server: 14/22 passing vs 0/21 before), DKIM checklist corrected. Surfaced D-CI-app-failures blocking first-time-green CI on main (Phase 1 sign-off prerequisite).
Resume file: .planning/quick/260502-lhc-fix-ci-webserver-regression-correct-news/260502-lhc-SUMMARY.md (frontmatter `deferred[1]` carries H1/H2/H3 hypotheses for /gsd-debug entry point)
