---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: planning
stopped_at: Phase 6 planned (15 plans, 5 waves) — verified PASS after 1 revision cycle
last_updated: "2026-05-15T16:59:52.698Z"
last_activity: 2026-05-14 -- Phase 04.1 closed. Quick 260514-k4x fixed Phase 5 worker textContent regression (3 email kinds, 6 regression-lock tests added) mid-smoke.
progress:
  total_phases: 13
  completed_phases: 8
  total_plans: 87
  completed_plans: 62
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** Когато един собственик на МСП види сайта, разбира идеята достатъчно, за да даде името и имейла си — и след това продължава да се връща, защото гласът му се вижда и брои.
**Current focus:** Phase 04.1 CLOSED 2026-05-14. Phase 4 + Phase 02.3 surfaces are operational on prod. Phase 6 (GDPR self-service) is the next product-track phase. Phase 3 remains paused under `D-LawyerTrack`. Phase 5 (Notifications) had its first regression surface during 04.1 smoke (textContent missing_parameter on 3 Phase 4 email kinds — fixed via Quick 260514-k4x).

## Current Position

Phase: 04.1 — Payload Schema Reconciliation (CLOSED 2026-05-14)
Status: 6/6 plans complete. Operator end-to-end smoke PASS on all 6 surfaces — see `.planning/phases/04.1-payload-schema-reconciliation/04.1-VERIFICATION.md`. Phase 4 EDIT-* surfaces (moderation queue, approve flow, audit log) + Phase 4 D-B1/D-D1 public surfaces (/predlozheniya, /problemi) + Phase 02.3 /agenda all operational on prod.
Last activity: 2026-05-14 -- Phase 04.1 closed. Quick 260514-k4x fixed Phase 5 worker textContent regression (3 email kinds, 6 regression-lock tests added) mid-smoke.

Progress: [█████████░] 90% phase-shipping (Phase 1 + Phase 2 code-shipping pending operator/coalition deliverables; Phase 3 paused on D-LawyerTrack; Phase 4 + 04.1 + 02.3 fully on prod and verified; Phase 5 code-shipping done + first regression fixed; Phase 6 next).

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

