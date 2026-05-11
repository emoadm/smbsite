# Roadmap: SMBsite — Платформа за политическо застъпничество на МСП сектора

## Overview

Six core phases (plus one inserted) deliver a complete civic-advocacy platform for coalition Синя България. Phase 1 lays the authenticated foundation and starts email domain warm-up — a hard prerequisite for the QR direct-mail campaign. Phase 2 ships the public landing surface (branded, explanatory) before the warmup ladder begins, so friends/family registering during warmup see real content, not a barebones form. Phase 2.1 (inserted) adds UTM/QR attribution capture and the Payload admin dashboard in parallel with warmup, gating the QR mail drop. Phase 3 adds the idea catalog and voting engine (gated on an external GDPR Art.9 legal opinion). Phase 4 enables member submissions and the full editorial moderation workflow. Phase 5 wires up the newsletter and channel notification infrastructure. Phase 6 completes GDPR self-service rights and hardens the platform with load testing before any large-scale campaign expansion.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffolding, authentication, branding baseline, email domain warm-up, core ops infrastructure
- [~] **Phase 2: Public Surface (Pre-Warmup)** - Branded landing page, Sinya color tokens, real /member welcome page, cookie consent — must ship before warmup ladder begins · *code-shipping complete; awaiting operator (Cloudflare cache rules + CookieYes dashboard + Lighthouse PR review) + coalition deliverables (5 D-* items) per 02-SIGNOFF.md*
- [x] **Phase 2.1: Attribution + Source Dashboard** *(INSERTED)* - UTM/QR/oblast attribution capture + Payload admin dashboard — must complete before QR mail drop · *Completed: 2026-05-08*
- [x] **Phase 2.2: Coalition Agenda Content** *(INSERTED)* - Walking-skeleton SPIDR slice 1: manifesto + 'Десен консенсус' + 'Икономика' chapters + 3-entry TOC into /agenda. Partially resolves D-CoalitionContent-Agenda. · *Completed: 2026-05-08*
- [x] **Phase 2.3: Coalition Agenda Content — Slice 2 (final)** *(INSERTED)* - Ship remaining ~10 chapters from agenda-raw.txt:319+ into /agenda; remove draft Alert banner; drop agenda.body i18n key. Final SPIDR slice; resolves remaining D-CoalitionContent-Agenda. · *Completed: 2026-05-09 (human UAT 2026-05-10: 2 pass / 1 polish todo non-blocking)*
- [ ] **Phase 3: Idea Catalog + Voting** - Editor-published idea catalog, binary voting engine with full anti-abuse stack (requires GDPR Art.9 legal opinion)
- [~] **Phase 4: User Submissions + Editorial** - Member proposals, problem reports, full editorial moderation panel · *code-shipping complete on `gsd/phase-04-user-submissions-editorial-moderation` (PR #2); merged + deployed 2026-05-11, ROLLED BACK same day due to Payload schema drift on prod Neon (column `payload_locked_documents__rels.pages_id` missing); blocked on Phase 04.1*
- [ ] **Phase 04.1: Payload Schema Reconciliation** *(INSERTED, ops-recovery)* - Generate canonical Payload schema, produce idempotent backfill SQL for prod Neon (new tables + `*__rels` columns for Pages/Ideas collections), resolve Drizzle-vs-Payload `ideas` table conflict, re-deploy Phase 4 + Phase 02.3 cleanly
- [ ] **Phase 5: Notifications** - Async newsletter, WhatsApp/Telegram channel links, member notification preferences
- [ ] **Phase 6: GDPR Self-Service + Hardening** - Data export, account deletion, audit tables, load testing, operational readiness

## Phase Details

### Phase 1: Foundation

**Goal**: The project infrastructure is running, authenticated users can register and log in, the visual identity is established, and email domain warm-up has begun — all prerequisites before any public traffic arrives.

**Depends on**: Nothing (first phase)

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08, AUTH-09, AUTH-10, NOTIF-07, NOTIF-08, OPS-01, OPS-02, OPS-03, OPS-06, OPS-07, BRAND-01, BRAND-02, BRAND-03, BRAND-06, PUB-05, PUB-06

**Success Criteria** (what must be TRUE):
  1. A visitor can register with name and email, receive a confirmation email from the project's own sending domain, and activate their account — all within a single browser session
  2. A registered member can log in via magic link / OTP and stay logged in across browser refreshes; they can log out from any page
  3. Disposable-email addresses and bot registrations are blocked: Cloudflare Turnstile must be solved, rate limits are active, disposable domains are rejected at the API
  4. The email sending domain has SPF, DKIM, and DMARC configured; the first transactional send (confirmation email) has been delivered and Google Postmaster Tools shows the domain as active — warm-up has begun
  5. The application is deployed to production (EU region), behind Cloudflare WAF, with Sentry error tracking and structured logging active; database backups and CI/CD pipeline are operational

**Plans**: 13 plans

Plans:
- [x] 01-01-PLAN.md — Bootstrap Next.js + Payload + TypeScript scaffold (OPS-07)
- [x] 01-02-PLAN.md — Test scaffolding (Vitest + Playwright + i18n lint + Turnstile test keys) (PUB-05, PUB-06)
- [x] 01-03-PLAN.md — Drizzle schema + Neon connection + auth/consents tables + schema push (OPS-06)
- [x] 01-04-PLAN.md — i18n + Tailwind v4 theme + shadcn/ui registry + messages/bg.json + Payload Users (BRAND-01, BRAND-06, PUB-05) — Task 1.04.5 (live Payload migrate) deferred until Neon provisioned
- [x] 01-05-PLAN.md — Auth.js v5 setup + OTP hashing + email-verification middleware (AUTH-04, AUTH-05, AUTH-06, AUTH-07)
- [x] 01-06-PLAN.md — Anti-abuse stack: Turnstile + Upstash rate limit + disposable-email blocklist (AUTH-08, AUTH-09, AUTH-10)
- [x] 01-07-PLAN.md — Server Actions: register, requestOtp, verifyOtp, logout (AUTH-01, AUTH-02, AUTH-03, AUTH-05, AUTH-06)
- [x] 01-08-PLAN.md — Public surface scaffold + branding shell + draft legal pages + balancing-test doc (BRAND-02, BRAND-03, BRAND-06, PUB-05, PUB-06)
- [x] 01-09-PLAN.md — Auth UI: Registration, Login, OTP forms + end-to-end E2E coverage (AUTH-01, AUTH-02, AUTH-05, AUTH-06, AUTH-07, AUTH-08, PUB-06)
- [x] 01-10-PLAN.md — Email queue + Brevo worker + React Email templates (BullMQ + Upstash) (AUTH-03, NOTIF-08)
- [x] 01-11-PLAN.md — Observability: Sentry EU + pino structured logs + PII redaction (OPS-02, OPS-03)
- [x] 01-12-PLAN.md — Hosting infrastructure: Fly.io + Cloudflare WAF + GitHub Actions CI/CD + pg_dump backups (OPS-01, OPS-06, OPS-07)
- [x] 01-13-PLAN.md — Email domain warm-up + DNS records + Postmaster Tools + Phase 1 sign-off checklist (NOTIF-07)

**UI hint**: yes

---

### Phase 2: Public Surface (Pre-Warmup)

**Goal**: Anonymous visitors who arrive at the site land on a fast, branded landing page that explains the coalition's mission and gives them a clear "join the community" CTA; the post-registration /member page welcomes them with what's coming next; cookie consent and legal pages are live. This phase MUST ship before the warmup ladder begins so friends/family registering during warmup see real explanatory content and Sinya brand identity, not a barebones registration form.

**Depends on**: Phase 1

**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, GDPR-01, GDPR-02, GDPR-03

**Success Criteria** (what must be TRUE):
  1. Visiting the root URL renders a public landing page within 2 seconds on simulated Slow 4G; the page is served from Cloudflare CDN cache and does not redirect anonymous visitors away from real content
  2. Landing page communicates the coalition's mission, value proposition, and call-to-action clearly in Bulgarian; design uses the Sinya color palette and logo from sinyabulgaria.bg as required by PROJECT.md branding constraint
  3. A registered, email-verified member who lands on /member sees a welcoming Bulgarian page that explains what comes next (community channels, Telegram/WhatsApp Channel links, what to expect from email updates) — not a placeholder
  4. Privacy Policy, Terms of Use, and granular cookie consent banner are live and accessible to every visitor before any interaction is recorded

**Plans**: 9 plans

Plans:
- [ ] 02-01-PLAN.md — Tailwind v4 Sinya tokens + Gilroy webfont (license A2 + Cyrillic A3 + woff2 generation + fonts.ts) (PUB-01)
- [ ] 02-02-PLAN.md — bg.json content scaffolding (landing/agenda/faq/member.welcome/cookie/nav/a11y keys; coalition placeholders) (PUB-01, PUB-03, PUB-04, GDPR-01)
- [ ] 02-03-PLAN.md — Build Phase 2 components (Hero, ValuePropGrid, CTASection, FAQAccordion, Timeline, MemberWelcomeBanner, etc.) + shadcn Accordion + MainContainer prose variant (PUB-01, PUB-04)
- [ ] 02-04-PLAN.md — Pages: replace `/`, create `/agenda` + `/faq`; sitemap + robots; ISR with revalidate=3600 (PUB-01, PUB-02, PUB-03, PUB-04)
- [ ] 02-05-PLAN.md — Replace /member placeholder with welcome page; expand Footer to 4-col grid; verify auth-pages light rebrand (PUB-04)
- [ ] 02-06-PLAN.md — CookieBanner fix (afterInteractive→beforeInteractive) + Sinya CSS overrides + dashboard reconciliation runbook (GDPR-01)
- [ ] 02-07-PLAN.md — Cloudflare WAF deferral resolution (middleware.ts) + next.config.ts cache headers + favicons + OG image (PUB-02)
- [ ] 02-08-PLAN.md — Playwright specs (PUB-01..04 + GDPR-01) + Lighthouse CI + coalition-placeholder grep gate (PUB-01, PUB-02, PUB-03, PUB-04, GDPR-01, GDPR-02, GDPR-03)
- [ ] 02-09-PLAN.md — UI-SPEC review_flag wrap-up + footer cookie-settings link + 02-VALIDATION.md sign-off (PUB-04, GDPR-02, GDPR-03)

**UI hint**: yes

---

### Phase 02.1: Attribution + Source Dashboard (INSERTED)

**Goal**: Every visitor to the public site (especially those arriving via the QR mail drop or UTM-tagged links) has their source recorded — UTM params, HTTP referer, IP-derived Bulgarian oblast, QR flag — without raw IP being persisted; editors can see source breakdowns in an admin attribution dashboard inside Payload; the registration form captures a "where did you hear about us" answer that links to the attribution event after email confirmation. This phase MUST complete before the QR mail drop so the campaign is measurable.

**Depends on**: Phase 2

**Requirements**: ATTR-01, ATTR-02, ATTR-03, ATTR-04, ATTR-05, ATTR-06, ATTR-07, OPS-05

**Success Criteria** (what must be TRUE):
  1. A visitor who arrives via a UTM-tagged link or QR scan has their source (UTM params, HTTP referer, IP-derived oblast, QR flag) recorded in the attribution database; raw IP is never persisted, only the derived oblast string
  2. The registration form includes a "where did you hear about us" field; the answer is captured alongside the most-recent attribution event for that session and linked to the user record after email confirmation
  3. An editor logged into Payload admin can view a source-attribution dashboard showing aggregate counts per UTM source / oblast / QR flag for any chosen date range
  4. Attribution writes are non-blocking on the request path (fire-and-forget or queued) so they cannot slow public-page TTFB
  5. GDPR data subject access export includes the user's attribution row; account deletion cascades remove it

**Plans**: 8 plans

Plans:
- [x] 02.1-01-PLAN.md — Drizzle schema (attribution_events table + users.self_reported_* additions) + schema-invariant grep test + drizzle-kit push to Neon (ATTR-02, ATTR-03..06, GDPR-09)
- [x] 02.1-02-PLAN.md — MaxMind GeoLite2 wrapper (lookupIp + OBLAST_NAMES) + Dockerfile mmdb download via Fly build-secret + CLAUDE.md ipapi.co footnote (ATTR-02)
- [x] 02.1-03-PLAN.md — Bulgarian copy in messages/bg.json: auth.register.source (8 D-10 enum labels) + attribution.dashboard namespace + tone-check tests (ATTR-06, ATTR-07)
- [x] 02.1-04-PLAN.md — BullMQ attribution producer + worker (mirrors email queue pattern) + scripts/start-worker.ts dual-worker registration + Pino redact extension (ATTR-01..04)
- [x] 02.1-05-PLAN.md — /api/attr/init Node-runtime endpoint (cookie set + UTM extract + fire-and-forget enqueue) + <AttrInit/> client mount in frontend layout (ATTR-01, ATTR-03..05)
- [x] 02.1-06-PLAN.md — register Server Action Zod enum + INSERT extension; verify-otp attr_sid → user_id linkage; RegistrationForm dropdown + conditional Други input + e2e (ATTR-05, ATTR-06)
- [x] 02.1-07-PLAN.md — Payload custom view at /admin/views/attribution: RSC role gate + Server Action aggregates + client dashboard (filters + tables + bar list + CSV) + payload.config.ts registration (ATTR-07)
- [x] 02.1-08-PLAN.md — k6 load-test scenario + Hetzner runner runbook + LOAD-TEST.md sign-off (BLOCKING) + STATE.md deferred items update (OPS-05)

**UI hint**: yes

---

### Phase 02.2: Coalition Agenda Content (INSERTED)

**Goal:** As a visitor, I want to read the coalition's manifesto and first policy chapter via the /agenda page, so that I can decide whether to register and join the platform.
**Mode:** mvp

**SPIDR split** (Paths axis, accepted 2026-05-08): this phase delivers the walking-skeleton slice — intro/manifesto JSX + TOC scaffold + ONE policy chapter (Икономика) — proving the JSX-with-prose-and-anchors render approach works end-to-end on real coalition content. Phase 02.3 (new, INSERTED via `/gsd-phase --insert 02.2 ...`) will ship the remaining chapters; final slice removes the `draftAlert` banner and i18n key.

Description: integrate the coalition's official political program (25-page PDF, ~12k words extracted to `.planning/coalition/agenda-raw.txt`) into `/agenda`. Replace the `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder with structured JSX, populate `TOC_ITEMS` with anchored H2 sections.

**Requirements**: TBD (resolves `D-CoalitionContent-Agenda`)
**Depends on:** Phase 2
**Plans:** 1/1 plans complete

Plans:
- [x] 02.2-01-PLAN.md — Slice 1 walking skeleton: manifesto + Десен консенсус + Икономика JSX + TOC + linter exemption + anchor-drift test (D-CoalitionContent-Agenda)

---

### Phase 02.3: Coalition Agenda Content — Slice 2 (final) (INSERTED)

**Goal:** As a visitor, I want to read the coalition's full political program — every chapter — on /agenda, so that I can evaluate the platform's positions before deciding whether to register.
**Mode:** mvp
**Slice:** final (Phase 02.2 walking-skeleton inheritor)

**Description:** Ship the remaining ~10 chapters from `agenda-raw.txt:319+` (Енергетика, ресурси и околна среда onward) into `/agenda` using the architectural contract locked by Phase 02.2: hardcoded Bulgarian JSX in `src/app/(frontend)/agenda/page.tsx`, file-level `lint-i18n` exemption, anchor-drift unit test, 2-column grid layout (`[200px_minmax(0,768px)]` md / `[220px_minmax(0,768px)]` lg) with `TableOfContents` `variant` prop. Final-slice cleanup: remove the `<Alert>` draftAlert banner and drop the obsolete `agenda.body` i18n key from `messages/bg.json`.

**Requirements**: TBD (resolves the remaining portion of `D-CoalitionContent-Agenda`)
**Depends on:** Phase 02.2 (architectural contract + 3-entry TOC scaffold)
**Plans:** 3/3 plans complete

Plans:
- [x] 02.3-01-PLAN.md — Slice 2 simple-prose chapters: Енергетика + Земеделие + Здравеопазване + Външна сигурност и отбрана; TOC 3→7; anchor-drift test ≥7 (REQ-AGENDA-S2-01/02/04/05)
- [x] 02.3-02-PLAN.md — Slice 2 numbered-policy chapters: Образование + Социална политика + Култура inserted in source order; TOC 7→10; anchor-drift test ≥10 (REQ-AGENDA-S2-01/02/04/05)
- [x] 02.3-03-PLAN.md — Slice 2 final cleanup: Правосъдие + Защита на ценностите + drop draftAlert banner + drop agenda.body + add agenda.metadataDescription + new i18n-cleanup unit test + new /agenda Playwright spec; TOC 10→12 final; anchor-drift test ≥12 (REQ-AGENDA-S2-01..05; full D-CoalitionContent-Agenda resolution)

Success Criteria (what must be TRUE):
  1. A visitor opening `/agenda` sees the full coalition program — every chapter from `agenda-raw.txt` rendered as structured Bulgarian JSX with proper headings, paragraphs, lists, and ordered policy items
  2. The Table of Contents lists all top-level chapters in source order; clicking any entry jumps to its section via in-page anchor; the anchor-drift unit test passes for the extended set
  3. The `<Alert>` draftAlert banner is removed (this is the "final slice" condition); the `agenda.body` i18n key is dropped from `messages/bg.json`
  4. `pnpm lint:i18n` continues to pass (file-level EXEMPT_FILES entry from Phase 02.2 already covers all new content)
  5. Operator visual walkthrough confirms typography, list rendering, anchor jumps, and active-section highlighting work end-to-end on desktop AND mobile

**UI hint**: yes

---

### Phase 3: Idea Catalog + Voting

**Goal**: Confirmed members can browse a catalog of editorial ideas and cast approve/reject votes with full integrity guarantees; the six-layer anti-abuse stack is operational. This phase MUST NOT start without the GDPR Article 9 legal opinion confirming the lawful basis for recording political-opinion votes.

**Depends on**: Phase 2 (and external GDPR Art.9 legal opinion)

**Requirements**: IDEA-01, IDEA-02, IDEA-03, IDEA-04, IDEA-05, IDEA-06, IDEA-07, IDEA-08, MEMB-01, MEMB-02, MEMB-03, EDIT-01, EDIT-02, OPS-04

**Success Criteria** (what must be TRUE):
  1. A confirmed member (email verified, 48-hour cooling period elapsed) can browse the idea catalog, filter by topic/date/vote result, and cast one approve or reject vote per idea — changing or retracting their vote is possible
  2. Duplicate votes are physically impossible: a DB-level UNIQUE constraint on (user_id, idea_id) prevents double-counting regardless of concurrent requests or application bugs
  3. Vote result display is visible on each idea (in the form decided by the coalition prior to this phase); an unverified or cooling-period member cannot vote — the gate returns a clear message
  4. An editor can log into the admin panel, create and publish ideas to the catalog, and view real-time vote anomaly alerts when velocity thresholds are exceeded
  5. A member can view their personal dashboard showing their votes and activity; they can update their notification channel preferences

**Plans**: 10 plans

Plans:
- [ ] 03-01-PLAN.md — Wave 0 test scaffolds (8 unit-test files) + bg.json keys (idea/vote/member/profile/admin + email.voteAnomaly namespaces) (IDEA-01..08, MEMB-01..03, EDIT-02, OPS-04)
- [ ] 03-02-PLAN.md — Drizzle schema (votes, vote_events_log, moderation_log, vote_anomalies) + voting utility modules (hmac, cooling, rate-limit, cache, slug) + Drizzle CLI push to staging+prod Neon (IDEA-04..08, OPS-04)
- [ ] 03-03-PLAN.md — Payload Ideas collection + manual Neon DDL [BLOCKING] + payload.config.ts registration (IDEA-01, EDIT-02)
- [ ] 03-04-PLAN.md — castVote / retractVote / undoRetract Server Actions + concurrent-INSERT race + retract integration tests + rate-limit unit test (IDEA-03, IDEA-04, IDEA-05, IDEA-06, IDEA-07)
- [ ] 03-05a-PLAN.md — Public catalog /idei + IdeaCard + TopicChips + SortDropdown + CatalogPagination + 8 shadcn primitives + 1 e2e + 2 unit tests (IDEA-01, IDEA-02)
- [ ] 03-05b-PLAN.md — Idea detail /idei/[slug] + VoteButtons + VoteCountDisplay + RetractToast + TurnstileChallenge + IdeaDetail Lexical render + draft preview gate + 4 e2e + 1 unit test (IDEA-03, IDEA-05, IDEA-06, IDEA-08)
- [ ] 03-06-PLAN.md — Member dashboard My Activity panel + /member/profile read-only page + cooling indicator (MEMB-01, MEMB-02, MEMB-03, IDEA-07)
- [ ] 03-07a-PLAN.md — Editor admin read-only: /admin/views/vote-anomalies View + Dashboard + read-only Server Actions (fetchVoteAnomalies / fetchVoteEventForensic) + role-gate e2e (OPS-04)
- [ ] 03-07b-PLAN.md — Editor admin write-side: IdeaSidebar + ViewOnSiteButton + AnomalyBadge + ExcludeVotesDialog + freezeIdea / excludeVotes / dismissAnomaly / actAnomaly Server Actions + cache.ts silent-freeze gate + manual editor walkthrough (EDIT-01, EDIT-02, OPS-04)
- [ ] 03-08-PLAN.md — OPS-04 anomaly detector worker + Sentry + Brevo email pipeline (loadT pattern) + 3 trigger integration tests + Phase gate end-to-end + OPS-RUNBOOK HMAC rotation + threshold tuning (OPS-04)

**UI hint**: yes

---

### Phase 4: User Submissions + Editorial Moderation

**Goal**: Members can submit proposals and problem reports; all user-generated content goes through an editorial moderation queue before appearing publicly; DSA-required reporting mechanisms are in place.

**Depends on**: Phase 3

**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROB-01, PROB-02, PROB-03, PROB-04, PROB-05, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07

**Re-scope note (2026-05-10):** Phase 4 absorbs EDIT-01 (admin login + role gating), EDIT-02 (Payload Ideas collection CRUD without voting fields), and the moderation_log schema — originally Phase 3 work — under D-LawyerTrack deferral. PROP-04 becomes a read-only public catalog (D-B1) until Phase 3 voting reactivates. See 04-CONTEXT.md.

**Deploy incident (2026-05-11/12):** PR #2 merged (commit `deaadc0`) and deployed; admin shell crashed within minutes on `column payload_locked_documents__rels.pages_id does not exist`. Phase 4 added Payload `Pages` + `Ideas` collections but `payload migrate` is disabled in `deploy.yml` (tsx ESM incompat), so the Payload-side schema delta never reached prod Neon. Image rolled back to v52 (pre-merge `3e052f5`); merge reverted on main with `[skip ci]`. Drizzle migration `0003_phase04_submissions.sql` and its ledger row remain in prod (forward-compatible). Re-deploy gated on Phase 04.1. Phase 4 code preserved on `gsd/phase-04-user-submissions-editorial-moderation`.

**Success Criteria** (what must be TRUE):
  1. A member can submit a proposal (title, description, topic) or a problem report (with mandatory local/national level tag and municipality/region selector for local issues); the submission is immediately placed in the moderation queue and NOT published publicly
  2. A member can see the current status (awaiting review / approved / rejected + note) of each of their own submissions at any time
  3. An approved proposal appears in the public idea catalog and can be voted on like any editorial idea; rejected submissions are visible only to the submitter with the moderator's note
  4. An editor can review the full moderation queue, approve or reject items with a note, suspend a member account with a documented reason in the moderation log, and send ad-hoc newsletters from the admin panel
  5. An editor can publish and edit agitation pages (PUB content) directly from the admin panel; all moderation actions are append-only in the moderation_log table

**Plans**: 8 plans

Plans:
- [x] 04-01-PLAN.md — Schema + DDL: submissions + moderation_log Drizzle tables, users.status + users.platform_role columns, Pages Payload collection, Bulgaria oblast SVG asset; manual Neon SQL Editor migration (PROP-01..02, PROB-01..04, EDIT-03, EDIT-05, EDIT-06, EDIT-07)
- [x] 04-02-PLAN.md — i18n string lock: ~100 Bulgarian keys under submission/problem/dsa/admin/email namespaces; Wave 0 string-presence test enforcing D-C1 anonymity invariants (all 14 reqs)
- [x] 04-03-PLAN.md — Member submission flows: ProposalForm + ProblemReportForm + Server Actions with auth + Turnstile + Upstash rate-limit + Zod + GeoIP oblast suggestion (PROP-01..02, PROB-01..04)
- [x] 04-04-PLAN.md — Member status views: /member/predlozheniya + /member/signali — owner-isolated lists with status badges and rejection notes (PROP-03, PROB-05)
- [x] 04-05-PLAN.md — Public surfaces: /predlozheniya proposals catalog (D-C1 anonymous byline) + /problemi heat-map (D-D2 N≥5 suppression at SQL layer) (PROP-04, PROB-01..04)
- [x] 04-06-PLAN.md — Editorial moderation queue: Payload custom view at /admin/views/moderation-queue with Tabs + Table + ReviewDialog + ConfirmActionDialog; approveSubmission + rejectSubmission Server Actions with transactional double-write (EDIT-04, EDIT-05, EDIT-07 latent fix)
- [x] 04-07-PLAN.md — Editor lifecycle + suspended-account gate + status-change emails: suspendUser + grantEditor + revokeEditor + assertNotLastSuperEditor; member/layout suspended check; BullMQ worker handlers + React Email templates; 04-OPS-RUNBOOK.md (EDIT-06, EDIT-07)
- [x] 04-08-PLAN.md — DSA Article 16 minimum compliance: ReportContentDialog on ProposalCard for logged-in members; submitDsaReport feeds into moderation queue with kind='dsa_report' (no numbered REQ — Phase 4 goal-driven)

**UI hint**: yes

---

### Phase 04.1: Payload Schema Reconciliation (INSERTED, ops-recovery)

**Goal:** Generate the canonical Payload schema delta for the new collections added by Phase 4 (`Pages`, `Ideas`), produce an idempotent backfill SQL file (`*_id` columns on every `payload_*__rels` join table + the collections' own tables + sub-tables), resolve the Drizzle-vs-Payload `ideas` table collision via `dbName` override, apply to prod Neon via SQL Editor, then revert-the-revert on main to re-deploy Phase 4 + Phase 02.3 cleanly.

**Mode:** ops-recovery (no new product surface; restores delivery of work already shipped to code).

**Depends on:** Phase 4 (code preserved on `gsd/phase-04-user-submissions-editorial-moderation`); operator access to prod Neon SQL Editor.

**Requirements:** None new (resolves blocker on PROP-01..04, PROB-01..05, EDIT-03..07 ship).

**Plans:** 6 plans

Plans:
- [ ] 04.1-01-PLAN.md — Ideas collection `dbName: 'payload_ideas'` override (resolves Drizzle-vs-Payload collision per CONTEXT §3 LOCKED option-a)
- [ ] 04.1-02-PLAN.md — Generate canonical Payload schema dump (pg_dump from fresh-Postgres + Payload `push: true` boot) + reproducible-procedure note
- [ ] 04.1-03-PLAN.md — Compute schema delta + write idempotent operator-facing backfill SQL (mirrors 0003 ledger-backfill pattern; 2x apply tested)
- [ ] 04.1-04-PLAN.md — [BLOCKING manual] Apply backfill SQL to prod Neon via SQL Editor; record outcome in APPLY-LOG.md
- [ ] 04.1-05-PLAN.md — [BLOCKING manual] `git revert 244eb85` on main; cherry-pick Plan 04.1-01 dbName change; approve migrate gate; confirm post-deploy smoke
- [ ] 04.1-06-PLAN.md — [BLOCKING manual] End-to-end smoke on prod: /admin/login, /admin/views/moderation-queue, approve flow with moderation_log verification, /predlozheniya, /problemi, /agenda (12 chapters)

**Success Criteria** (what must be TRUE):
  1. A canonical Payload-managed schema dump (`pg_dump --schema-only` against a fresh local Postgres after Payload startup) is committed to `.planning/phases/04.1-payload-schema-reconciliation/canonical-schema.sql` so future Payload schema changes can diff against it.
  2. An idempotent SQL file at `.planning/ops/2026-05-12-payload-schema-phase-04-backfill.sql` exists, has been applied to prod Neon, and post-apply verification SELECTs confirm every new table and column.
  3. The Drizzle-vs-Payload `ideas` collision is resolved in code (Payload's `Ideas` collection uses `dbName: 'payload_ideas'`); Drizzle's `ideas` table is untouched.
  4. Merge commit `deaadc0`'s revert is itself reverted; deploy.yml runs green; post-deploy smoke gate (`/`, `/register`, `/login`) passes.
  5. Operator manual smoke confirms `/admin/login`, `/admin/views/moderation-queue`, and an end-to-end approve/reject path all work on prod.

**Out of scope:**
- Re-enabling `payload migrate` in `deploy.yml` (tracked separately under `.planning/todos/payload-tsx-esm-incompat.md`).
- New Payload collections, fields, or globals beyond what's already in `payload.config.ts` at `deaadc0`.

**Scope doc:** `.planning/phases/04.1-payload-schema-reconciliation/04.1-SCOPE.md`

---

### Phase 5: Notifications

**Goal**: Members receive newsletter emails via an async queue worker; all emails use GDPR-compliant one-click unsubscribe and Bulgarian-language nominative greetings; the site links to WhatsApp Channel and Telegram; members can manage notification preferences.

**Depends on**: Phase 4

**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-09

**Success Criteria** (what must be TRUE):
  1. An editor can trigger a newsletter blast from the admin panel; emails are processed asynchronously via BullMQ — the web request returns immediately and delivery continues in the background without blocking the app
  2. Every newsletter email contains a functional one-click List-Unsubscribe header and footer link; clicking it unsubscribes the member without requiring login; the ESP list is updated within the same session
  3. Email templates use Bulgarian nominative salutations (never vocative), display correctly in Gmail and Outlook desktop with full Cyrillic (including Ж, Щ, Ъ, Ю, Я), and carry no charset encoding artifacts
  4. The site displays visible links to the coalition's WhatsApp Channel and Telegram channel; members can choose their preferred channel from their profile

**Plans**: 11 plans

Plans:
- [x] 05-01-PLAN.md — Shared infra: role-gate extract, logger REDACT, EmailJobKind extension, Brevo headers param, env validator (no NOTIF-* — foundation)
- [x] 05-02-PLAN.md — HMAC unsubscribe lib + Drizzle schema (users.preferred_channel + CONSENT_KINDS extension) + migration (NOTIF-02, NOTIF-03)
- [x] 05-03-PLAN.md — NewsletterEmail master template + Lexical→HTML converter + 5 bg.json namespaces + i18n-direct loadT (NOTIF-06)
- [x] 05-04-PLAN.md — Payload Newsletters collection + CommunityChannels Global + payload.config registration (NOTIF-04, NOTIF-05, NOTIF-09)
- [x] 05-05-PLAN.md — BullMQ worker handlers (newsletter-blast/send-recipient/test/unsub-retry) + recipient query + Brevo blocklist sync (NOTIF-02, NOTIF-06, NOTIF-09)
- [x] 05-06-PLAN.md — /api/unsubscribe Node-runtime route + /unsubscribed page (NOTIF-02, NOTIF-03)
- [x] 05-07-PLAN.md — Newsletter composer custom Payload component + 4 admin Server Actions + live preview (NOTIF-09)
- [x] 05-08-PLAN.md — /member/preferences page + register D-09 extension + member dashboard cards (NOTIF-01, NOTIF-03)
- [x] 05-09-PLAN.md — /community page (preview-vs-redeem) + Footer Column 4 conditional links (NOTIF-04, NOTIF-05)
- [x] 05-10-PLAN.md — [BLOCKING] Schema push — Drizzle migration applied via CI; Payload tables applied via manual DDL (Neon SQL console) after auto-DDL-on-boot assumption failed in prod; gate doc 05-SCHEMA-PUSH.md flipped to applied 2026-05-05
- [x] 05-11-PLAN.md — E2E specs un-skipped + coalition-placeholder grep gate (commit 977ff7a); manual mailbox verifications signed off in 05-MANUAL-VERIFICATION.md (DKIM ✓, Global swap ✓, real test send ✓, Cyrillic Gmail+Apple ✓, Pitfall 2 deferred to first blast, abv.bg/mail.bg/Outlook deferred to first real users); 6 hotfixes shipped during verification

**UI hint**: yes

---

### Phase 6: GDPR Self-Service + Hardening

**Goal**: Members can exercise their GDPR data rights (export and deletion); the full deletion cascade reaches the ESP and all downstream processors; audit tables are INSERT-only at DB permission level; the platform meets WCAG 2.1 AA and passes a 2x load test before any large-scale campaign.

**Depends on**: Phase 5

**Requirements**: GDPR-04, GDPR-05, GDPR-06, GDPR-07, GDPR-08, GDPR-09, BRAND-04, BRAND-05

**Success Criteria** (what must be TRUE):
  1. A member can request a data export from their account settings and receive a downloadable JSON/CSV file containing all their data (profile, votes, proposals, problem reports, consent records) within a reasonable timeframe
  2. A member can initiate account deletion; all their personal data (including ESP contact list entry, attribution events, and session records) is fully wiped within the 30-day grace period; the deletion_log retains only the hashed user_id — no PII
  3. Audit tables (deletion_log, moderation_log) have INSERT-only permission at database level — the application user cannot UPDATE or DELETE rows in these tables; raw IP addresses appear in zero persistent tables
  4. The site meets WCAG 2.1 AA (contrast, keyboard navigation, alt text); all videos have Bulgarian subtitles
  5. A 2x load test at the expected QR campaign peak passes; the platform is cleared for large-scale campaign use

**Plans**: TBD

**UI hint**: yes

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 13/13 | Code-shipping complete; operator warmup + sign-off pending | - |
| 2. Public Surface (Pre-Warmup) | 9/9 | Code-shipping complete; operator + 5 coalition deliverables pending per 02-SIGNOFF.md | - |
| 2.1. Attribution + Source Dashboard | 8/8 | Complete — UAT 16/16 passed, VERIFICATION passed (13/13 must-haves), security threats=0 | 2026-05-08 |
| 2.2. Coalition Agenda Content | 1/1 | Complete — walking-skeleton slice (manifesto + Десен консенсус + Икономика); operator visual verification approved | 2026-05-08 |
| 2.3. Coalition Agenda Content — Slice 2 (final) | 3/3 | Complete — shipped 2026-05-09; rolled back from prod 2026-05-12 alongside Phase 4 due to Payload schema drift; code preserved on Phase 4 branch | 2026-05-09 |
| 3. Idea Catalog + Voting | 0/10 | Not started — planning complete (post-checker revision: 03-05 split into 03-05a/b, 03-07 split into 03-07a/b); HARD-BLOCKED on GDPR Art.9 lawyer opinion before merge | - |
| 4. User Submissions + Editorial | 8/8 | Code-shipping complete on `gsd/phase-04-user-submissions-editorial-moderation` (PR #2); deployed + ROLLED BACK 2026-05-11/12 (Payload schema drift — `payload_locked_documents__rels.pages_id` missing); re-deploy blocked on Phase 04.1 | - |
| 04.1. Payload Schema Reconciliation | 0/6 | Planned 2026-05-12; awaiting execution (Wave 1 code change → Wave 2 dump → Wave 3 backfill SQL → Wave 4 manual prod apply → Wave 5 revert-of-revert deploy → Wave 6 end-to-end smoke) | - |
| 5. Notifications | 0/TBD | Not started | - |
| 6. GDPR Self-Service + Hardening | 0/TBD | Not started | - |

---

## Coverage Validation

**Total v1 requirements:** 81
**Mapped:** 81
**Unmapped:** 0

Note: The REQUIREMENTS.md metadata initially stated 87 requirements; actual count upon enumeration is 81 v1 requirements. All 81 are mapped below.

| Phase | Count | Requirements |
|-------|-------|-------------|
| Phase 1 | 23 | AUTH-01–10, NOTIF-07, NOTIF-08, OPS-01–03, OPS-06, OPS-07, BRAND-01–03, BRAND-06, PUB-05, PUB-06 |
| Phase 2 | 15 | PUB-01–04, ATTR-01–07, GDPR-01–03, OPS-05 |
| Phase 3 | 14 | IDEA-01–08, MEMB-01–03, EDIT-01–02, OPS-04 |
| Phase 4 | 14 | PROP-01–04, PROB-01–05, EDIT-03–07 |
| Phase 5 | 7  | NOTIF-01–06, NOTIF-09 |
| Phase 6 | 8  | GDPR-04–09, BRAND-04, BRAND-05 |
| **Total** | **81** | |

Category cross-check (all ✓):
- AUTH: 10 → Phase 1
- PUB: 6 → Phase 1 (PUB-05, PUB-06) + Phase 2 (PUB-01–04)
- ATTR: 7 → Phase 2
- MEMB: 3 → Phase 3
- IDEA: 8 → Phase 3
- PROP: 4 → Phase 4
- PROB: 5 → Phase 4
- EDIT: 7 → Phase 3 (EDIT-01–02) + Phase 4 (EDIT-03–07)
- NOTIF: 9 → Phase 1 (NOTIF-07, NOTIF-08) + Phase 5 (NOTIF-01–06, NOTIF-09)
- GDPR: 9 → Phase 2 (GDPR-01–03) + Phase 6 (GDPR-04–09)
- BRAND: 6 → Phase 1 (BRAND-01–03, BRAND-06) + Phase 6 (BRAND-04, BRAND-05)
- OPS: 7 → Phase 1 (OPS-01–03, OPS-06, OPS-07) + Phase 2 (OPS-05) + Phase 3 (OPS-04)
</content>
</invoke>