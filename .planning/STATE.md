---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Phase 02.3 UI-SPEC approved
last_updated: "2026-05-09T22:00:46.737Z"
last_activity: 2026-05-09
progress:
  total_phases: 9
  completed_phases: 6
  total_plans: 58
  completed_plans: 48
  percent: 83
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** Когато един собственик на МСП види сайта, разбира идеята достатъчно, за да даде името и имейла си — и след това продължава да се връща, защото гласът му се вижда и брои.
**Current focus:** Phase 02.3 — Coalition Agenda Content Slice 2 (final SPIDR slice; remaining ~10 chapters + draftAlert removal)

## Current Position

Phase: 03
Plan: Not started
Status: Ready to execute
Last activity: 2026-05-09

Progress: [█████████░] 95% (5 of 9 phases formally complete: 02.1 + 02.2 + Phase 5 code-shipping; Phase 1 + Phase 2 code-shipping pending operator/coalition; Phase 02.3 + 03 + 04 + 06 ahead)

## Performance Metrics

**Velocity:**

- Total plans completed: 12
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02.1 | 8 | - | - |
| 02.2 | 1 | - | - |
| 02.3 | 3 | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: Not started

*Updated after each plan completion*

## Accumulated Context

### Roadmap Evolution

- Phase 02.2 inserted (URGENT) after Phase 02.1 on 2026-05-08 — Coalition Agenda Content (D-CoalitionContent-Agenda); resolves the BLOCKING warmup-launch deferred item. Source: 25-page PDF (`programa-nie-sme-sinq-balgariq-2.pdf`) extracted to `.planning/coalition/agenda-raw.txt` (~12k words). SPIDR-split: 02.2 = walking-skeleton (manifesto + Десен консенсус + Икономика, ~210 source lines), shipped 2026-05-08. Phase 02.3 (TBD insertion) ships remaining ~10 chapters + removes the draftAlert banner + drops the obsolete `agenda.body` i18n key.
- 2026-05-08 (Phase 02.2 mid-checkpoint): Two Phase 02-04 latent bugs surfaced and fixed during operator visual verification — (a) `@tailwindcss/typography` plugin was never installed despite `prose prose-slate prose-lg` classes being on the agenda article since `1211bca`; harmless while body was a single placeholder `<p>`, broke list rendering once 02.2 added `<ul>`/`<ol>`/h2 content (commit `8e8d384`). (b) Desktop TOC's `position: sticky` overlapped article body because both lived in a single 768px MainContainer column with no sidebar grid (commit `ce857ee`). Both fixes carry forward to Phase 02.3 — the architectural contract is now: 2-column grid layout `[200px_minmax(0,768px)]` md / `[220px_minmax(0,768px)]` lg, with TableOfContents `variant: 'mobile' | 'desktop' | 'both'` prop.
- Phase 02.3 inserted (URGENT) after Phase 02.2 on 2026-05-08 — Coalition Agenda Content Slice 2 (final SPIDR slice). Ships remaining ~10 chapters from `agenda-raw.txt:319+` (Енергетика, ресурси и околна среда onward) into `/agenda`, removes the `<Alert>` draftAlert banner, and drops the obsolete `agenda.body` i18n key from `messages/bg.json`. Inherits architectural contract from Phase 02.2. Run `/gsd-mvp-phase 02.3` for SPIDR splitting.

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
- 2026-05-06 (Phase 5 gap-closure, plans 05-12 / 05-13 / 05-14): UAT G1 (worker dotenv load) + G2 (SendBlastButton gate-field wiring — Phase 5 BLOCKER) + G3 (Bulgarian register slip) + G4 (Redis maxmemory-policy=noeviction across all 3 environments under strict no-silent-degradation contract) all closed. The G4 fix transitively closes a latent silent-job-loss risk in Phase 1's OTP queue (same UPSTASH_REDIS_URL — see `src/lib/email/queue.ts:36`); see `.planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md` for per-environment sign-off + skip-flag audit trail. Production never uses the WORKER_SKIP_EVICTION_ASSERT escape hatch. Startup-time assertion in `scripts/start-worker.ts` provides ongoing regression guard — verified-wrong policy always exits, unverifiable case requires explicit env-flag opt-in with structured audit-greppable warn line.

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
| 260507-fast | pin pnpm to 9.15.0 via packageManager field — unblocks Fly.io deploy (corepack was pulling pnpm 11 which needs Node 22) | 2026-05-07 | b5d0a39 | — (gsd-fast inline) |
| 260508-fast | i18n linter: add EXEMPT_DIRS (collections/globals) + EXEMPT_FILES (oblast-names) + `// i18n-allow:` per-line pragma — unblocks CI without losing PUB-05 enforcement | 2026-05-08 | 11a0264 | — (gsd-fast inline) |
| 260508-fast-2 | auth hydration fix — revalidatePath('/', 'layout') in verify-otp + logout actions; Header (Server Component reading auth()) was serving cached null-session render after router.push, causing post-login username/logo bug | 2026-05-08 | 0592610 | — (gsd-fast inline) |
| 260508-fast-3 | drop stale UploadFeature assertion from payload-newsletters.test.ts — implementation deliberately removed UploadFeature, test contract drifted | 2026-05-08 | f0dc87d | — (gsd-fast inline) |
| 260508-rx3 | ramp-up без гласуване — hide voting copy from user-facing surface (RegistrationForm, landing cards, FAQ, welcome email) and drop Art. 9 political-opinion consent checkbox + INSERT; Phase 3 still gated by external legal opinion | 2026-05-08 | 490a4c8 | [260508-rx3-ramp-up-voting-language-user-facing-copy](./quick/260508-rx3-ramp-up-voting-language-user-facing-copy/) |

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| ops | GitHub `production` environment required-reviewer protection (free-plan limitation) | resolves_phase: 3 | Plan 01-13 |
| ops | ~~Cloudflare WAF custom rule~~ — RESOLVED via Plan 02-07 strict-Edge `src/middleware.ts` (cf-ray casual-probe gate, S5 pattern). Hard auth boundary tracked separately as `D-CloudflareIPAllowlist` (post-warmup-hardening). | resolved: Plan 02-07 (cebd636) | Plan 01-13 |
| ops | Payload `loadEnv.js` patch-package fix for `payload migrate` CLI (payload@3.84 + next@15.3 incompat) | resolves_phase: 2 | Plan 01-13 |
| ops | Operator-side: Postmaster Tools enrollment, 4-week warmup ladder execution, restore dry-run, first nightly backup verification, final Phase 1 sign-off signature | tracked in 01-DELIVERABILITY-CHECKLIST.md | Plan 01-13 |
| ops | ~~`D-Phase5-prep` — `mail2._domainkey.news.chastnik.eu` CNAME not yet added in Cloudflare DNS~~ — RESOLVED 2026-05-06 (Plan 05-11 manual verification §1). Operator added the CNAME → `brevo2._domainkey.news.chastnik.eu`; full `news.*` DKIM chain now at parity with `auth.*`. First Phase 5 send unblocked. | resolved: Plan 05-11 (2026-05-06) | Quick 260502-lhc |
| coalition | `D-CoalitionLogoSVG` — official high-res Sinya SVG logo asset. **BLOCKING** Phase 2 final ship. Phase 2 build can proceed with sinyabulgaria.bg live-site asset as placeholder. | resolves_phase: 2 | Phase 2 discuss |
| coalition | `D-CoalitionContent-Hero` — hero headline + sub-headline copy (Bulgarian, formal-respectful). Coalition writes; Phase 2 ships with `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder until delivered. | resolves_phase: 2 | Phase 2 discuss |
| coalition | `D-CoalitionContent-Agenda` — partially resolved 2026-05-08 via Phase 02.2 walking-skeleton slice (manifesto + Десен консенсус + Икономика chapters, ~210 source lines). Phase 02.3 ships remaining ~10 chapters from `agenda-raw.txt:319+` and removes the draft `<Alert>` banner. Coalition source PDF already extracted to `.planning/coalition/agenda-raw.txt` — no further coalition deliverable needed; the gating is now internal phase-execution capacity. | resolves_phase: 02.3 | Phase 2 discuss → partial Phase 02.2 |
| coalition | `D-CoalitionChannels` — WhatsApp Channel + Telegram channel creation + URLs to swap into `/member`. **BLOCKING warmup launch.** Coalition creates; quick task swaps in URLs once available. | resolves_phase: 2 | Phase 2 discuss |
| coalition | `D-LawyerReviewLegal` — final lawyer-reviewed Privacy Policy + Terms of Use text. Coalition has NOT started review. **BLOCKING warmup launch** (in addition to existing Phase 1 sign-off gates). | resolves_phase: 2 | Phase 2 discuss |
| ops | `D-CloudflareIPAllowlist` — configure Fly.io `internal_port` allow-list to accept only Cloudflare IP ranges (true network-layer auth boundary). Phase 2 middleware checks `cf-ray` as a soft signal only — header is plain HTTP and trivially spoofable by an attacker who discovers the origin IP. | resolves_phase: post-warmup-hardening | Plan 02-07 |
| legal | `D-GilroyLicenseRisk` — operator-accepted IP exposure on Gilroy webfont (repalash/gilroy-free-webfont has no LICENSE file, no commercial-use grant; readme redirects to Tinkov commercial source). Mitigation = mechanical swap to Manrope ExtraBold (OFL) preserving `--font-gilroy` CSS variable name. Revisit if challenged or if coalition obtains paid license. | resolves_phase: post-warmup-hardening | Plan 02-01 / Wave 1 license checkpoint |
| coalition | `D-CoalitionFaviconSet` — true multi-resolution favicon.ico + branded apple-touch-icon (currently 32×32 PNG-as-ICO placeholder). Coalition delivers final branded asset set. | resolves_phase: post-warmup | Plan 02-07 |
| ops | `D-CookieVaryCacheRule` — conditional follow-up: if Cloudflare free-tier A1 (cookie-presence Cache Rules) verification falsifies in production, fall back to vary-on-cookie cache strategy or upgrade plan. Covered by Plan 02-07 §2.4 fallback. | resolves_phase: 6 | Plan 02-07 |
| ops | `D-CFPurgeOnDeploy` — automate Cloudflare cache purge on deploy via `.github/workflows/deploy.yml` (currently manual purge per OPS-RUNBOOK §2.6). Stale-content remediation only; not warmup-blocking. | resolves_phase: 6 | Plan 02-07 |
| ops | `D-MaxMindLicenseKey` — operator must register a free MaxMind account, generate a GeoLite2 license key, and set `MAXMIND_LICENSE_KEY` in BOTH Fly.io build secrets (`fly secrets set MAXMIND_LICENSE_KEY=<key> -a smbsite-prod`) AND GitHub Actions repo secrets. Required for every Docker build that consumes Phase 2.1's mmdb download step. **Without it, deploys after Phase 02.1 ship will fail at builder stage.** | resolves_phase: ongoing-ops | Plan 02.1-02 |
| feature | `D-ReferralMechanism` — per-user share-link generation, member dashboard share page, `users.referrer_id` column. Punted from Phase 02.1 (D-14) to a future phase. Rationale: Phase 02.1's gating purpose is QR/UTM measurement before the mail drop; referral is a distinct UX (member-side share page) and conflicts with deferred member self-service. | resolves_phase: future | Plan 02.1-08 |
| feature | `D-ConsentsRegionPopulation` — Phase 02.1 GeoIP-derived oblast does not populate `consents.region`; deferred to Phase 6 (GDPR-04 / GDPR-05) so consents-audit-table writes stay scoped to the GDPR phase. | resolves_phase: 6 | Plan 02.1-08 |
| ops | `D-Phase21Plan01-LiveNeonPush` — Plan 02.1-01 swapped `db:push` for `db:generate` (DIRECT_URL unavailable in worktree); migration `0001_grey_umar.sql` is committed but operator must apply against live Neon production via `pnpm db:migrate` (or CI deploy.yml's migrate job already running on push to main). Verify migration ran successfully before next staging/production deploy. | resolves_phase: 02.1-followup-ops | Plan 02.1-01 |

## Session Continuity

Last session: 2026-05-08T22:21:58.391Z
Stopped at: Phase 02.3 UI-SPEC approved
Resume file: .planning/phases/02.3-coalition-agenda-content-slice-2/02.3-UI-SPEC.md
Next command: /gsd-mvp-phase 02.3 (SPIDR-split into vertical slices) — or /gsd-discuss-phase 02.3 to clarify scope first

**Coalition external dependencies status (run in parallel during execution):**

- D-CoalitionLogoSVG (BLOCKING phase ship)
- D-CoalitionContent-Hero (placeholder ships, content swaps in)
- D-CoalitionContent-Agenda (placeholder ships, content swaps in)
- D-CoalitionChannels (BLOCKING warmup)
- D-LawyerReviewLegal (BLOCKING warmup)
- D-CloudflareIPAllowlist (post-warmup hardening, NEW from plan 02-07 revision)