- 2026-05-14 (Phase 04.1 CLOSE): All 6 Phase 04.1 plans complete. Wave 6 operator end-to-end smoke executed today across `/admin/login` (200 + super_editor login OK), `/admin/views/moderation-queue` (UI renders, tabs by kind, columns correct), end-to-end approve flow (`submissions` UPDATE + `moderation_log` INSERT in same Drizzle tx, status email <20s after approve), `/predlozheniya` (200, anonymized byline), `/problemi` (200, by-design empty-state because no approved reports yet), `/agenda` (200, all 12 Phase 02.3 chapters, draftAlert banner absent). The originally-failing 2026-05-11 surface (`column payload_locked_documents__rels.pages_id does not exist`) is fully restored. Phase 04.1's canonical playbook (canonical-schema dump → diff → idempotent backfill → operator Neon SQL apply → revert-the-revert + redeploy → operator smoke) becomes the reference procedure for the next Payload schema change until `payload migrate` returns to CI. Side-effect: smoke surfaced Phase 5 worker textContent regression — `worker.tsx` passed `textContent: ''` for 3 Phase 4 email kinds, Brevo 400'd with `missing_parameter`. Fixed via Quick 260514-k4x (commits b22669c + 1428dc5 + 5bfe42f) with 6 regression-lock tests. Operator-signed VERIFICATION.md at `.planning/phases/04.1-payload-schema-reconciliation/04.1-VERIFICATION.md`.
- Phase 02.2 inserted (URGENT) after Phase 02.1 on 2026-05-08 — Coalition Agenda Content (D-CoalitionContent-Agenda); resolves the BLOCKING warmup-launch deferred item. Source: 25-page PDF (`programa-nie-sme-sinq-balgariq-2.pdf`) extracted to `.planning/coalition/agenda-raw.txt` (~12k words). SPIDR-split: 02.2 = walking-skeleton (manifesto + Десен консенсус + Икономика, ~210 source lines), shipped 2026-05-08. Phase 02.3 (TBD insertion) ships remaining ~10 chapters + removes the draftAlert banner + drops the obsolete `agenda.body` i18n key.
- 2026-05-08 (Phase 02.2 mid-checkpoint): Two Phase 02-04 latent bugs surfaced and fixed during operator visual verification — (a) `@tailwindcss/typography` plugin was never installed despite `prose prose-slate prose-lg` classes being on the agenda article since `1211bca`; harmless while body was a single placeholder `<p>`, broke list rendering once 02.2 added `<ul>`/`<ol>`/h2 content (commit `8e8d384`). (b) Desktop TOC's `position: sticky` overlapped article body because both lived in a single 768px MainContainer column with no sidebar grid (commit `ce857ee`). Both fixes carry forward to Phase 02.3 — the architectural contract is now: 2-column grid layout `[200px_minmax(0,768px)]` md / `[220px_minmax(0,768px)]` lg, with TableOfContents `variant: 'mobile' | 'desktop' | 'both'` prop.
- Phase 02.3 inserted (URGENT) after Phase 02.2 on 2026-05-08 — Coalition Agenda Content Slice 2 (final SPIDR slice). Ships remaining ~10 chapters from `agenda-raw.txt:319+` (Енергетика, ресурси и околна среда onward) into `/agenda`, removes the `<Alert>` draftAlert banner, and drops the obsolete `agenda.body` i18n key from `messages/bg.json`. Inherits architectural contract from Phase 02.2. Run `/gsd-mvp-phase 02.3` for SPIDR splitting.
- 2026-05-11 close-out: Phase 02.3 SHIPPED 2026-05-09 (commits `12d50f8` UI-SPEC → `5e6d6fc` UAT) across 3 plans — plan-01 (4 simple-prose chapters), plan-02 (numbered-policy chapters + test infra), plan-03 (Правосъдие + Защита на ценностите + Alert removal + bg.json cleanup + Playwright spec). Human UAT 2026-05-10: 2 pass, 1 issue (mobile TOC return-nav friction → polish todo `.planning/todos/pending/2026-05-10-agenda-mobile-toc-sticky-fab.md`, non-blocking). Note: phase shipped without a CONTEXT.md — `/gsd-mvp-phase` path bypassed discuss-phase; not retroactively backfilled per user choice 2026-05-11. Resolves D-CoalitionContent-Agenda. ROADMAP.md line 19 marked `[x]`.
- 2026-05-12 deploy + rollback incident: PR #2 (Phase 4 + Phase 02.3 + CI hardening, 135 commits, merge `deaadc0`) merged to main 2026-05-11 ~22:55 UTC. Drizzle migrate ran (no-op — `0003_phase04_submissions` already in ledger thanks to operator-applied backfill 30 min prior). flyctl rolling deploy succeeded; post-deploy smoke (`/`, `/register`, `/login`) passed. Within ~25 min every authenticated `/admin/*` path threw `column payload_locked_documents__rels.pages_id does not exist`. Root cause: Phase 4 added Payload `Pages` + `Ideas` collections to `payload.config.ts:42`, but `payload migrate` is disabled in `deploy.yml` (tsx ESM incompat per `.planning/todos/payload-tsx-esm-incompat.md`) and the manual DDL convention from project memory `project_payload_schema_constraint.md` was not followed for these collections. Resolution: `flyctl deploy --image registry.fly.io/smbsite-prod:deployment-01KR49EAD0V2BE2W8NSYT63V95 --strategy rolling` rolled prod to v52 (pre-merge `3e052f5`); admin restored within 2 min. Drizzle schema 0003 + ledger row remain in prod (forward-compatible — old code doesn't reference the new tables, and a future re-deploy will see 0003 already in ledger and skip). Phase 04.1 (INSERTED, ops-recovery) created to generate the missing Payload DDL. Merge `deaadc0` reverted on main with `[skip ci]` to keep git aligned with prod and prevent accidental re-deploy from any later main push.

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
| 260511-04m | Playwright CI webServer fix — `pnpm start` is incompatible with `next.config.ts` `output: 'standalone'`, server never bound :3000, ~37 page-load specs timed out on PR #2; new `pnpm start:standalone` copies `.next/static` + `public` into `.next/standalone/` then runs `node .next/standalone/server.js`. CI human-verify pending. | 2026-05-10 | 3b484b8 | [260511-04m-fix-playwright-standalone-webserver](./quick/260511-04m-fix-playwright-standalone-webserver/) |
| 260511-0nx | Playwright cf-ray header bypass — second half of 260511-04m. After webServer started, all pages 403'd because `src/middleware.ts:48` requires cf-ray under NODE_ENV=production. Added `extraHTTPHeaders: { 'cf-ray': 'playwright-ci-bypass' }` to `playwright.config.ts` `use` block — mimics Cloudflare edge traffic, doesn't weaken the gate (presence-only check, real auth = D-CloudflareIPAllowlist). CI human-verify pending. | 2026-05-10 | 2620e84 | [260511-0nx-playwright-cf-ray-header-bypass](./quick/260511-0nx-playwright-cf-ray-header-bypass/) |
| 260511-15o | Playwright failures triage (PR #2 / run 25640408203) — 8 newly-visible specs classified: 4 code-bugs (Footer dup logo aria-label, missing `<Label htmlFor>` on Други input, `s-maxage` not emitted at origin), 3 test-bugs (Phase 1 → Phase 2 contract drift in login/registration/proposals-public), 1 config-bug (CookieYes placeholder key blocks networkidle). 4 dispatch batches A-D in TRIAGE.md. No code changes — diagnostic only. | 2026-05-10 | (no code) | [260511-15o-triage-8-newly-visible-playwright-failur](./quick/260511-15o-triage-8-newly-visible-playwright-failur/) |
| 260511-1go | TRIAGE Batch A — close 4 Phase 2 contract-refresh failures: drop dup `aria-label` from Footer brand link (#4), replace Phase 1 redirect assertion with Header "Вход" link visibility check in login.spec (#6), add source-dropdown picker (`qr_letter` / "QR код в писмо") to registration.spec before submit (#8), scope email-leak regex from `page.content()` to `<main>` in proposals-public.spec (#7). CI verified 42/12 → 45/9; #4 reclassified (img alt provides accessible name) and closed separately via 5c6cde3 — branding test scoped to `getByRole('banner')`. | 2026-05-10 | b4536b3 + 5c6cde3 | [260511-1go-batch-a-phase-2-contract-refresh](./quick/260511-1go-batch-a-phase-2-contract-refresh/) |
| 260511-fast-1 | branding.spec.ts locator scope-to-header (`getByRole('banner')`) — follow-on to 260511-1go, closes TRIAGE #4 reclassified as test-bug. Footer aria-label drop in 260511-1go was not enough because `<img alt>` provides the link's accessible name; scoping the test is the structurally-correct fix. | 2026-05-10 | 5c6cde3 | — (gsd-fast inline) |
| 260511-fast-2 | agenda.spec.ts TRIAGE Batch B — `waitForLoadState('networkidle')` → `'domcontentloaded'` (CookieYes Script never settles network with placeholder key) + scope `role="alert"` locator to `article [role="alert"]` (any out-of-scope alert role from Sentry/widget mounts now ignored). Deviated from TRIAGE's primary fix path (empty `NEXT_PUBLIC_COOKIEYES_SITE_KEY` in ci.yml) because `scripts/check-env.ts:109` requires non-empty values. Used TRIAGE's documented alternative. CI verified 46/8 → 48/6. | 2026-05-10 | a4da7da | — (gsd-fast inline) |
| 260514-k4x | Phase 5 email worker textContent regression — `worker.tsx` passed `textContent: ''` to Brevo for `submission-status-approved`, `submission-status-rejected`, and `user-suspended`, Brevo 400'd with `missing_parameter`. Surfaced during Phase 04.1 Wave 6 Smoke 3 (operator approve → moderation_log INSERT verified, but status email never reached Brevo per Fly worker logs from machine 6e823240c12438). Fix: render plain-text via `render(element, { plainText: true })` mirroring OTP/newsletter pattern at lines 61-78. 6 regression-lock tests added (3 render-level + 3 source-level grep gates). All 3 affected Phase 4 email kinds fixed atomically. | 2026-05-14 | b22669c + 1428dc5 | [260514-k4x-phase-5-worker-textcontent-regression-re](./quick/260514-k4x-phase-5-worker-textcontent-regression-re/) |
| 260514-q3u | Wire orphan public + member surfaces into navigation — Header gets 4 top-level links (Програма /agenda, Предложения /predlozheniya, Проблеми /problemi, Въпроси /faq) with desktop inline + mobile hamburger drawer; member dashboard gets 2 primary CTA buttons (Подай предложение /member/predlozhi, Сигнализирай проблем /member/signaliziray) + 2 secondary cards (Моите предложения /member/predlozheniya, Моите сигнали /member/signali). Header.tsx stays Server Component; only HeaderMobileNav.tsx is client-side. Surfaced during Phase 04.1 Wave 6 smoke. 9 unit tests added (5 Header + 4 member-dashboard). | 2026-05-14 | de15b54 + 1875cb6 | [260514-q3u-wire-orphan-public-member-surfaces-into-](./quick/260514-q3u-wire-orphan-public-member-surfaces-into-/) |

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
| legal | `D-LawyerTrack` — both lawyer-dependent items intentionally paused 2026-05-10: (a) Art.9 opinion (gating Phase 3 voting; brief at `.planning/legal/art9-brief-to-counsel.md` still draft, not sent), (b) `D-LawyerReviewLegal` (gating warmup launch; Privacy Policy + Terms review not started). Both resume when a phase about to ship genuinely requires them. Active redirects: Phase 4 to be re-scoped for voting-independent slices (`/gsd-discuss-phase 4`); Phase 6 (GDPR self-service) remains unblocked. Re-activation triggers: operator initiates engagement OR a shipping phase requires the opinion/signed legal text. | resolves_phase: future | Session 2026-05-10 |
| ops | `D-Phase04Plan01-LiveNeonPush` — Plan 04-01 generated `src/db/migrations/0003_phase04_submissions.sql` and the operator applied it via Neon SQL Editor on 2026-05-10 (production). Migration creates `submissions`, `moderation_log`, `ideas` tables, adds `users.status` + `users.platform_role`, and applies REVOKE UPDATE,DELETE on `moderation_log` and REVOKE DELETE on `submissions`. Verify staging Neon branch parity before next staging deploy with `\d submissions; \d moderation_log; SELECT has_table_privilege(current_user, 'moderation_log', 'UPDATE'); SELECT has_table_privilege(current_user, 'moderation_log', 'DELETE');`. | resolves_phase: 04-followup-ops | Plan 04-01 |
| ops | `D-EditorialAccountBootstrap` — every new admin_users row (Payload editorial account) MUST also have a users-table row with the SAME email and `platform_role IN ('editor','super_editor')`, otherwise moderation actions write `reviewer_id`/`actor_user_id` NULL in the audit trail. Bootstrapped 2026-05-10 for the first operator (`emoadm@gmail.com` → users.id `36788725-4627-4a36-811b-b1479c33569f`, `platform_role='super_editor'`). Procedure documented in `.planning/phases/04-user-submissions-editorial-moderation/04-OPS-RUNBOOK.md` §1. Add a checklist item before onboarding any new editor. | resolves_phase: ongoing-ops | Phase 4 verification |
| ci | `D-Phase5-E2E-SeedingHarness` — `tests/e2e/admin-newsletter-composer.spec.ts`, `tests/e2e/community-page.spec.ts` (member-flow), and `tests/e2e/newsletter-preferences.spec.ts` hard-fail in CI without `E2E_EDITOR_EMAIL` / `E2E_EDITOR_PASSWORD` / `E2E_MEMBER_EMAIL` / `TEST_OTP_SINK` env vars + a seeded Payload admin + verified `users` row. CI baseline accepts these 4 failures as known. Needs: ci.yml env block + seed step (Drizzle insert + Payload admin bootstrap) before Playwright invocation, OR a fixture that runs these specs only locally with `--grep` exclusion in CI. | resolves_phase: 5-followup-ci | TRIAGE 260511-15o |
| ci | `D-PlaywrightBatchC-Други-Label` — TRIAGE Batch C: `tests/e2e/attribution.spec.ts:4` fails because `RegistrationForm.tsx:140-152` renders the conditional "Други" free-text input without a `<Label htmlFor="self_reported_other">` element. Test uses `getByLabel(/Моля, уточнете/)` which does NOT match placeholders. Code-bug (a11y regression). Needs design decision: visible label (new i18n key like `auth.register.source.otherLabel`) vs `sr-only`. ~10 min implementation. | resolves_phase: post-PR2 | TRIAGE 260511-15o Batch C |
| ci | `D-PlaywrightBatchD-LandingCacheControl` — TRIAGE Batch D: `tests/e2e/landing.spec.ts:22` asserts `Cache-Control: s-maxage=3600` on `/`. The landing page calls `<Header/>` which invokes `auth()` → forces Next.js to emit `Cache-Control: private, no-cache` from origin. The page's own comment (`src/app/(frontend)/page.tsx:11-17`) acknowledges cache lives at Cloudflare edge, not origin. Needs architecture decision: (a) override in `next.config.ts headers()` for `source: '/'` (recommended for fast PR-2 close — origin emits the header for Cloudflare to honour, verify Plan 02-07 Cloudflare cache rule still vary-keys on session cookie), (b) move `auth()` read out of `Header` for anon paths via a Vary-aware split, or (c) re-scope test to assert at CDN layer only. | resolves_phase: post-PR2 | TRIAGE 260511-15o Batch D |
| ops | ~~`D-PayloadSchemaDriftPhase04`~~ — RESOLVED 2026-05-14 (Phase 04.1 close). Backfill SQL applied to prod Neon 2026-05-12 (Wave 4); revert-of-revert + cherry-pick deployed (Wave 5); operator end-to-end smoke confirms admin shell, moderation queue, approve flow, and all public surfaces operational. Canonical schema dump + delta SQL committed to `.planning/phases/04.1-payload-schema-reconciliation/`. | RESOLVED 2026-05-14 (Phase 04.1) | 2026-05-12 deploy incident |
| ops | `D-EditorNavLinks` — Custom Payload admin views (Attribution Phase 02.1 + Moderation Queue Phase 4) are registered under `admin.components.views.*` in `src/payload.config.ts:29-40` but Payload's side nav only auto-lists Collections + Globals. Editors currently have to know the URLs (`/admin/views/attribution`, `/admin/views/moderation-queue`). Surfaced during Phase 04.1 Wave 6 Smoke 1. Fix: add `admin.components.beforeNavLinks` array with 2 client components. Detailed plan at `.planning/todos/pending/2026-05-14-editor-nav-links-attribution-moderation.md`. | resolves_phase: post-04.1 editor-UX polish | Phase 04.1 smoke 2026-05-14 |

## Session Continuity

Last session: 2026-05-15T16:59:52.655Z
Stopped at: Phase 6 planned (15 plans, 5 waves) — verified PASS after 1 revision cycle
Resume file: .planning/phases/06-gdpr-self-service-hardening/06-01-PLAN.md
Next command: `/gsd:execute-phase 04.1` — execute the 6 plans sequentially. Waves 1-3 are autonomous (dbName edit, local Payload schema dump, idempotent backfill SQL generation); Waves 4-6 are manual prod gates (operator pastes SQL into Neon → revert-the-revert on main → prod E2E smoke). Until 04.1 ships, prod stays on v52; Phase 4 + Phase 02.3 surfaces are NOT live despite their code being merged-then-reverted.

**Coalition external dependencies status (carry-forward):**

- D-CoalitionLogoSVG (BLOCKING phase ship)
- D-CoalitionContent-Hero (placeholder ships, content swaps in)
- ~~D-CoalitionContent-Agenda~~ — RESOLVED 2026-05-09 (Phase 02.3 ship: 12/12 chapters live)
- D-CoalitionChannels (BLOCKING warmup)
- D-LawyerReviewLegal (BLOCKING warmup) — part of D-LawyerTrack pause
- D-CloudflareIPAllowlist (post-warmup hardening, NEW from plan 02-07 revision)
