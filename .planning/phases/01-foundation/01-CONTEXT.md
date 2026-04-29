# Phase 1: Foundation - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Foundation phase delivers the project skeleton, registration + email-OTP login, branding baseline, ops infrastructure (WAF, error tracking, structured logs, DB backups, CI/CD), and the start of email sender-domain warm-up — the prerequisites that must be in place before any public traffic (Phase 2 QR drop) arrives.

**In scope (23 requirements):** AUTH-01–10, NOTIF-07, NOTIF-08, OPS-01–03, OPS-06, OPS-07, BRAND-01–03, BRAND-06, PUB-05, PUB-06.

**Explicitly NOT in this phase:** public-facing agitation pages (Phase 2), attribution capture (Phase 2), idea catalog and voting (Phase 3), proposals/problem reports (Phase 4), newsletter sending (Phase 5 — but the queue worker is set up here), GDPR self-service export/delete UI (Phase 6 — but the `consents` audit table is laid down here).

</domain>

<decisions>
## Implementation Decisions

### Authentication & Login UX
- **D-01:** Login = 6-digit OTP code via email. No magic link in v1. Same flow used for both first-time email confirmation and subsequent logins (the registration confirmation step is a one-shot OTP that, once accepted, immediately establishes the session and unlocks member features per AUTH-04).
- **D-02:** Auth.js v5 with database-backed sessions via the `@auth/drizzle-adapter` Postgres store. No JWT sessions.
- **D-03:** Session cookie life = **30 days, sliding** (refreshed on each request). Server-side revocable so account deletion (Phase 6) and admin suspension (Phase 4) can immediately invalidate sessions.
- **D-04:** OTP token validity = **10 minutes** for login codes. Registration-confirmation tokens (the first OTP the user receives) = **48 hours** to accommodate users who open the email later in the day. Both codes are single-use; consuming one invalidates any older outstanding codes for the same user.
- **D-05:** Cloudflare Turnstile is required on the registration form only. Login OTP requests are gated by Upstash rate-limit (per email + per IP), no Turnstile. Rationale: login already requires inbox ownership, and Turnstile on every login add friction without proportional security gain.
- **D-06:** Disposable-email blocking via the `disposable-email-domains` open-source blocklist (loaded as a package; refreshed via build-time cron). Rejected at the registration API (AUTH-10) with a generic "този имейл не може да се използва" message.
- **D-07:** Rate limits (Upstash Redis): registration = 3 / IP / 24 h AND 5 / /24-subnet / 24 h (Pitfall 8). Login OTP request = 5 / email / hour AND 20 / IP / hour. Code-verify attempts = 5 / OTP before invalidation.

