# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 1-Foundation
**Areas discussed:** Login UX, MSB verification at registration, Registration consents & form scope, Email warm-up plan & subdomain strategy

---

## Login UX

### How should members log in (and confirm their email after registration)?

| Option | Description | Selected |
|--------|-------------|----------|
| 6-digit OTP code (Recommended) | Email contains a 6-digit code; user types it on the site. Works on any mail client, on mobile without context-switching, no risk of email-link prefetchers (Outlook Safe Links, mail-scanners) burning the token. Slightly more friction than one-click but more reliable for non-technical SMB owners. | ✓ |
| Magic link (one-click URL) | Email contains a signed URL; user clicks once. Lowest friction. Risk: corporate mail scanners (Mimecast, Microsoft Safe Links) hit the link before the user, invalidating it. Bulgarian SMB inboxes have less of this but it's a known support burden. | |
| Both — OTP primary, magic link as alternative | Email contains both code and link. Doubles email content and template work, slight ambiguity. Best UX coverage but more surface to maintain and test for Bulgarian rendering. | |

**User's choice:** 6-digit OTP code

### Where in the login flow should the CAPTCHA (Turnstile) actually appear?

| Option | Description | Selected |
|--------|-------------|----------|
| Registration only (Recommended) | Turnstile gates the registration form (AUTH-08). Login is rate-limited per email + per IP via Upstash but no CAPTCHA. Login is already gated by ownership of the email. | ✓ |
| Registration + login request | Also gate the 'send me my code' endpoint with Turnstile. Stops bulk OTP-spam attacks. More friction; Turnstile is invisible most of the time so practical cost is low. | |
| Registration + login + adaptive (only after rate limit hit) | Turnstile only appears on login after Upstash rate-limit triggers. More complex; gives best legitimate-user experience but harder to reason about under attack. | |

**User's choice:** Registration only

### How long should the OTP/magic-link be valid?

| Option | Description | Selected |
|--------|-------------|----------|
| OTP 10 min, registration link 48 h (Recommended) | Login OTP short-lived per OWASP / NIST 800-63B. Registration confirmation tokens longer (48 h) so a user who opens the email later still activates. | ✓ |
| OTP 30 min, registration link 24 h | More forgiving on login but extends the window for stolen-code abuse. Shorter registration window risks losing late activators. | |
| OTP 5 min, registration link 24 h (strict) | Higher security, more support requests of the form 'my code expired'. Probably wrong for a non-technical audience. | |

**User's choice:** OTP 10 min, registration link 48 h

### Session persistence — how long does login last?

| Option | Description | Selected |
|--------|-------------|----------|
| 30 days, sliding (Recommended) | Auth.js DB-backed session in Postgres via Drizzle adapter. Sliding expiry refreshes on activity. Long enough that members come back via newsletter without re-auth; revocable server-side. | ✓ |
| 30 days, absolute | Same length, no sliding refresh — every member re-authenticates monthly. Cleaner from a security view; more friction for engaged members. | |
| 7 days, sliding | Shorter cookie life. Higher friction but tighter blast radius. Probably overkill for v1 given OTP-only login. | |

**User's choice:** 30 days, sliding

---

## MSB verification at registration

### What does the registration form ask of an SMB owner/manager beyond name + email?

| Option | Description | Selected |
|--------|-------------|----------|
| Self-declaration checkbox only (Recommended) | One required checkbox: "Декларирам, че съм собственик или мениджър на МСП в България." | |
| Self-declaration + optional BULSTAT/EIK field | Checkbox + optional 9-digit BULSTAT text field (no live validation in v1). | |
| Just name + email — no SMB question at all in Phase 1 | Simplest. Adds friction-free signup. The 'how did you hear' field arrives in Phase 2 (ATTR-06) and gives some signal. | ✓ |

**User's choice:** Just name + email — no SMB question at all in Phase 1
**Notes:** User then accepted sector + role as required fields below — these effectively serve as the soft self-identification of being SMB-aligned.

### Should we collect a self-declared sector/role tag at registration?

| Option | Description | Selected |
|--------|-------------|----------|
| No — keep registration minimal (Recommended) | Sector and role go on the member's profile post-confirmation. | |
| Yes — single dropdown (sector) | One required dropdown: ИТ / Търговия / Производство / Услуги / Друго. | |
| Yes — include both sector and 'role' (owner / manager / employee) | Most data captured up front. Highest abandonment risk. | ✓ |

**User's choice:** Yes — include both sector and 'role'

### Display name vs legal name on the platform?

