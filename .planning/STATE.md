---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 2 EXECUTING — Waves 1-3 ✓ done (02-01..02-06); 02-04 Task 02.04.5 resolved via Path A (PUB-02 origin cache deferred to 02-07 Cloudflare rules per RESEARCH §1 design); kicking off Wave 4 (02-07 middleware + cache + OG)
last_updated: "2026-05-03T01:00:00.000Z"
last_activity: 2026-05-03 -- Phase 2 plans created and verified. RESEARCH (1086 lines, bf826dc) + PATTERNS (26 files mapped) + 9 PLAN.md files + standalone 02-VALIDATION.md. Plan-checker: 0 blockers; revision pass fixed sleep-8 flakiness (02-04/05/06), Task 02.04.5 type misclassification, cf-ray threat model wording, RESOLVED markers in RESEARCH, extracted VALIDATION. New deferred item: D-CloudflareIPAllowlist (post-warmup hardening).
progress:
  total_phases: 7
  completed_phases: 0
  total_plans: 22
  completed_plans: 13
  percent: 59
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
Last activity: 2026-05-02 -- Quick task 260502-vau complete (D-CI-app-failures resolved end-to-end)

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
- 2026-05-02 (post-Phase-1): Phase 2 split into Phase 2 "Public Surface (Pre-Warmup)" and Phase 2.1 "Attribution + Source Dashboard" (INSERTED). Reason: warmup ladder needs a real branded landing page + welcoming /member page so friends/family registering during warmup see real explanatory content (degrades warmup signal otherwise). Phase 2 keeps PUB-01..04 + GDPR-01..03; ATTR-01..07 and OPS-05 moved to Phase 2.1. Phase 2.1 runs in parallel with warmup, finishes before QR mail drop. Phase directory created: `.planning/phases/02.1-attribution-source-dashboard/`.

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
| 260502-vau | AUTH-08 Turnstile SSR fix — Cause 4 of D-CI-app-failures (resolves debug session end-to-end) | 2026-05-02 | 489aed9 | [260502-vau-fix-auth-08-turnstile-script-timing-race](./quick/260502-vau-fix-auth-08-turnstile-script-timing-race/) |

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| ops | GitHub `production` environment required-reviewer protection (free-plan limitation) | resolves_phase: 3 | Plan 01-13 |
| ops | Cloudflare WAF custom rule `(not ip.src in $cloudflare_ip_ranges) and (http.host eq "chastnik.eu")` (free-plan limitation on `$cloudflare_ip_ranges`) | resolves_phase: 2 | Plan 01-13 |
| ops | Payload `loadEnv.js` patch-package fix for `payload migrate` CLI (payload@3.84 + next@15.3 incompat) | resolves_phase: 2 | Plan 01-13 |
| ops | Operator-side: Postmaster Tools enrollment, 4-week warmup ladder execution, restore dry-run, first nightly backup verification, final Phase 1 sign-off signature | tracked in 01-DELIVERABILITY-CHECKLIST.md | Plan 01-13 |
| ops | `D-Phase5-prep` — `mail2._domainkey.news.chastnik.eu` CNAME not yet added in Cloudflare DNS (must add before Phase 5 first newsletter send; news.* is Phase 5 sender, Phase 1 transactional path uses auth.*) | resolves_phase: 5 | Quick 260502-lhc |
| coalition | `D-CoalitionLogoSVG` — official high-res Sinya SVG logo asset. **BLOCKING** Phase 2 final ship. Phase 2 build can proceed with sinyabulgaria.bg live-site asset as placeholder. | resolves_phase: 2 | Phase 2 discuss |
| coalition | `D-CoalitionContent-Hero` — hero headline + sub-headline copy (Bulgarian, formal-respectful). Coalition writes; Phase 2 ships with `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder until delivered. | resolves_phase: 2 | Phase 2 discuss |
| coalition | `D-CoalitionContent-Agenda` — entire `/agenda` page text (political program, vision, ~800-2000 words). Coalition writes; placeholder mechanism until delivered. | resolves_phase: 2 | Phase 2 discuss |
| coalition | `D-CoalitionChannels` — WhatsApp Channel + Telegram channel creation + URLs to swap into `/member`. **BLOCKING warmup launch.** Coalition creates; quick task swaps in URLs once available. | resolves_phase: 2 | Phase 2 discuss |
| coalition | `D-LawyerReviewLegal` — final lawyer-reviewed Privacy Policy + Terms of Use text. Coalition has NOT started review. **BLOCKING warmup launch** (in addition to existing Phase 1 sign-off gates). | resolves_phase: 2 | Phase 2 discuss |
| ops | `D-CloudflareIPAllowlist` — configure Fly.io `internal_port` allow-list to accept only Cloudflare IP ranges (true network-layer auth boundary). Phase 2 middleware checks `cf-ray` as a soft signal only — header is plain HTTP and trivially spoofable by an attacker who discovers the origin IP. | resolves_phase: post-warmup-hardening | Plan 02-07 |
| legal | `D-GilroyLicenseRisk` — operator-accepted IP exposure on Gilroy webfont (repalash/gilroy-free-webfont has no LICENSE file, no commercial-use grant; readme redirects to Tinkov commercial source). Mitigation = mechanical swap to Manrope ExtraBold (OFL) preserving `--font-gilroy` CSS variable name. Revisit if challenged or if coalition obtains paid license. | resolves_phase: post-warmup-hardening | Plan 02-01 / Wave 1 license checkpoint |

## Session Continuity

Last session: 2026-05-03
Stopped at: Phase 2 fully planned (9 plans, 6 waves, 37 tasks). All 7 requirements (PUB-01..04, GDPR-01..03), all 4 success criteria, all 18 D-decisions, all 4 UI-SPEC review_flags, all 8 RESEARCH assumptions A1-A8 covered. Plan-checker pass with 0 blockers; targeted revision pass corrected sleep-8 flakiness, task-type misclassification, cf-ray threat model wording, RESOLVED markers, extracted standalone 02-VALIDATION.md.
Resume file: .planning/phases/02-public-surface-pre-warmup/02-01-PLAN.md (Wave 1 entry point)
Next command: /gsd-execute-phase 2

**Coalition external dependencies status (run in parallel during execution):**
- D-CoalitionLogoSVG (BLOCKING phase ship)
- D-CoalitionContent-Hero (placeholder ships, content swaps in)
- D-CoalitionContent-Agenda (placeholder ships, content swaps in)
- D-CoalitionChannels (BLOCKING warmup)
- D-LawyerReviewLegal (BLOCKING warmup)
- D-CloudflareIPAllowlist (post-warmup hardening, NEW from plan 02-07 revision)
