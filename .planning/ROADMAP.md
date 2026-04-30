# Roadmap: SMBsite — Платформа за политическо застъпничество на МСП сектора

## Overview

Six phases deliver a complete civic-advocacy platform for coalition Синя България. Phase 1 lays the authenticated foundation and starts email domain warm-up — a hard prerequisite for the QR direct-mail campaign. Phase 2 ships the public landing surface and attribution capture so the QR campaign can launch safely. Phase 3 adds the idea catalog and voting engine (gated on an external GDPR Art.9 legal opinion). Phase 4 enables member submissions and the full editorial moderation workflow. Phase 5 wires up the newsletter and channel notification infrastructure. Phase 6 completes GDPR self-service rights and hardens the platform with load testing before any large-scale campaign expansion.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffolding, authentication, branding baseline, email domain warm-up, core ops infrastructure
- [ ] **Phase 2: Public Surface + Attribution** - CDN-cached agitation pages, attribution capture, legal compliance pages — must ship before the QR mail campaign
- [ ] **Phase 3: Idea Catalog + Voting** - Editor-published idea catalog, binary voting engine with full anti-abuse stack (requires GDPR Art.9 legal opinion)
- [ ] **Phase 4: User Submissions + Editorial** - Member proposals, problem reports, full editorial moderation panel
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
- [ ] 01-01-PLAN.md — Bootstrap Next.js + Payload + TypeScript scaffold (OPS-07)
- [ ] 01-02-PLAN.md — Test scaffolding (Vitest + Playwright + i18n lint + Turnstile test keys) (PUB-05, PUB-06)
- [ ] 01-03-PLAN.md — Drizzle schema + Neon connection + auth/consents tables + schema push (OPS-06)
- [x] 01-04-PLAN.md — i18n + Tailwind v4 theme + shadcn/ui registry + messages/bg.json + Payload Users (BRAND-01, BRAND-06, PUB-05) — Task 1.04.5 (live Payload migrate) deferred until Neon provisioned
- [ ] 01-05-PLAN.md — Auth.js v5 setup + OTP hashing + email-verification middleware (AUTH-04, AUTH-05, AUTH-06, AUTH-07)
- [ ] 01-06-PLAN.md — Anti-abuse stack: Turnstile + Upstash rate limit + disposable-email blocklist (AUTH-08, AUTH-09, AUTH-10)
- [ ] 01-07-PLAN.md — Server Actions: register, requestOtp, verifyOtp, logout (AUTH-01, AUTH-02, AUTH-03, AUTH-05, AUTH-06)
- [ ] 01-08-PLAN.md — Public surface scaffold + branding shell + draft legal pages + balancing-test doc (BRAND-02, BRAND-03, BRAND-06, PUB-05, PUB-06)
- [ ] 01-09-PLAN.md — Auth UI: Registration, Login, OTP forms + end-to-end E2E coverage (AUTH-01, AUTH-02, AUTH-05, AUTH-06, AUTH-07, AUTH-08, PUB-06)
- [ ] 01-10-PLAN.md — Email queue + Brevo worker + React Email templates (BullMQ + Upstash) (AUTH-03, NOTIF-08)
- [ ] 01-11-PLAN.md — Observability: Sentry EU + pino structured logs + PII redaction (OPS-02, OPS-03)
- [ ] 01-12-PLAN.md — Hosting infrastructure: Fly.io + Cloudflare WAF + GitHub Actions CI/CD + pg_dump backups (OPS-01, OPS-06, OPS-07)
- [ ] 01-13-PLAN.md — Email domain warm-up + DNS records + Postmaster Tools + Phase 1 sign-off checklist (NOTIF-07)

**UI hint**: yes

---

### Phase 2: Public Surface + Attribution

**Goal**: Anonymous visitors who scan the QR code from the direct-mail campaign land on fast, CDN-cached agitation pages; every registration event is attributed to its traffic source; legal compliance pages are live. This phase must be deployed and verified before the QR mail drop.

**Depends on**: Phase 1

**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, ATTR-01, ATTR-02, ATTR-03, ATTR-04, ATTR-05, ATTR-06, ATTR-07, GDPR-01, GDPR-02, GDPR-03, OPS-05

**Success Criteria** (what must be TRUE):
  1. A visitor who scans the QR code lands on the landing page in under 2 seconds on simulated Slow 4G; the page is served from Cloudflare CDN cache and does not hit the origin database
  2. Visitor can navigate between multiple agitation pages without registering; a visible "join the community" call-to-action is present on every page
  3. A visitor who arrives via a UTM-tagged link or QR scan has their source (UTM params, HTTP referer, IP-derived region, QR flag) recorded in the attribution database — without raw IP being stored — and that data is visible to an editor in the admin attribution dashboard
  4. The registration form includes a "where did you hear about us" field; answers are captured alongside the attribution event and linked to the user after email confirmation
  5. The Privacy Policy, Terms of Use, and granular cookie consent banner are live and accessible to every visitor before any interaction is recorded

**Plans**: TBD

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

**Plans**: TBD

**UI hint**: yes

---

### Phase 4: User Submissions + Editorial Moderation

**Goal**: Members can submit proposals and problem reports; all user-generated content goes through an editorial moderation queue before appearing publicly; DSA-required reporting mechanisms are in place.

**Depends on**: Phase 3

**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROB-01, PROB-02, PROB-03, PROB-04, PROB-05, EDIT-03, EDIT-04, EDIT-05, EDIT-06, EDIT-07

**Success Criteria** (what must be TRUE):
  1. A member can submit a proposal (title, description, topic) or a problem report (with mandatory local/national level tag and municipality/region selector for local issues); the submission is immediately placed in the moderation queue and NOT published publicly
  2. A member can see the current status (awaiting review / approved / rejected + note) of each of their own submissions at any time
  3. An approved proposal appears in the public idea catalog and can be voted on like any editorial idea; rejected submissions are visible only to the submitter with the moderator's note
  4. An editor can review the full moderation queue, approve or reject items with a note, suspend a member account with a documented reason in the moderation log, and send ad-hoc newsletters from the admin panel
  5. An editor can publish and edit agitation pages (PUB content) directly from the admin panel; all moderation actions are append-only in the moderation_log table

**Plans**: TBD

**UI hint**: yes

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

**Plans**: TBD

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
| 1. Foundation | 0/13 | Not started | - |
| 2. Public Surface + Attribution | 0/TBD | Not started | - |
| 3. Idea Catalog + Voting | 0/TBD | Not started | - |
| 4. User Submissions + Editorial | 0/TBD | Not started | - |
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