| Option | Description | Selected |
|--------|-------------|----------|
| One name field at registration; introduce display_name later (Recommended) | Registration captures full real name. Public display defaults to that name in Phase 1 (no public profile pages). When proposals/voting arrive (Phase 3-4), a separate display_name column is added — doxxing decision (Pitfall 12) gets resolved then. | ✓ |
| Two fields at registration (legal_name + display_name) | Future-proof from day one. More form fields = more friction. | |
| Single name field, no plan for display_name | Defers the doxxing decision. Worst option. | |

**User's choice:** One name field at registration; introduce display_name later

### Company size field?

| Option | Description | Selected |
|--------|-------------|----------|
| No (Recommended) | Keep registration to: name, email, MSB declaration, consents. Company size lives on the member profile, optional, edited later. | ✓ |
| Yes — optional dropdown (1, 2-9, 10-49, 50-249) | One dropdown matching the EU SME bands. Optional means low friction. | |

**User's choice:** No

### Sector + role — required or optional?

| Option | Description | Selected |
|--------|-------------|----------|
| Both required (Recommended) | Sector and role both required. Guarantees every member is segmentable from day one. ~4 extra clicks total. | ✓ |
| Both optional | Lower friction but ~30-50% of v1 members may be unsegmented for newsletter targeting. | |
| Sector required, role optional | Sector is the more useful tag; role is finer detail. Balanced friction. | |

**User's choice:** Both required

### Role values

| Option | Description | Selected |
|--------|-------------|----------|
| Собственик / Управител / Служител / Друго (Recommended) | 4 options: owner, manager (управител covers all manager grades), employee, other. 'Other' is escape hatch for the long tail. | ✓ |
| Собственик / Управител only | Strict to target audience. Risk: legitimate fans cannot pick anything that fits. | |
| Open free-text field | Maximum flexibility, zero structure for segmentation. | |

**User's choice:** Собственик / Управител / Служител / Друго

### Sector values

User accepted the example list shown in the question selecting sector + role: ИТ / Търговия / Производство / Услуги / Друго. Locked.

---

## Registration consents & form scope

### Which consent checkboxes appear on the Phase 1 registration form?

| Option | Description | Selected |
|--------|-------------|----------|
| Forward-prep: 4 separate checkboxes (Recommended) | (1) Privacy + Terms (required), (2) Cookies (required), (3) Newsletter opt-in (optional, unticked), (4) Political-opinion processing for future voting (optional, unticked). Pitfall 2 + 11 specifically warn that retroactively adding these consents is legally fragile. | ✓ |
| Minimum: 2 checkboxes (privacy + cookies only) | Just AUTH-02. Newsletter consent collected when Phase 5 launches. Risk: members must be re-prompted; lower opt-in rate. | |
| Minimum + newsletter (3 checkboxes) | Cover Phase 5 forward but defer the Art.9 political-opinion consent to Phase 3. | |

**User's choice:** Forward-prep: 4 separate checkboxes

### How is consent (timestamp + privacy policy version) recorded for audit?

| Option | Description | Selected |
|--------|-------------|----------|
| `consents` table, append-only (Recommended) | Every checkbox tick/untick produces a row. Withdrawals add new rows, never UPDATE/DELETE. Same audit-table shape as future deletion_log and moderation_log (GDPR-07). | ✓ |
| Boolean columns on the user row + a `last_consent_at` timestamp | Simpler. Loses history when a user toggles a consent. Probably fails 'demonstrate consent' test. | |
| Log to a JSON column on the user row | Mid-ground. Functional but harder to query; diverges from the rest of the audit pattern. | |

**User's choice:** `consents` table, append-only

### What's the legal basis for QR-scan / IP-region attribution captured before registration?

| Option | Description | Selected |
|--------|-------------|----------|
| Legitimate interest (documented balancing test) (Recommended) | ATTR-02 already requires raw IP → (region, country) immediate conversion via MaxMind GeoLite2; raw IP discarded. Pitfall 11 says this is the right basis IF a balancing test is documented. | ✓ |
| Consent (cookie banner Accept gates attribution capture) | Strictest, but means visitors who decline cookies have zero attribution data. Reduces campaign measurability. | |
| Defer the call to Phase 2 | Risky — cookie banner ships in Phase 1; banner copy must already match the legal basis. | |

**User's choice:** Legitimate interest (documented balancing test)

### Privacy policy & Terms — placeholder pages or block until lawyer-reviewed?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 1 ships placeholder pages with a 'draft, last updated' marker (Recommended) | We can't ship registration without these pages. Phase 1 lays down v0 draft, marked as draft, replaced before public traffic. | ✓ |
| Block Phase 1 completion until coalition's lawyer signs final text | Cleanest legally, but couples Phase 1 ship date to an external dependency. May stall the project. | |
| Skip the page entirely; show inline legal text in the form | Inferior UX. Rejected. | |