### Registration Form & Member Schema
- **D-08:** Registration form fields: `full_name` (required), `email` (required), `sector` (required dropdown), `role` (required dropdown), 4 consent checkboxes (see D-12). No SMB-declaration checkbox — the sector/role pickers are themselves the soft self-identification. No company-size field. No BULSTAT/EIK field (V2-VERIFY-01 stays deferred).
- **D-09:** **Sector** values (locked v1): `ИТ`, `Търговия`, `Производство`, `Услуги`, `Друго`.
- **D-10:** **Role** values (locked v1): `Собственик`, `Управител`, `Служител`, `Друго`.
- **D-11:** Member name handling — Phase 1 stores a single `full_name` column (the user's real name, used for editorial/legal accountability). Phase 1 does not display names anywhere public. A separate `display_name` column will be added in Phase 3 when the names-on-votes/proposals decision (Open Decision #1 in REQUIREMENTS.md) is made — schema migration is straightforward at that time. Do **not** retrofit a placeholder display_name in Phase 1.

### Consent Capture (Pitfall 11, GDPR Art. 9 forward-prep)
- **D-12:** Registration form presents **4 separate consent checkboxes**, none pre-ticked:
  1. **Privacy policy + Terms of Use** — required to submit. Versioned link.
  2. **Cookie/analytics consent** — required to submit (also surfaced via the cookie banner; the banner state and the form checkbox must be consistent).
  3. **Newsletter opt-in** — *optional*. Wording: explicit channel + content (e.g., "получавам политически бюлетин от Синя България по имейл"). Collected NOW even though sending starts Phase 5 — avoids re-consenting the entire member base later (per Pitfall 11 / EDPB guidance, lawful basis cannot be retroactively swapped).
  4. **Political-opinion processing for future voting/proposals** — *optional*. Wording: explicit reference to recording votes and authored proposals as political-opinion data under GDPR Art. 9. Forward-prep for Phase 3 — final wording must be confirmed by the Bulgarian data-protection lawyer working on the Art. 9 opinion (Open Decision #3) and may be replaced before Phase 3 ships.
- **D-13:** Consent state is stored in an **append-only `consents` table**: `(id, user_id, kind, granted, version, granted_at, region)` — `kind` enum covers `privacy_terms`, `cookies`, `newsletter`, `political_opinion`. Withdrawals INSERT a new row with `granted = false`; the table is never UPDATE'd or DELETE'd (matches the GDPR-07 INSERT-only audit pattern that returns in Phase 6 for `deletion_log` and `moderation_log`). `region` = oblast/country derived from MaxMind GeoLite2; raw IP never persisted (GDPR-09 forward-prep).
- **D-14:** Legal basis for QR-scan / IP-region attribution data captured before registration = **legitimate interest with documented balancing test**. Cookie banner copy in Phase 1 must already reflect this even though the attribution capture itself ships in Phase 2 — the banner cannot promise something the privacy policy contradicts. The balancing test goes in `.planning/legal/attribution-balancing-test.md` (created in Phase 1).
- **D-15:** Privacy Policy and Terms of Use ship in Phase 1 as **draft pages** with a clearly visible "проект, последна редакция YYYY-MM-DD" marker. Pages must be linkable from the registration form so AUTH-02 isn't blocked. Final lawyer-reviewed versions land in Phase 2 before public traffic.

### Email Sender Domain & Warm-up
- **D-16:** Sender architecture = **split subdomains under a clean project-only root** (e.g., `auth.<project-root>` for transactional, `news.<project-root>` for newsletter). Each subdomain has its own DKIM key in Brevo. SPF/DMARC at the apex with `p=quarantine` initially, escalated to `p=reject` after warm-up. Pitfall 5 explicitly recommends this split — newsletter complaint storms cannot poison login OTP deliverability.
- **D-17:** Domain choice itself is a **coalition decision required by end of Phase 1 plan-week 1** (currently Open Decision #5 in REQUIREMENTS.md). Phase 1 plan must include a deliverable "domain registered + DNS records published" task that blocks downstream warm-up tasks. Recommend `.bg` ccTLD for locality + Pitfall 14 ("encode your own domain in QR"). Coalition does NOT use a sinyabulgaria.bg subdomain to keep mail reputation isolated.
- **D-18:** Warm-up content during the 4-week pre-QR window = **internal soft-launch list**. Coalition collects 50–200 internal opt-ins (volunteers, party staff, early SMB supporters) starting week 1 of Phase 1; they go through the real registration flow → real OTP → welcome email + one weekly "we're building this" update. Generates organic opens/clicks/low complaints — strongest reputation signal Gmail/Yahoo respect. Synthetic warm-up services (Mailwarm, Warmup Inbox) are explicitly rejected — increasingly detected and discounted by 2025+ Gmail spam filters. Plan must include a measurable warm-up cadence (e.g., week 1: 20 sends/day; week 2: 50; week 3: 150; week 4: full-volume readiness check) tied to Google Postmaster Tools metrics (NOTIF-07 success criterion #4).
- **D-19:** Outbound mail delivery goes through **BullMQ + Upstash Redis queue** in Phase 1 (NOTIF-08 explicitly placed here). Even Phase 1's transactional sends (registration confirmation OTP, login OTP, welcome email) are enqueued — never sent synchronously from a Server Action. Same path as the future newsletter blast worker, so Phase 5 reuses infrastructure rather than rewriting send-sites. Critical for Pitfall 6 (QR surge): registration endpoint enqueues and returns "Изпратихме ти код" in <200 ms regardless of Brevo response time.

### Other Phase 1 Implementation Locks
- **D-20:** Cookie consent banner = **CookieYes** (per CLAUDE.md stack). Bulgarian copy. Granular (necessary / analytics / marketing). State persisted server-side via the `consents` table for logged-in users; for anonymous visitors, in CookieYes's own cookie + a server-side audit row keyed by anonymous session.
- **D-21:** Error tracking = **Sentry EU** (Frankfurt). Server logs are structured JSON, shipped to an EU-hosted aggregator (planner picks: Better Stack EU OR Axiom EU — both meet OPS-03; either is acceptable). Logs MUST NOT contain email addresses, full names, or raw IP addresses. Pseudonymous user_id only (Pitfall 3). Log retention = 90 days, documented in privacy policy.
- **D-22:** Cloudflare WAF in front of Fly.io Frankfurt origin (OPS-01). DDoS protection at the WAF tier. Origin only accepts traffic from Cloudflare IP ranges.
- **D-23:** CI/CD = **GitHub Actions → Fly.io** (single environment in Phase 1: production). Auto-run Drizzle migrations on deploy with a manual gate for destructive migrations. Preview deployments per PR are out of scope for Phase 1 (defer if useful in later phases).
- **D-24:** DB backups (OPS-06) = Neon's built-in point-in-time recovery (7-day retention on free tier; lift to 14 days when project goes paid) + a daily `pg_dump` to Bunny.net storage as belt-and-suspenders external copy. Documented restore procedure tested before Phase 1 sign-off.
- **D-25:** Initial admin/editor onboarding — Payload CMS first-user-creates-admin flow gated to localhost-only on first deploy; subsequent editors are added by an existing admin via Payload's invite-user UI. No public admin signup ever exposed.
- **D-26:** Branding scope in Phase 1 = baseline tokens only — color palette + logo + Cyrillic-supporting font stack (BRAND-01, BRAND-02, BRAND-03, BRAND-06) + a minimal shared layout shell (header with logo, footer with required legal links). Component depth limited to what registration / login / error / status pages actually need (button, input, label, alert, card). The full public agitation-page design system ships with Phase 2.
- **D-27:** UI language = Bulgarian only (PUB-05). Use `next-intl` for ALL strings from day one — even with a single locale — so no hardcoded Cyrillic appears in components and so v2's potential second-locale work is a config change, not a refactor. Email subject lines and bodies use nominative greetings only (Pitfall 10).
- **D-28:** Responsive (PUB-06) = mobile-first. Tailwind v4 default breakpoints. Test matrix in plan: iPhone SE viewport, Samsung A-series equivalent, iPad, 1440px desktop.

### Claude's Discretion
- Exact rate-limit numbers (D-07) — sensible defaults; planner can tune in PLAN.md.
- Choice between Better Stack EU and Axiom EU for log aggregation (D-21) — planner can pick based on pricing / DX.
- Specific shadcn/ui components scaffolded in Phase 1 (D-26) — planner picks the minimum set; user only specified "what registration / login / status pages need."
- Exact warm-up volume schedule (D-18) — directionally specified; planner finalizes against Google Postmaster Tools targets.
- Color palette extraction from sinyabulgaria.bg into Tailwind v4 tokens — Claude inspects the live site and proposes tokens; user reviews in plan-phase.
- Database schema details beyond the columns explicitly named here (D-08, D-13) — planner designs migrations.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project north star
- `.planning/PROJECT.md` — Core value, constraints, key decisions, the WhatsApp/Telegram channel decision, and the still-open project decisions including domain pick.
- `.planning/REQUIREMENTS.md` — Authoritative v1 requirements. Phase 1 covers AUTH-01–10, NOTIF-07, NOTIF-08, OPS-01–03, OPS-06, OPS-07, BRAND-01–03, BRAND-06, PUB-05, PUB-06. Open Decisions table at the bottom of this file is required reading — items #2 (MSB verification) and #5 (sender domain) are resolved by this CONTEXT.md; #1, #3, #4 remain open and gate later phases.
- `.planning/ROADMAP.md` § "Phase 1: Foundation" — Goal, depends-on, success criteria. Plan-phase must verify each of the 5 success criteria.
- `.planning/STATE.md` — Current position, blockers/concerns. The Phase 3 Art.9 legal-opinion blocker and Phase 1 dependencies on coalition decisions are documented here.

### Stack
- `CLAUDE.md` — Locked technology stack (Next.js 15 + TypeScript + Postgres/Neon Frankfurt + Drizzle ORM + Payload CMS 3 + Auth.js v5 + Tailwind v4 + shadcn/ui), supporting libraries (Cloudflare Turnstile, Upstash Redis, Brevo, React Email, next-intl, zod, RHF), hosting (Fly.io Frankfurt), and explicit anti-stack list (NOT Google Analytics, NOT reCAPTCHA, NOT SendGrid/Mailchimp, NOT Vercel, NOT Sanity, NOT Firebase). Version compatibility table is authoritative.
- `.planning/research/STACK.md` — Deeper rationale and confidence levels behind each stack choice. Read when picking versions or evaluating alternatives.
- `.planning/research/ARCHITECTURE.md` — Component architecture and dependency graph. Use for high-level wiring questions.

### Pitfalls (mandatory reading for Phase 1 planner)
- `.planning/research/PITFALLS.md` — All 14 pitfalls. Specifically these apply to Phase 1:
  - **Pitfall 2** (GDPR Art. 9 — political opinion as special category) → drives D-12 + D-13.
  - **Pitfall 3** (incomplete right-to-be-forgotten — logs, backups, processors) → drives D-21 (no PII in logs) and shapes Phase 6 work.
  - **Pitfall 5** (email deliverability — sender reputation collapse) → drives D-16, D-17, D-18.
  - **Pitfall 6** (QR campaign launch surge) → drives D-19 (queue), partial driver of D-22 (Cloudflare).
  - **Pitfall 8** (mass fake registration by opponents) → drives D-06 (disposable-email blocklist), D-07 (per-subnet rate limits).
  - **Pitfall 10** (Bulgarian encoding & vocative case in templates) → constraint on D-27.
  - **Pitfall 11** (lawful basis confusion for email and attribution) → drives D-12, D-14.
  - **Pitfall 12** (doxxing risk from public proposal authors) → drives D-11 (defer display_name to Phase 3).
  - **Pitfall 14** (broken / phishing-flagged QR) → drives D-17 (own domain, no third-party shorteners).

### Features context
- `.planning/research/FEATURES.md` — Feature inventory; useful for cross-phase context but NOT a Phase 1 prerequisite.
- `.planning/research/SUMMARY.md` — High-level synthesis; nice-to-have orientation.

### To create during Phase 1 (forward refs)
- `.planning/legal/attribution-balancing-test.md` — Documented legitimate-interest balancing test (per D-14).
- `app/(auth)/...` — Auth UI routes.
- Privacy Policy and Terms pages under `app/legal/...` (draft form, per D-15).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **None yet** — this is a greenfield phase. Phase 1 lays the patterns every later phase will reuse.

### Established Patterns
- **None yet.** Phase 1 *establishes* the project conventions. Patterns this phase must establish (and that Phase 2+ planners will treat as canonical):
  - All user-facing strings via `next-intl` `t()` — no hardcoded Bulgarian in JSX.
  - Server Actions and API routes ALWAYS validate input with `zod` and return Bulgarian error messages via `zod-i18n-map`.
  - All database access via Drizzle queries — no raw SQL except in migrations.
  - All outbound email goes through the BullMQ queue — no direct Brevo SDK calls from Server Actions.
  - All audit-grade tables (`consents`, future `deletion_log`, future `moderation_log`) are append-only at application convention level; INSERT-only DB permissions land in Phase 6 (GDPR-07) but the schema shape is set now.
  - All long-lived identifiers in logs are pseudonymous user_id; no email/name/raw-IP in logs.

### Integration Points
- **Cloudflare** sits in front of Fly.io Frankfurt for WAF + DDoS (OPS-01). Origin restricted to Cloudflare IP ranges.
- **Brevo** receives outbound mail via API; sender = `auth.<root>` for transactional. DKIM key per subdomain.
- **Upstash Redis** acts as both BullMQ broker AND `@upstash/ratelimit` store. Single Upstash instance, two namespaces.
- **Sentry EU** receives unhandled-error events from both Next.js server and client. Source maps uploaded from CI.
- **Neon Postgres Frankfurt** is the single database; both Auth.js sessions and Payload CMS share it (Payload installs into the Next.js app per stack research).
- **Payload CMS 3** is co-located in the Next.js `/app` folder (per CLAUDE.md). Editorial admin UI shares the same Postgres + same deployment as the public app.

</code_context>

<specifics>
## Specific Ideas

- **OTP UX preference inferred from "non-technical SMB owners" framing in PROJECT.md** — keep OTP entry input large, single-field, mobile-keyboard `inputmode="numeric"`. Auto-submit on 6th digit. Auto-focus on page load.
- **Branding fidelity** — use sinyabulgaria.bg's color palette and the official Синя България logo asset. Modern fresh design beyond palette + logo, NOT a pixel-imitation of sinyabulgaria.bg. Logo asset must be obtained from coalition (high-resolution SVG preferred).
- **Pre-launch list capture for warm-up** — coalition-internal sign-up page can simply be the same `/register` route with an early-access promotion via direct invitation. No separate "early access" form required — keeps the warm-up traffic representative of the real registration flow that the QR campaign will hit.
- **Bulgarian content tone** — formal-respectful, contemporary, never vocative. Mirror PROJECT.md / REQUIREMENTS.md prose register.

</specifics>

<deferred>
## Deferred Ideas

These came up during discussion but belong in other phases. Captured so we don't lose them.

- **BULSTAT/EIK auto-verification** — V2-VERIFY-01 (already deferred to v2 in REQUIREMENTS.md).
- **Public `display_name` column + names-on-votes/proposals UX** — Phase 3 (gated on Open Decision #1). Phase 1 schema is forward-compatible; Phase 3 adds the column + migration.
- **Newsletter sending infrastructure (drafting UI, send-cadence, segmentation)** — Phase 5. Phase 1 only stands up the BullMQ worker and captures the `newsletter` consent.
- **Final political-opinion (Art. 9) consent wording** — Phase 3, after coalition's lawyer delivers the Art. 9 legal opinion (Open Decision #3). Phase 1 ships a placeholder wording that the lawyer will replace.
- **Final Privacy Policy and Terms text** — Phase 2 (lawyer-reviewed). Phase 1 ships drafts.
- **WCAG 2.1 AA conformance, video subtitles** — Phase 6 (BRAND-04, BRAND-05). Phase 1 baseline merely uses semantic HTML and accessible shadcn/ui primitives — no formal audit yet.
- **Preview deployments per PR** — out of scope for Phase 1 (could land mid-project as ops improvement).
- **Sector-and-role-based newsletter segmentation** — Phase 5 (uses fields captured at Phase 1 registration).
- **Synthetic warm-up service evaluation** — explicitly rejected (D-18); not deferred, just no.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-04-29*