**User's choice:** Phase 1 ships placeholder pages with a 'draft, last updated' marker

---

## Email warm-up plan & subdomain strategy

### Sender domain architecture for Phase 1 — single domain or split subdomains?

| Option | Description | Selected |
|--------|-------------|----------|
| Split subdomains: `auth.<root>` + `news.<root>` (Recommended) | Pitfall 5 explicitly recommends this. Newsletter complaints don't poison transactional reputation. Brevo supports per-sender DKIM. | ✓ |
| Single sender domain for everything | Simpler DNS. If newsletter ever earns a block-list hit, login OTPs also bounce — site becomes unusable. | |
| Apex domain for transactional + subdomain for newsletter | Common pattern but a bad apex reputation cascades into deliverability of every email. | |

**User's choice:** Split subdomains

### Warm-up content during the 4-week window before the QR mail drop?

| Option | Description | Selected |
|--------|-------------|----------|
| Internal soft-launch list — coalition staff + early supporters opt-in (Recommended) | Coalition collects ~50-200 internal opt-ins via a pre-launch sign-up. Real OTPs + welcome emails + 1×/week update. Generates organic engagement (opens, clicks, low complaints) — strongest reputation signal. | ✓ |
| Synthetic warm-up with seed-list providers (Warmup Inbox, Mailwarm) | Pay a third-party warmup service. Increasingly detected/discounted by Gmail and disfavored in 2025+. Skip. | |
| Transactional only — no proactive warm-up content | Risk: zero volume → zero reputation → reputation only starts forming once the QR drop hits. Defeats the purpose. | |

**User's choice:** Internal soft-launch list

### Outbound delivery infrastructure — Brevo direct API or BullMQ worker now?

| Option | Description | Selected |
|--------|-------------|----------|
| Stand up BullMQ + Redis queue NOW for transactional (Recommended) | NOTIF-08 is in Phase 1. Same path as future newsletter blast — no rewrite later. Pitfall 6 (QR surge) requires async enqueue. | ✓ |
| Direct Brevo SDK call from Server Action; defer queue to Phase 5 | Faster Phase 1. Phase 5 has to refactor every transactional send-site. Synchronous Brevo calls bottleneck registration under surge. Goes against NOTIF-08 explicit Phase 1 placement. | |

**User's choice:** Stand up BullMQ + Redis queue NOW for transactional

### Email-sender domain pick

| Option | Description | Selected |
|--------|-------------|----------|
| Register a clean project-only root now; subdomains under it (Recommended) | E.g., `<smb-platform-name>.bg`. Coalition picks the exact name. Decoupled from sinyabulgaria.bg's mail reputation. | ✓ |
| Subdomain of sinyabulgaria.bg (e.g., `mcp.sinyabulgaria.bg`) | Reuses coalition's existing DNS authority. Inherits reputation; coupling to coalition operations. | |
| Block Phase 1 until coalition decides domain | Cleanest, but stalls Phase 1 entirely. Domain pick is a 1-day decision. | |

**User's choice:** Register a clean project-only root now; subdomains under it

---

## Claude's Discretion

User accepted that Claude / planner will pick on the following:

- Exact rate-limit numbers for registration / login / OTP-verify endpoints
- Choice between Better Stack EU and Axiom EU for log aggregation (OPS-03)
- Specific shadcn/ui components scaffolded in Phase 1 (minimum needed for registration / login / status pages)
- Exact warm-up volume schedule (directionally specified; planner finalizes against Google Postmaster Tools targets)
- Color palette extraction from sinyabulgaria.bg into Tailwind v4 tokens (Claude inspects, proposes, user reviews in plan-phase)
- Database schema details beyond columns explicitly named in CONTEXT.md

## Deferred Ideas

- BULSTAT/EIK auto-verification — V2-VERIFY-01 (already deferred to v2)
- Public `display_name` column + names-on-votes/proposals UX — Phase 3 (gated on Open Decision #1)
- Newsletter sending infrastructure (drafting UI, send-cadence, segmentation) — Phase 5
- Final political-opinion (Art. 9) consent wording — Phase 3, after coalition's lawyer delivers the Art. 9 legal opinion
- Final Privacy Policy and Terms text — Phase 2 (lawyer-reviewed); Phase 1 ships drafts
- WCAG 2.1 AA conformance, video subtitles — Phase 6 (BRAND-04, BRAND-05)
- Preview deployments per PR — out of scope for Phase 1
- Sector-and-role-based newsletter segmentation — Phase 5
- Synthetic warm-up service evaluation — explicitly rejected (not deferred, just no)
