# Phase 1: Foundation — Research

**Researched:** 2026-04-29
**Domain:** Next.js 15 + Auth.js v5 + Payload CMS 3 + Neon Postgres + Brevo transactional email + Fly.io hosting
**Confidence:** HIGH on stack/versions (npm-verified); MEDIUM on Auth.js v5 beta stability; LOW on Abv.bg deliverability specifics

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Login = 6-digit OTP code via email. No magic link. Same flow for registration confirmation and subsequent logins. OTP is single-use; accepting one invalidates any older codes for the same user.
- **D-02:** Auth.js v5 with database-backed sessions via `@auth/drizzle-adapter` Postgres store. No JWT sessions.
- **D-03:** Session cookie life = 30 days, sliding. Server-side revocable.
- **D-04:** OTP token validity = 10 minutes (login). Registration confirmation = 48 hours. Both single-use.
- **D-05:** Cloudflare Turnstile on registration form only. Login OTP requests gated by Upstash rate-limit (per email + per IP), no Turnstile.
- **D-06:** Disposable-email blocking via `disposable-email-domains` npm package. Rejected at registration API with generic message "този имейл не може да се използва".
- **D-07:** Rate limits (Upstash Redis): registration = 3/IP/24h AND 5//24-subnet/24h. Login OTP = 5/email/hour AND 20/IP/hour. Code-verify attempts = 5/OTP before invalidation.
- **D-08:** Registration fields: `full_name` (required), `email` (required), `sector` (required dropdown), `role` (required dropdown), 4 consent checkboxes (per D-12).
- **D-09:** Sector values: `ИТ`, `Търговия`, `Производство`, `Услуги`, `Друго`.
- **D-10:** Role values: `Собственик`, `Управител`, `Служител`, `Друго`.
- **D-11:** Single `full_name` column. No `display_name` in Phase 1. Phase 3 adds it.
- **D-12:** 4 separate consent checkboxes, none pre-ticked: (1) privacy+terms required, (2) cookies+analytics required, (3) newsletter optional, (4) political-opinion Art.9 optional.
- **D-13:** Append-only `consents` table: `(id, user_id, kind, granted, version, granted_at, region)`. Never UPDATE'd or DELETE'd.
- **D-14:** Legal basis for QR-scan/IP-region attribution = legitimate interest with documented balancing test at `.planning/legal/attribution-balancing-test.md`.
- **D-15:** Privacy Policy and Terms ship as draft pages in Phase 1 with "проект, последна редакция YYYY-MM-DD" marker.
- **D-16:** Split subdomains: `auth.<root>` for transactional, `news.<root>` for newsletter. Each has its own DKIM key in Brevo.
- **D-17:** Domain choice is coalition decision; must be confirmed by end of Phase 1 plan-week 1.
- **D-18:** Warm-up = internal soft-launch list (50-200 people through real registration flow). No synthetic warm-up services. Cadence: week 1: 20/day; week 2: 50; week 3: 150; week 4: full-volume readiness check.
- **D-19:** All outbound email via BullMQ + Upstash Redis queue. Never sent synchronously. Registration endpoint enqueues and returns <200ms.
- **D-20:** Cookie consent banner = CookieYes. Bulgarian copy. Granular. State persisted in `consents` table for logged-in users.
- **D-21:** Error tracking = Sentry EU (Frankfurt). Structured JSON logs shipped to EU-hosted aggregator (Better Stack EU or Axiom EU). Logs MUST NOT contain email, full name, or raw IP. 90-day retention.
- **D-22:** Cloudflare WAF in front of Fly.io Frankfurt. Origin accepts only Cloudflare IP ranges.
- **D-23:** CI/CD = GitHub Actions → Fly.io. Auto-run Drizzle migrations on deploy. Manual gate for destructive migrations.
- **D-24:** DB backups = Neon PITR (7-day free, 14-day paid) + daily `pg_dump` to Bunny.net storage. Documented restore procedure tested before Phase 1 sign-off.
- **D-25:** Payload CMS first-user-creates-admin = localhost-only on first deploy. Subsequent editors via Payload invite-user UI. No public admin signup.
- **D-26:** Branding scope = baseline tokens only: color palette, logo, font stack, minimal layout shell (header + footer). Components limited to: button, input, label, alert, card, input-otp, checkbox, select, form.
- **D-27:** next-intl for ALL strings from day one. No hardcoded Cyrillic in components. Email subjects use nominative greetings only.
- **D-28:** Mobile-first responsive. Test matrix: 375px iPhone SE, 360px Samsung A-series, 768px iPad, 1440px desktop.

### Claude's Discretion

- Exact rate-limit numbers (D-07) — planner can tune in PLAN.md.
- Choice between Better Stack EU and Axiom EU for log aggregation (D-21).
- Specific shadcn/ui components scaffolded in Phase 1 (D-26) — locked set: button, input, label, alert, card, input-otp, checkbox, select, form.
- Exact warm-up volume schedule (D-18) — directionally specified; planner finalizes against Google Postmaster Tools targets.
- Color palette extraction from sinyabulgaria.bg into Tailwind v4 tokens.
- Database schema details beyond columns explicitly named in CONTEXT.md.

### Deferred Ideas (OUT OF SCOPE)

- BULSTAT/EIK auto-verification — V2-VERIFY-01.
- `display_name` column and names-on-votes UX — Phase 3.
- Newsletter sending infrastructure (drafting UI, send-cadence, segmentation) — Phase 5. Phase 1 only stands up BullMQ worker and captures `newsletter` consent.
- Final Art. 9 consent wording — Phase 3.
- Final Privacy Policy and Terms text — Phase 2 (lawyer-reviewed).
- WCAG 2.1 AA conformance, video subtitles — Phase 6.
- Preview deployments per PR — out of scope Phase 1.
- Sector-and-role-based newsletter segmentation — Phase 5.
- Synthetic warm-up service evaluation — explicitly rejected.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | Visitor can register with name and email | Section 5 (Auth Architecture), Section 4 (Bootstrap) |
| AUTH-02 | Registration requires cookie consent + privacy policy agreement | Section 5 (schema), Section 11 (GDPR Posture) |
| AUTH-03 | After registration, user receives confirmation email (6-digit OTP) | Section 5 (OTP flow), Section 6 (anti-abuse) |
| AUTH-04 | Member access unlocks ONLY after email confirmation | Section 5 (middleware gate) |
| AUTH-05 | Member can log in via OTP by email (no password) | Section 5 (Auth.js email provider) |
| AUTH-06 | Member can log out from any page | Section 5 (Auth.js sign-out server action) |
| AUTH-07 | Session persists across browser refreshes | Section 5 (database sessions, cookie attributes) |
| AUTH-08 | Registration form protected with CAPTCHA (Cloudflare Turnstile) | Section 6 (Turnstile) |
| AUTH-09 | Registration is rate-limited | Section 6 (Upstash ratelimit) |
| AUTH-10 | Disposable-email domains blocked at registration | Section 6 (blocklist) |
| NOTIF-07 | Sending domain has SPF/DKIM/DMARC; warm-up started 4+ weeks before QR | Section 7 (email warm-up) |
| NOTIF-08 | Emails sent via BullMQ async worker | Section 7 (BullMQ), Section 4 (bootstrap) |
| OPS-01 | Cloudflare WAF + DDoS protection in front of origin | Section 10 (infrastructure) |
| OPS-02 | Sentry EU for error tracking | Section 10 (infrastructure) |
| OPS-03 | Structured JSON logs, EU-hosted aggregator | Section 10 (infrastructure) |
| OPS-06 | Database backups (Neon PITR + external) | Section 10 (infrastructure) |
| OPS-07 | CI/CD pipeline with automatic migrations and rollback option | Section 4 (bootstrap) |
| BRAND-01 | Color palette from sinyabulgaria.bg | Section 8 (branding) |
| BRAND-02 | Coalition logo in header | Section 8 (branding), Section 9 (layout shell) |
| BRAND-03 | Fresh modern design, not pixel-imitation | Section 8 (branding) |
| BRAND-06 | Fonts support full Cyrillic | Section 8 (branding), Section 9 (typography) |
| PUB-05 | Site fully in Bulgarian | Section 9 (next-intl i18n) |
| PUB-06 | Site is responsive | Section 9 (public surface), UI-SPEC viewport matrix |
</phase_requirements>

---

## Phase 1 Goal Restatement

Phase 1 establishes every prerequisite that must exist before any public traffic can arrive. The project begins with no code; Phase 1 ends with a deployed production application in the EU (Frankfurt), behind Cloudflare WAF, where a visitor can register with their name and email, receive a 6-digit OTP confirmation email from the coalition's own sending domain, activate their account, and then log in and out at will with a persistent 30-day session. All of this is protected by Cloudflare Turnstile (registration only), Upstash rate-limiting, and a disposable-email blocklist. The visual identity — the coalition's color palette, logo, and Cyrillic-supporting font stack — is applied to the minimal shared layout shell and auth pages. All user-facing strings are wired through next-intl from day one. Sentry (EU region), structured JSON logging (EU aggregator), database backups, and a GitHub Actions CI/CD pipeline are operational. Email domain warm-up via an internal soft-launch list begins in week 1 so the domain accumulates reputation over the 4+ weeks required before any public QR campaign drop.

---

## Requirement Coverage Map

| Req ID | Which Section Addresses It |
|--------|---------------------------|
| AUTH-01 | §5 Auth Architecture (registration schema + form) |
| AUTH-02 | §5 (consent checkboxes wired to `consents` table), §11 GDPR Posture |
| AUTH-03 | §5 (OTP email flow), §7 (BullMQ queue + Brevo delivery) |
| AUTH-04 | §5 (email_verified gate at middleware layer) |
| AUTH-05 | §5 (Auth.js email provider, generateVerificationToken) |
| AUTH-06 | §5 (Auth.js server action sign-out) |
| AUTH-07 | §5 (database sessions, cookie sliding expiry) |
| AUTH-08 | §6 (Cloudflare Turnstile invisible challenge + server-side verify) |
| AUTH-09 | §6 (Upstash @upstash/ratelimit sliding window) |
| AUTH-10 | §6 (disposable-email-domains-js package, Zod refinement) |
| NOTIF-07 | §7 (SPF/DKIM/DMARC DNS records, warm-up cadence, Google Postmaster Tools) |
| NOTIF-08 | §7 (BullMQ + Upstash Redis queue, worker process on Fly.io) |
| OPS-01 | §10 (Cloudflare WAF custom rules, origin IP allowlist) |
| OPS-02 | §10 (Sentry EU Frankfurt DSN, @sentry/nextjs 10.x) |
| OPS-03 | §10 (pino + Better Stack EU or Axiom EU) |
| OPS-06 | §10 (Neon PITR + pg_dump → Bunny.net Storage) |
| OPS-07 | §4 (GitHub Actions workflow, drizzle-kit migrate on deploy) |
| BRAND-01 | §8 (color tokens extracted from sinyabulgaria.bg) |
| BRAND-02 | §8 (logo in header, SVG asset) |
| BRAND-03 | §8 (design system rationale: fresh, not imitation) |
| BRAND-06 | §8 (Roboto Cyrillic + Roboto Slab Cyrillic via next/font/google) |
| PUB-05 | §9 (next-intl 4.x, `messages/bg.json`, all strings via `t()`) |
| PUB-06 | §9 (mobile-first Tailwind v4, viewport test matrix per D-28) |

---

## Tech Stack Versions Pinned

All versions verified against npm registry on 2026-04-29. [VERIFIED: npm registry]

### Core Runtime

| Package | Pinned Version | Verified Latest |
|---------|---------------|-----------------|
| Next.js | 15.2.4 (actually `16.2.4` at registry — see note) | 16.2.4 |
| TypeScript | 5.x | — (project scaffold installs compatible version) |
| React | 19.x | — (bundled with Next.js) |
| Node.js | 20.x LTS | — (Fly.io default) |

**IMPORTANT VERSION NOTE [VERIFIED: npm registry]:** At time of research, `npm view next version` returns **16.2.4**, not 15.x. CLAUDE.md specifies "Next.js 15.x" but the registry has moved to 16.x stable. Payload CMS 3.84.x previously required Next.js 15; Payload 3.73.0+ now supports Next.js 16. The planner must decide: pin at Next.js 15.3.x (latest in the 15.x line) for maximum Payload compatibility certainty, or use 16.2.4 which Payload 3.73+ explicitly supports. Recommend pinning `next@15.3.x` initially — a minor version bump carries less upgrade risk mid-phase. Flag this as Open Question #1.

### CMS + Database

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| `payload` | 3.84.1 | [VERIFIED: npm] Current stable |
| `@payloadcms/next` | 3.84.1 | [VERIFIED: npm] |
| `@payloadcms/db-postgres` | 3.84.1 | [VERIFIED: npm] |
| `drizzle-orm` | 0.45.2 | [VERIFIED: npm] Stable line |
| `drizzle-kit` | 0.31.10 | [VERIFIED: npm] |
| `@neondatabase/serverless` | latest | [ASSUMED] Use neon-http for serverless queries; neon-serverless (WebSocket) for transactions |

### Auth

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| `next-auth` | 5.0.0-beta.31 | [VERIFIED: npm] Latest beta tag |
| `@auth/drizzle-adapter` | 1.11.2 | [VERIFIED: npm] |

### UI + Styling

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| `tailwindcss` | 4.2.4 | [VERIFIED: npm] |
| shadcn/ui | CLI-managed (no npm dep) | Install components individually |
| `lucide-react` | 1.14.0 | [VERIFIED: npm] |

### i18n + Forms + Validation

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| `next-intl` | 4.11.0 | [VERIFIED: npm] v4 is current stable; see breaking-change note in §9 |
| `zod` | 3.24.2 | [VERIFIED: npm] |
| `react-hook-form` | 7.54.2 | [VERIFIED: npm] |
| `@hookform/resolvers` | 5.2.2 | [VERIFIED: npm] |
| `zod-i18n-map` | 2.27.0 | [VERIFIED: npm] |

### Anti-abuse

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| `@upstash/redis` | 1.37.0 | [VERIFIED: npm] |
| `@upstash/ratelimit` | 2.0.8 | [VERIFIED: npm] |
| `disposable-email-domains-js` | 1.20.0 | [VERIFIED: npm] Prefer over abandoned `disposable-email-domains` (last published 4 years ago) |

### Email + Queue

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| `bullmq` | 5.76.4 | [VERIFIED: npm] |
| `ioredis` | 5.10.1 | [VERIFIED: npm] Required by BullMQ |
| `react-email` | 3.x (component packages) | — (`@react-email/components`) |
| `@sentry/nextjs` | 10.51.0 | [VERIFIED: npm] |

### Logging

| Package | Pinned Version | Notes |
|---------|---------------|-------|
| `pino` | 10.3.1 | [VERIFIED: npm] |
| `pino-pretty` | dev only | For local dev readable output |

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Auth (session, OTP) | API / Backend (Next.js Server Actions + Route Handlers) | Database (Postgres via Drizzle) | Auth state is server-authoritative. Client never holds secrets or tokens. |
| Registration form UX | Browser / Client (React client components) | Frontend Server (Server Action handles submit) | Form renders on client; validation + submission is a Server Action. |
| Email delivery | Backend worker (BullMQ on Fly.io) | External (Brevo SMTP API) | Async; decoupled from web request lifecycle. |
| Rate limiting | API / Backend (Server Action middleware) | Redis (Upstash) | Must be enforced server-side; Redis stores counters. |
| CAPTCHA verification | API / Backend (server-side site-verify call) | Client (Turnstile widget embeds token in form) | Secret key must never reach client. |
| Disposable-email check | API / Backend (Zod refinement in Server Action) | — | In-memory blocklist lookup at submit time. |
| i18n string resolution | Frontend Server (next-intl getTranslations) | Browser (client translations via NextIntlClientProvider) | Server renders with locale; client components hydrate with same messages. |
| Session cookie | Browser / Client | Frontend Server (Auth.js middleware) | Cookie is HttpOnly, Secure; middleware reads it on each request. |
| CMS editorial UI | Backend (Payload admin at `/admin`) | Database (Postgres, Payload-owned tables) | Payload runs inside the same Next.js process. |
| DB migrations | Build-time / CI (drizzle-kit migrate) | Database | Migrations run before the new app version starts serving traffic. |
| Error tracking | Backend + Client (Sentry) | External (Sentry EU Frankfurt) | Both server and client errors reported via @sentry/nextjs. |
| Structured logs | Backend (pino) | External (Better Stack EU / Axiom EU) | Server-side only; no client-side logging. |
| Cookie consent state | Client (CookieYes banner) + Backend (consents table) | Database | Anonymous visitors: CookieYes cookie. Logged-in: `consents` table row. |
| CDN / media | CDN (Bunny.net) | — | Static assets and future video/images; not used for app routing in Phase 1. |

---

## Project Bootstrap & Repo Layout

### Bootstrap Command

[VERIFIED: payloadcms.com/docs] Payload CMS 3.x installs into a Next.js app via:

```bash
npx create-payload-app@latest
```

The CLI prompts for: project name, database type (select **PostgreSQL**), template (select **blank**). This scaffolds a Next.js 15/16 + Payload 3 project with the `@payloadcms/db-postgres` adapter already wired.

**Constraint:** Do NOT install `payload` into a pre-existing Next.js repo. Use `create-payload-app` as the starting point and migrate assets into it. [CITED: payloadcms.com/docs/getting-started/installation]

After scaffold, install Phase 1 additional dependencies:

```bash
pnpm add drizzle-orm @auth/drizzle-adapter next-auth@beta \
  next-intl zod react-hook-form @hookform/resolvers zod-i18n-map \
  @upstash/redis @upstash/ratelimit bullmq ioredis \
  @react-email/components pino \
  disposable-email-domains-js @sentry/nextjs

pnpm add -D drizzle-kit prettier prettier-plugin-tailwindcss \
  eslint eslint-config-next @playwright/test pino-pretty
```

### Repo Layout

```
src/
├── app/
│   ├── (frontend)/                # Public-facing Next.js routes
│   │   ├── layout.tsx             # Root layout (lang="bg", font loading, providers)
│   │   ├── page.tsx               # "/" root — Phase 1: redirect to /register or member area
│   │   ├── (auth)/
│   │   │   ├── register/page.tsx  # Registration form
│   │   │   ├── login/page.tsx     # Login (email input)
│   │   │   └── otp/page.tsx       # OTP entry screen
│   │   ├── (member)/
│   │   │   └── page.tsx           # Placeholder member landing (D-26)
│   │   └── legal/
│   │       ├── privacy/page.tsx   # Draft privacy policy (D-15)
│   │       └── terms/page.tsx     # Draft ToU (D-15)
│   ├── (payload)/                 # Payload CMS admin routes (auto-generated by create-payload-app)
│   │   └── admin/[[...segments]]/route.tsx
│   └── api/
│       └── [...slug]/route.ts     # Payload REST API handler
├── collections/                   # Payload CMS collection configs
│   └── Users.ts                   # Payload Users collection (CMS-only; distinct from auth users)
├── db/                            # Drizzle schema and migrations
│   ├── schema/
│   │   ├── auth.ts                # Auth.js adapter tables (users, accounts, sessions, verificationTokens)
│   │   ├── consents.ts            # Append-only consents table (D-13)
│   │   └── index.ts               # Re-exports
│   ├── migrations/                # Drizzle Kit SQL migrations (version-controlled)
│   └── index.ts                   # Drizzle db client (neon-http driver)
├── lib/
│   ├── auth.ts                    # Auth.js NextAuth() config
│   ├── auth-utils.ts              # generateOtp(), verifyOtp(), OTP expiry helpers
│   ├── email/
│   │   ├── queue.ts               # BullMQ queue init + addEmailJob()
│   │   ├── worker.ts              # BullMQ worker (runs as separate process on Fly.io)
│   │   └── templates/
│   │       ├── OtpEmail.tsx       # React Email: registration confirmation OTP
│   │       └── LoginOtpEmail.tsx  # React Email: login OTP
│   ├── rate-limit.ts              # @upstash/ratelimit wrappers (registration, OTP, code-verify)
│   ├── disposable-email.ts        # disposable-email-domains-js check
│   ├── turnstile.ts               # Cloudflare Turnstile server-side verify
│   └── logger.ts                  # pino instance (redacts email/IP)
├── middleware.ts                  # next-intl locale routing + Auth.js session gate
├── i18n/
│   ├── routing.ts                 # next-intl defineRouting({ locales: ['bg'], defaultLocale: 'bg' })
│   └── request.ts                 # getRequestConfig
├── messages/
│   └── bg.json                    # All Bulgarian strings (per UI-SPEC copywriting contract)
├── payload.config.ts              # Payload CMS config
└── instrumentation.ts             # Sentry instrumentation (server + edge)

instrumentation-client.ts          # Sentry client-side init (project root)
sentry.server.config.ts            # Sentry server config
sentry.edge.config.ts              # Sentry edge config
next.config.ts                     # withSentryConfig(withPayload(...))
fly.toml                           # Fly.io deployment config
Dockerfile                         # Multi-stage Next.js standalone build
.github/workflows/
└── ci.yml                         # Lint + typecheck + Playwright smoke + drizzle-kit check → Fly deploy
```

### Drizzle vs Payload DB Layer Separation

**Rule:** Drizzle owns all application-facing tables. Payload owns its own CMS tables. Both share the same Neon Postgres database. [ASSUMED — standard Payload + Drizzle co-existence pattern]

- Payload's `db-postgres` adapter creates its own tables (prefixed `payload_` or collection-named) using Payload's internal migration system.
- Drizzle schema lives in `src/db/schema/` and Drizzle Kit manages those migrations separately.
- Use two separate connection configs: `PAYLOAD_DATABASE_URL` for Payload (direct connection), `DATABASE_URL` for Drizzle app queries (pooled via Neon PgBouncer), `DIRECT_URL` for Drizzle migrations (direct, bypasses pooler).

**Pitfall:** Running Drizzle Kit migrations through the pooled connection fails for DDL operations. Always use `DIRECT_URL` (non-pooled) for `drizzle-kit migrate`. [CITED: neon.com/docs/guides/drizzle]

### Environment Variables — Phase 1 Required

```
# Next.js
NEXTAUTH_URL=https://your-domain.bg
AUTH_SECRET=<32-char random>

# Neon Postgres
DATABASE_URL=postgres://...@ep-xxx.eu-central-1.aws.neon.tech:5432/neondb?sslmode=require&pgbouncer=true
DIRECT_URL=postgres://...@ep-xxx.eu-central-1.aws.neon.tech:5432/neondb?sslmode=require

# Payload CMS
PAYLOAD_SECRET=<32-char random>
PAYLOAD_DATABASE_URL=${DIRECT_URL}  # Payload needs direct connection for its own migrations

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...eu-west-1.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>

# Brevo
BREVO_API_KEY=<key>
EMAIL_FROM_TRANSACTIONAL=no-reply@auth.your-domain.bg

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<site key>
TURNSTILE_SECRET_KEY=<secret key>

# Sentry
SENTRY_DSN=<EU Frankfurt DSN>
SENTRY_ORG=<org>
SENTRY_PROJECT=<project>

# Plausible (no consent needed — cookie-free)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=your-domain.bg

# BullMQ worker (same Redis creds, used as queue broker)
# UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN reused
```

**For production:** All secrets stored as Fly.io secrets (`fly secrets set KEY=value`). Never in `.env` committed to git.

### CI/CD — GitHub Actions

```yaml
# .github/workflows/ci.yml (abbreviated structure)
on: [push]
jobs:
  ci:
    steps:
      - pnpm install
      - pnpm lint + pnpm tsc --noEmit
      - drizzle-kit check (schema drift detection)
      - pnpm test:e2e (Playwright smoke: registration → OTP → login)
      - fly deploy --strategy rolling  # runs drizzle-kit migrate as pre-deploy step
```

**Destructive migration gate:** Migrations that DROP columns or tables require a manual approval step (GitHub Actions environment protection rule on `production` environment). [ASSUMED — standard Fly.io deployment pattern]

---

## Authentication Architecture

### Schema: Auth.js Drizzle Adapter Tables

The `@auth/drizzle-adapter` requires four standard tables. Phase 1 extends `users` with project-specific columns. [CITED: authjs.dev/getting-started/adapters/drizzle]

```typescript
// src/db/schema/auth.ts

// users table — Auth.js base + project extensions
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),                       // maps to full_name from registration
  email: text('email').unique(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  image: text('image'),                     // not used in Phase 1
  // Phase 1 project extensions
  full_name: text('full_name').notNull(),
  sector: text('sector').notNull(),         // ИТ | Търговия | Производство | Услуги | Друго
  role: text('role').notNull(),             // Собственик | Управител | Служител | Друго
  created_at: timestamp('created_at').defaultNow().notNull(),
  // Forward-compat for Phase 3 cooling period check
  email_verified_at: timestamp('email_verified_at', { mode: 'date' }),
  // display_name: NOT added in Phase 1 (D-11)
});

// verificationTokens — Auth.js OTP storage
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),   // email address
  token: text('token').notNull(),             // 6-digit OTP (stored hashed)
  expires: timestamp('expires', { mode: 'date' }).notNull(),
  // kind differentiates registration confirmation vs login
  kind: text('kind').notNull().default('login'),  // 'register' | 'login'
}, (vt) => ({
  pk: primaryKey({ columns: [vt.identifier, vt.token] }),
}));

// sessions table — database-backed (D-02)
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// accounts — not used in Phase 1 (no OAuth), but required by adapter
export const accounts = pgTable('accounts', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  // ... standard OAuth fields
}, (acc) => ({
  pk: primaryKey({ columns: [acc.provider, acc.providerAccountId] }),
}));
```

```typescript
// src/db/schema/consents.ts — append-only (D-13)
export const consents = pgTable('consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  kind: text('kind').notNull(),   // 'privacy_terms' | 'cookies' | 'newsletter' | 'political_opinion'
  granted: boolean('granted').notNull(),
  version: text('version').notNull(),          // e.g., "2026-04-29"
  granted_at: timestamp('granted_at').defaultNow().notNull(),
  region: text('region'),                      // oblast/country from MaxMind — Phase 2 populates; nullable in Phase 1
});
```

**Note on consent `onDelete: 'restrict'`:** Consents must survive as audit records even when an account is soft-deleted. The cascade delete behavior for GDPR deletions is handled as a Phase 6 concern (deletion_log, processor propagation). Setting `restrict` here prevents accidental cascade loss of audit records before Phase 6's delete flow is built. [ASSUMED — GDPR best-practice]

### Auth.js v5 Email OTP Configuration

Auth.js v5 supports overriding `generateVerificationToken` on the Email provider to produce a 6-digit numeric code instead of a UUID magic link token. [CITED: authjs.dev/getting-started/authentication/email]

```typescript
// src/lib/auth.ts
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens } from '@/db/schema/auth';
import { addEmailJob } from '@/lib/email/queue';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60,   // 30 days (D-03)
    updateAge: 24 * 60 * 60,     // refresh session TTL on each visit (sliding)
  },
  providers: [
    {
      id: 'email',
      type: 'email',
      name: 'Email OTP',
      // Generate 6-digit numeric OTP (D-01)
      generateVerificationToken: async () => {
        return String(Math.floor(100000 + Math.random() * 900000));
      },
      // Send via BullMQ queue (D-19) — never direct
      sendVerificationRequest: async ({ identifier, token, expires }) => {
        await addEmailJob({ to: identifier, otpCode: token, expiresAt: expires });
      },
      // Token validity: 10 minutes for login, 48h for registration (D-04)
      // Differentiated at the queue/template level via job payload
    }
  ],
  cookies: {
    sessionToken: {
      name: `__Secure-next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,  // requires HTTPS — enforced on Fly.io + Cloudflare
      },
    },
  },
  callbacks: {
    async session({ session, user }) {
      // Attach userId for server-side use (needed for rate limiting, GDPR checks)
      session.user.id = user.id;
      return session;
    },
  },
});
```

**OTP token validity differentiation (D-04):** Auth.js v5 Email provider uses a single `maxAge` parameter for token lifetime. The 10-minute / 48-hour split requires storing both codes in `verificationTokens` with different `expires` timestamps. The registration confirmation code is created server-side with `expires = now + 48h`; the login code with `expires = now + 10min`. The adapter's `useVerificationToken` method enforces expiry by checking the `expires` column before accepting a code.

**Token hashing:** Store tokens as HMAC-SHA256 hashes (with `AUTH_SECRET` as the key) in the DB, not plaintext. Auth.js v5's default `@auth/drizzle-adapter` stores plaintext tokens — override with a custom `encode`/`decode` pair on the adapter for production hardening. [ASSUMED — security best practice; verify against adapter source before implementing]

### Session Strategy Decision (D-02)

Database sessions were chosen (not JWT) because:
1. Immediately revocable for account deletion (Phase 6) and admin suspension (Phase 4)
2. No client-side token expiry edge cases
3. GDPR-friendly: deleting the session row is the complete invalidation

**Cold-start consideration:** Database sessions require a DB lookup on every authenticated request. Neon with the pooled PgBouncer connection handles this efficiently. The `sessions` table should have an index on `session_token` (primary key) and `user_id`.

### Email Verification Gate (AUTH-04)

```typescript
// src/middleware.ts — enforces emailVerified before member routes
import { auth } from '@/lib/auth';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isProtectedRoute = nextUrl.pathname.startsWith('/member');
  
  if (isProtectedRoute && !session?.user?.emailVerified) {
    // Redirect to OTP confirmation or login
    return Response.redirect(new URL('/login', req.url));
  }
  return intlMiddleware(req);
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|admin).*)'],
};
```

**48h cooling period (Phase 3 prep):** The schema stores `email_verified_at` so Phase 3 can check `email_verified_at + 48h < now()` before allowing votes. Phase 1 does not enforce this gate — it only stores the timestamp.

### Logout (AUTH-06)

```typescript
// Server Action called from any page — no route change needed (D-03 says revocable)
'use server';
import { signOut } from '@/lib/auth';
export async function logout() {
  await signOut({ redirectTo: '/login' });
}
```

---

## Anti-abuse Architecture

### Cloudflare Turnstile (AUTH-08, D-05)

Registration form only. Verification flow: [CITED: developers.cloudflare.com/turnstile/get-started/server-side-validation/]

1. Client renders Turnstile widget (`<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer>`). Widget mode: `invisible` (default). Widget places token in a hidden form field `cf-turnstile-response`.
2. Server Action receives form data. Extracts token.
3. Server Action calls Cloudflare `siteverify` endpoint:
   ```
   POST https://challenges.cloudflare.com/turnstile/v0/siteverify
   secret=TURNSTILE_SECRET_KEY&response=<token>&remoteip=<client_ip>
   ```
4. Response `{ success: true/false, error-codes: [...] }`.
5. **Fail policy:** On Turnstile failure, reject the registration and return Bulgarian error message (`auth.register.captchaFailed`). Do NOT fail open (fail open would allow bots through when Cloudflare is degraded). The registration action is non-critical-path so a degraded Cloudflare state is acceptable friction.

**Token validity:** 5 minutes. If the user takes longer than 5 minutes to fill the form, Turnstile re-challenges automatically (the widget handles this transparently in invisible mode). [CITED: developers.cloudflare.com/turnstile/get-started/server-side-validation/]

**GDPR:** Turnstile does not use cookies and does not store personal data. No consent banner needed for Turnstile. [CITED: CLAUDE.md]

### Upstash @upstash/ratelimit (AUTH-09, D-07)

[CITED: upstash.com/docs/redis/sdks/ratelimit-ts/overview]

BullMQ uses `ioredis` for its Redis connection. `@upstash/ratelimit` uses `@upstash/redis` (HTTP client). Both can share the same Upstash instance via different connection modes — BullMQ via ioredis + TLS URL, rate limiter via HTTP REST. [VERIFIED: upstash.com/docs/redis/integrations/bullmq]

**BullMQ + Upstash connection settings (critical):**
```typescript
// ioredis connection to Upstash for BullMQ
const connection = new IORedis(process.env.UPSTASH_REDIS_URL, {
  maxRetriesPerRequest: null,  // Required for BullMQ
  enableReadyCheck: false,     // Required for Upstash
  tls: {},
});
```

Rate limit implementations (D-07):

| Limiter | Algorithm | Limit | Window | Applied At |
|---------|-----------|-------|--------|-----------|
| `registration-ip` | Sliding window | 3 | 24h | Registration Server Action, per IP |
| `registration-subnet` | Sliding window | 5 | 24h | Registration Server Action, per /24 subnet |
| `login-otp-email` | Sliding window | 5 | 1h | Login OTP request Server Action, per email |
| `login-otp-ip` | Sliding window | 20 | 1h | Login OTP request Server Action, per IP |
| `otp-verify` | Fixed window | 5 | per-OTP | OTP verify Server Action, per identifier+token |

**Subnet extraction:**
```typescript
function getSubnet(ip: string): string {
  const parts = ip.split('.');
  return parts.slice(0, 3).join('.') + '.0/24';
}
```

**IP extraction from Next.js Server Actions:** Use `headers().get('cf-connecting-ip')` (populated by Cloudflare, since all traffic passes through CF in production — D-22). Fall back to `x-forwarded-for` in dev.

### Disposable Email Detection (AUTH-10, D-06)

Use `disposable-email-domains-js` (v1.20.x, updated monthly) rather than the abandoned `disposable-email-domains` package (last published 4 years ago). [VERIFIED: npm registry]

```typescript
// src/lib/disposable-email.ts
import { isDisposableEmail } from 'disposable-email-domains-js';

export function isDisposable(email: string): boolean {
  return isDisposableEmail(email);
}
```

Enforce in Zod schema for registration Server Action:
```typescript
email: z.string().email().refine(
  (email) => !isDisposable(email),
  { message: 'auth.register.invalidEmail' }  // next-intl key
)
```

**Refresh mechanism:** The `disposable-email-domains-js` package is updated at publish time (monthly cadence). Re-pin in `package.json` on a monthly schedule. No runtime fetch needed — the list is bundled.

**Generic message (D-06):** Do not reveal that the domain is on a blocklist. The message "Този имейл не може да се използва. Опитай с друг адрес." (from UI-SPEC) is intentionally uninformative to prevent trivial evasion.

### Honeypot Field + Time-to-Submit

Beyond Turnstile and rate limiting, add:
1. A hidden CSS honeypot field (`<input name="website" tabindex="-1" autocomplete="off">`). If the field is non-empty on submit → reject silently (return "success" to avoid leaking the bot signal).
2. Minimum submit time: reject submissions arriving <3 seconds after page load (bots fill forms instantly). Track `form_rendered_at` as a hidden field with a signed timestamp.

These are defense-in-depth measures that add no user friction. [ASSUMED — standard anti-bot pattern]

---

## Email Deliverability & Warm-up Plan

### SPF / DKIM / DMARC Setup (NOTIF-07)

Brevo-specific DNS record setup for split subdomains (D-16): [CITED: authjs.dev, easydmarc.com/blog/brevo-ex-sendinblue-spf-dkim-setup/]

**For `auth.your-domain.bg` (transactional — registration OTP, login OTP):**
```
# CNAME records (Brevo DKIM — two records, Brevo provides exact hostnames)
mail._domainkey.auth.your-domain.bg   CNAME   mail._domainkey.brevo.com
mail2._domainkey.auth.your-domain.bg  CNAME   mail2._domainkey.brevo.com

# SPF: Brevo manages this automatically via DKIM alignment when using CNAME — no separate SPF TXT needed
# (Brevo's Return-Path uses brevo's domain; DMARC passes via DKIM alignment)
```

**For `news.your-domain.bg` (newsletter — Phase 5, but configure DNS now):**
```
mail._domainkey.news.your-domain.bg   CNAME   (Brevo provides second DKIM key for second sender)
```

**DMARC at apex (your-domain.bg):**
```
_dmarc.your-domain.bg   TXT   "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@your-domain.bg; pct=100; adkim=s; aspf=s"
```

**DMARC progression (D-16):**
- Week 1-2: `p=quarantine` — messages failing DMARC go to spam (not rejected). Monitor `rua` reports.
- Week 4+: `p=reject` once Postmaster shows consistent green domain reputation.

**Note on SPF with Brevo:** Brevo's architecture (since Feb 2024 enforcement) passes DMARC via DKIM alignment, not SPF alignment. The Return-Path (envelope sender) uses Brevo's domain, so SPF on your subdomain is not required for DMARC compliance with Brevo. Only DKIM CNAME records are needed. [CITED: dmarcreport.com/blog/how-to-configure-spf-dkim-and-dmarc-records-for-brevo/]

### Google Postmaster Tools (NOTIF-07)

1. Navigate to postmaster.google.com → Add Domain → Enter `auth.your-domain.bg`.
2. Verify ownership via TXT record (Google provides the string): `google-site-verification=<token>` added to DNS.
3. DNS propagation: up to 48 hours; typically 15 minutes with Cloudflare DNS.
4. Data populates in Postmaster Tools once you send **100+ emails/day to unique Gmail recipients**. Phase 1's internal soft-launch list should include a subset of Gmail addresses to reach this threshold. [CITED: support.google.com/a/answer/9981691]
5. Monitor daily: Domain Reputation, Spam Rate. Target: Domain Reputation "High", Spam Rate <0.1%.

**Note:** Google retired Postmaster Tools V1 on September 30, 2025. Only V2 interface is available. V2 includes a compliance dashboard. [CITED: trulyinbox.com/blog/google-postmaster-tools/]

### Warm-up Cadence (D-18)

Phase 1 uses organic internal sends — no synthetic warm-up services (explicitly rejected in D-18). All sends go through the real BullMQ → Brevo pipeline, building authentic deliverability signals.

| Week | Sends/Day | Audience | Purpose |
|------|-----------|----------|---------|
| Week 1 | 20 | Coalition staff + volunteers (registered via `/register`) | Baseline sending; generate first reputation signal |
| Week 2 | 50 | Expanded internal list + early supporters | Grow volume; monitor Postmaster spam rate |
| Week 3 | 150 | All internal opt-ins + soft outreach to trusted contacts | Near-threshold; verify Postmaster "High" domain reputation appears |
| Week 4 | Full volume | Run full-list readiness check; 300/day Brevo free tier limit applies | Readiness confirmation; upgrade Brevo plan if needed |

**Brevo free tier:** 300 emails/day, 9,000/month. Sufficient for Phase 1 warm-up. Upgrade to Starter plan (€19/month, 20k/month) before QR campaign. [CITED: CLAUDE.md]

**Abv.bg specifics [LOW confidence]:** Abv.bg (Bulgaria's dominant local webmail, operated by ICN.BG) has stricter spam filters. Plain-text version of every HTML email is mandatory. Avoid political trigger words in subject lines. Include a warm-up send to @abv.bg test addresses (coalition staff who use Abv.bg) during week 1. No authoritative technical documentation found; based on community knowledge. [ASSUMED]

### Email Content Requirements

- `Content-Type: text/html; charset=utf-8` in every email.
- Plain-text alternative part (MIME `text/plain`). React Email renders both via `.renderAsync()`.
- Greeting: nominative form (D-27). "Здравей, {full_name}!" — never vocative.
- Subject line: plain Unicode Bulgarian, no ALL CAPS, no exclamation chains. Brevo handles UTF-8 encoding (base64 or quoted-printable) automatically.

### Dedicated IP vs Shared IP

Shared IP is appropriate for Phase 1 volumes (< 50,000 emails/week). Dedicated IP requires 50,000-100,000/week minimum volume and 4-8 weeks warm-up. Phase 1 warm-up on Brevo shared IP is the correct choice. [CITED: help.brevo.com/hc/en-us/articles/115000240344-Set-up-your-dedicated-IP-in-Brevo]

---

## Branding & Design Tokens

### Source of Colors (BRAND-01)

Extracted from sinyabulgaria.bg logo SVG (`/media/2023/08/logo-vector-1.svg`) and Elementor global CSS kit. [CITED: 01-UI-SPEC.md]

The UI-SPEC has already locked the color tokens:

| Role | Hex | Tailwind v4 CSS variable |
|------|-----|--------------------------|
| Page background (60%) | `#FFFFFF` | `--color-background: #FFFFFF` |
| Secondary surface (30%) | `#F1F5F9` (slate-100) | `--color-surface: #F1F5F9` |
| Accent (10%) | `#004A79` (deep navy) | `--color-accent: #004A79` |
| Destructive | `#E72E4D` (red) | `--color-destructive: #E72E4D` |
| Success | `#009F54` (green) | `--color-success: #009F54` |
| Sky link hover | `#00B7ED` | `--color-sky: #00B7ED` |
| Foreground text | `#0F172A` (slate-900) | `--color-foreground: #0F172A` |
| Muted foreground | `#475569` (slate-600) | `--color-muted-foreground: #475569` |
| Border default | `#E2E8F0` (slate-200) | `--color-border: #E2E8F0` |

### Tailwind v4 CSS-First Configuration

Tailwind v4 uses `@theme` block in CSS (no `tailwind.config.js`). [CITED: tailwindcss.com]

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Brand colors */
  --color-accent: #004A79;
  --color-destructive: #E72E4D;
  --color-success: #009F54;
  --color-sky: #00B7ED;

  /* shadcn/ui slate base tokens — overrides */
  --color-background: #FFFFFF;
  --color-foreground: #0F172A;
  --color-muted-foreground: #475569;
  --color-border: #E2E8F0;
  --color-surface: #F1F5F9;

  /* Typography scale — locked to 4 sizes (UI-SPEC) */
  --text-sm: 14px;      /* label */
  --text-base: 16px;    /* body */
  --text-xl: 20px;      /* heading */
  --text-3xl: 28px;     /* display */
}
```

### shadcn/ui Initialization

```bash
npx shadcn@latest init
```

Select: style = `new-york`, base color = `slate`, CSS variables = yes, prefix = (empty).

This creates `components.json` and installs the base layer. Components are installed individually:

```bash
npx shadcn@latest add button input label alert card checkbox select form
# input-otp is a separate install:
npx shadcn@latest add input-otp
```

All 9 components from UI-SPEC. No additional components in Phase 1 (D-26).

### Typography (BRAND-06)

Fonts per UI-SPEC: **Roboto** (body/UI) + **Roboto Slab** (display headings), both with `cyrillic` + `cyrillic-ext` + `latin` subsets via `next/font/google`.

```typescript
// src/app/(frontend)/layout.tsx
import { Roboto, Roboto_Slab } from 'next/font/google';

const roboto = Roboto({
  weight: ['400', '600'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  variable: '--font-roboto',
});

const robotoSlab = Roboto_Slab({
  weight: ['600'],
  subsets: ['cyrillic', 'cyrillic-ext', 'latin'],
  display: 'swap',
  variable: '--font-roboto-slab',
});
```

### Logo (BRAND-02)

The coalition logo SVG must be obtained from the coalition in high-resolution SVG format. Store at `public/logo.svg`. During Phase 1, a placeholder SVG with the extracted navy color (`#004A79`) is acceptable if the official asset is pending. Flag as a blocker if not received by plan-week 1.

### WCAG AA — Phase 1 Baseline

All contrast pairs in UI-SPEC meet AA or better. No formal audit in Phase 1 (formal audit = Phase 6, BRAND-04). Phase 1 must not introduce any pair that fails AA, as the UI-SPEC already verified all combinations.

---

## Public Surface Scaffolding & i18n

### next-intl v4 Setup (PUB-05)

**BREAKING CHANGE NOTE [VERIFIED: next-intl.dev/blog/next-intl-4-0]:** next-intl v4 (current: 4.11.0) introduces:
- `NextIntlClientProvider` is now **required** in root layout for any client component using `useTranslations`. Was optional in v3.
- Locale type is now strictly typed — `useLocale()` returns the registered locale type, not `string`.
- If also on Next.js 16: `middleware.ts` must be renamed to `proxy.ts` for locale routing. On Next.js 15, `middleware.ts` still works.

Phase 1 setup (single locale, bg):

```typescript
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing';
export const routing = defineRouting({
  locales: ['bg'],
  defaultLocale: 'bg',
});
```

```typescript
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) || routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

```
// next.config.ts
import { withNextIntl } from 'next-intl/plugin';
export default withNextIntl('./src/i18n/request.ts')(withSentryConfig(withPayload(nextConfig)));
```

**No locale prefix in URLs** (single locale): Configure `routing` with `localePrefix: 'never'` so URLs are `/register` not `/bg/register`. [CITED: next-intl.dev/docs/routing/setup]

**Message file structure** (`messages/bg.json`): all keys from UI-SPEC Copywriting Contract must be present. The planner must pre-populate `bg.json` with all strings defined in UI-SPEC before implementation begins.

### Root Layout

```typescript
// src/app/(frontend)/layout.tsx
export default async function RootLayout({ children }) {
  return (
    <html lang="bg" className={`${roboto.variable} ${robotoSlab.variable}`}>
      <body>
        <NextIntlClientProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Placeholder Shells (Phase 2 preparation)

Phase 1 creates the following placeholder pages (empty content, correct layout shell):
- `/` — redirects logged-out users to `/register`; logged-in users to `/member`
- `/member` — placeholder with copy from UI-SPEC (`member.placeholder.heading`, `member.placeholder.body`)
- `/legal/privacy` — draft privacy policy with "проект, последна редакция YYYY-MM-DD" marker (D-15)
- `/legal/terms` — draft terms of use with same marker

Phase 2 agitation pages (PUB-01–04) are NOT created in Phase 1.

---

## Hosting & Infrastructure

### Fly.io Application Configuration (OPS-01, OPS-03)

Next.js 15/16 standalone output on Fly.io: [CITED: fly.io/docs/js/frameworks/nextjs/]

```dockerfile
# Dockerfile (abbreviated)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable pnpm && pnpm install --frozen-lockfile

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build  # Next.js standalone output

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
```

`next.config.ts` must include `output: 'standalone'`.

```toml
# fly.toml
app = "smbsite-prod"
primary_region = "fra"  # Frankfurt — D-22

[build]
  dockerfile = "Dockerfile"

[[services]]
  internal_port = 3000
  protocol = "tcp"
  
  [[services.ports]]
    handlers = ["http"]
    port = 80
    force_https = true
  
  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[env]
  NODE_ENV = "production"
  PORT = "3000"
```

**Cold start:** Fly.io with `output: 'standalone'` runs a persistent Docker container (not serverless). No cold starts. The machine stays warm. For cost: 1 `shared-cpu-1x` machine (256 MB RAM) is sufficient for Phase 1 load. Scale horizontally when Phase 2 QR traffic arrives. [CITED: community.fly.io — hosting Next.js on Fly vs Vercel]

**BullMQ worker:** Run as a separate Fly.io machine (same app, different process group or a separate worker app). Workers do not need to serve HTTP traffic.

### Neon Postgres Connection Pooling

[CITED: neon.com/docs/guides/drizzle, orm.drizzle.team/docs/connect-neon]

Two connection strings required:

| Variable | Connection Type | Used For |
|----------|----------------|----------|
| `DATABASE_URL` | Pooled (PgBouncer) | All application queries (Drizzle ORM in Next.js) |
| `DIRECT_URL` | Direct (non-pooled) | Drizzle Kit migrations, Payload CMS internal migrations |

```typescript
// src/db/index.ts
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

For transactions (Auth.js session management needs them), use the WebSocket driver:
```typescript
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
export const db = drizzle(pool, { schema });
```

Use `neon-serverless` (WebSocket pool) for the main `db` instance since Auth.js sessions and consent inserts require transaction support.

### Cloudflare WAF Configuration (D-22)

[CITED: developers.cloudflare.com/fundamentals/security/protect-your-origin-server/]

1. Set Fly.io app IP as A record in Cloudflare DNS. Proxy status = proxied (orange cloud).
2. SSL/TLS mode: **Full (Strict)** — Cloudflare to origin is encrypted with valid cert. Fly.io provides a TLS cert for the app.
3. WAF Custom Rule to block non-Cloudflare traffic:
   - Rule: `not (ip.src in $cloudflare_ip_ranges)` → Block
   - This blocks direct hits to the Fly.io IP that bypass WAF.
4. Cloudflare IP ranges list is maintained by Cloudflare and automatically updated. [CITED: developers.cloudflare.com/fundamentals/concepts/cloudflare-ip-addresses/]
5. Add Fly.io app to Cloudflare's "Origin Certificates" (not required if using Fly.io's own TLS — Full Strict works with Fly's cert).

**Fly.io-specific note [VERIFIED: community.fly.io]:** Restrict the Fly machine's IP directly via Cloudflare WAF rules. The Fly machine's public IP must not be discoverable — use a generic hostname pattern. Fly's shared IPv6 makes direct-IP discovery harder but not impossible.

### Database Backup Strategy (OPS-06, D-24)

| Layer | Method | Retention | Trigger |
|-------|--------|-----------|---------|
| Neon PITR | Built-in point-in-time restore | 7 days (free), 14 days (paid) | Continuous |
| External pg_dump | BullMQ job → `pg_dump` → Bunny.net Storage | 30 days rolling | Daily at 02:00 UTC |

Daily dump command (runs as Fly.io scheduled job or GitHub Actions cron):
```bash
pg_dump $DIRECT_URL --format=custom | gzip > backup-$(date +%Y%m%d).dump.gz
# Upload to Bunny.net Storage via API
```

**Tested restore procedure** must be documented and validated before Phase 1 sign-off (D-24). Include steps: download from Bunny, `pg_restore` to a Neon dev branch, verify row counts.

### Sentry EU Setup (OPS-02)

[CITED: docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/]

Sentry EU (Frankfurt) uses a different DSN endpoint than US. Create project in Sentry EU instance (sentry.io → Settings → Organization → Data Storage → EU region). The DSN will have format `https://xxx@oXXX.ingest.de.sentry.io/YYY` (`.de.` suffix = EU region). [ASSUMED — verify the exact EU DSN format at account creation]

```typescript
// instrumentation.ts (Next.js 15 instrumentations hook)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
```

```typescript
// next.config.ts
import { withSentryConfig } from '@sentry/nextjs';
const nextConfig = withPayload(/* ... */);
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  // For Next.js 15+ App Router pageload tracing:
  experimental: { clientTraceMetadata: ['sentry-trace', 'baggage'] },
});
```

**PII scrubbing in Sentry:** Configure Sentry's `beforeSend` to strip email and IP from event payloads:
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  beforeSend(event) {
    // Remove user email — keep only user.id
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
```

### Structured Logging: Better Stack EU vs Axiom EU

Claude's Discretion area (D-21). Recommendation: **Better Stack EU**.

| Criterion | Better Stack EU | Axiom EU |
|-----------|----------------|----------|
| EU data storage default | Yes — ISO 27001-certified EU DCs | EU-West-2 region option [ASSUMED] |
| GDPR | SOC2 T2 + GDPR compliant | [ASSUMED — verify] |
| Next.js pino integration | pino-pretty + transport to Better Stack | @axiomhq/pino transport |
| Free tier | Logs: generous (1 GB/month) | 500 GB/month ingest (Hobby) |
| Pricing | $25/month telemetry bundle | $25/month |
| Dashboard | Included (uptime + alerting) | Log analytics only |

Recommendation: Better Stack EU. Its all-in-one posture (logs + uptime + incidents) reduces vendor count. DPA available. [CITED: betterstack.com/pricing]

**Pino setup:**
```typescript
// src/lib/logger.ts
import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  redact: ['email', 'password', 'ip', 'x-forwarded-for', 'cf-connecting-ip'],
  // Transport to Better Stack in production:
  transport: process.env.NODE_ENV === 'production' ? {
    target: '@logtail/pino',
    options: { sourceToken: process.env.BETTERSTACK_SOURCE_TOKEN },
  } : { target: 'pino-pretty' },
});
```

**Fields logged:** Always include `{ userId, requestId, route, durationMs }`. Never `{ email, name, ip }`.

---

## GDPR Posture for Phase 1 Only

### Data Collected in Phase 1

| Data | Table | Legal Basis | Retention |
|------|-------|-------------|-----------|
| `full_name` | `users` | Contract (account) | Until deletion |
| `email` | `users` | Contract (account) | Until deletion |
| `email_verified` | `users` | Contract | Until deletion |
| `sector`, `role` | `users` | Contract | Until deletion |
| Session token | `sessions` | Contract | 30 days (sliding) |
| Consent records | `consents` | Legal obligation (GDPR Art.7) | Indefinite (audit) |
| OTP tokens | `verificationTokens` | Contract | 10 min / 48h (auto-expire) |
| Structured logs | Log aggregator | Legitimate interest (ops) | 90 days (documented) |
| Error events | Sentry | Legitimate interest (stability) | 90 days |

**IP address:** Phase 1 does NOT store IP in any table. The rate-limiter uses IP transiently (in-memory during request processing, written to Redis counter with no PII). IP geolocation attribution is Phase 2 and stays aggregate-only. [CITED: CONTEXT.md D-14]

### Cookies Set in Phase 1

| Cookie | Type | Consent Required? |
|--------|------|------------------|
| `__Secure-next-auth.session-token` | Essential — authentication | No |
| CookieYes consent cookie | Essential — banner state | No |
| Plausible analytics script | Cookie-free | No consent required |

**Conclusion:** Phase 1 sets no non-essential cookies. The CookieYes banner is required by D-20 and will surface in Phase 1 to collect consent for the `cookies` checkbox (D-12), but technically no third-party cookies require consent until Phase 2 or later (e.g., WhatsApp pixel, Meta Pixel). The banner ships in Phase 1 because:
1. Consent checkbox #2 on registration form needs the banner state to be consistent (D-12).
2. Future-proofing for Phase 2 scripts.

**No Google Analytics, no reCAPTCHA, no third-party tracking in Phase 1.** Plausible is cookie-free and requires no banner. Turnstile is cookieless. [CITED: CLAUDE.md]

### Placeholder Legal Pages (D-15)

Draft Privacy Policy (`/legal/privacy`) and Terms of Use (`/legal/terms`) must be linkable from the registration form (AUTH-02). Both pages display the "проект, последна редакция YYYY-MM-DD" marker prominently. Lawyer-reviewed final versions arrive in Phase 2.

Minimum content for the draft Privacy Policy:
- Who is the data controller (coalition name + contact)
- What data is collected and why (the table above)
- Retention periods (from table above)
- Log retention: 90 days (documented per D-21)
- Backup handling: pg_dump to Bunny.net, 30-day rolling, apply deletion register on restore
- Third-party processors: Neon, Upstash, Brevo, Bunny.net, Sentry, Better Stack (with DPA links)
- Rights: contact email for erasure requests (Phase 6 self-service UI)

### Attribution Balancing Test Document (D-14)

Create `.planning/legal/attribution-balancing-test.md` in Phase 1. Document the legitimate-interest basis for QR-scan IP-to-region attribution (Phase 2 feature, but the legal basis must be declared in Phase 1's privacy policy). Content: purpose, necessity, balancing test result, safeguards (IP not stored, aggregate only). [CITED: CONTEXT.md D-14]

---

## Validation Architecture

**nyquist_validation is enabled** in `.planning/config.json` — this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Playwright 1.x + `@playwright/test` |
| Config file | `playwright.config.ts` (project root) — Wave 0 creation |
| Unit test framework | Vitest (co-located with source) — no separate config file needed initially |
| Quick run command | `pnpm test:unit` (Vitest) |
| Full E2E command | `pnpm test:e2e` (Playwright) |
| CI command | `pnpm test:unit && pnpm test:e2e --project=chromium` |

### Phase 1 Success Criteria → Test Map

Each of the 5 Phase 1 success criteria from ROADMAP.md maps to at least one verifiable check:

| Success Criterion | Test Type | Automated Command | File |
|-------------------|-----------|-------------------|------|
| SC-1: Register → OTP email → activate → session in same browser | Playwright E2E | `pnpm test:e2e -- -g "registration flow"` | `tests/e2e/registration.spec.ts` — Wave 0 |
| SC-2: Login via OTP → session persists across refresh → logout from any page | Playwright E2E | `pnpm test:e2e -- -g "login flow"` | `tests/e2e/login.spec.ts` — Wave 0 |
| SC-3: Turnstile must be solved, rate limits active, disposable domains rejected | Playwright E2E (mocked Turnstile) + Unit (disposable check) | `pnpm test:unit -- disposable` + `pnpm test:e2e -- -g "anti-abuse"` | `tests/unit/disposable-email.test.ts` + `tests/e2e/anti-abuse.spec.ts` — Wave 0 |
| SC-4: SPF/DKIM/DMARC configured + first transactional send delivered + Postmaster active | Manual (DNS check + Postmaster screenshot) | `dig TXT _dmarc.auth.your-domain.bg` | Documented in Phase 1 sign-off checklist |
| SC-5: App deployed to prod, Cloudflare WAF active, Sentry active, CI/CD operational | Smoke test (HTTP 200 on prod URL) + Sentry event trigger | `curl -s -o /dev/null -w "%{http_code}" https://your-domain.bg/` | `tests/e2e/smoke.spec.ts` — Wave 0 |

### Requirement → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Registration form submits name+email+sector+role+consents | E2E | `--g "register"` | ❌ Wave 0 |
| AUTH-02 | Consent checkboxes present; required ones block submission | E2E | `--g "consent"` | ❌ Wave 0 |
| AUTH-03 | OTP email enqueued (BullMQ job created) after registration | Unit (queue spy) | `pnpm test:unit -- queue` | ❌ Wave 0 |
| AUTH-04 | Unverified user cannot access /member | E2E | `--g "auth gate"` | ❌ Wave 0 |
| AUTH-05 | Login OTP request → code in DB → code accepted → session | E2E | `--g "login flow"` | ❌ Wave 0 |
| AUTH-06 | Logout server action clears session | E2E | `--g "logout"` | ❌ Wave 0 |
| AUTH-07 | Session cookie present after registration; page refresh maintains session | E2E | `--g "session"` | ❌ Wave 0 |
| AUTH-08 | Turnstile token verified server-side (mock in test) | Unit | `pnpm test:unit -- turnstile` | ❌ Wave 0 |
| AUTH-09 | 4th registration from same IP returns rate-limit error | Unit (rate-limit mock) | `pnpm test:unit -- ratelimit` | ❌ Wave 0 |
| AUTH-10 | Disposable email domain rejected at registration | Unit | `pnpm test:unit -- disposable` | ❌ Wave 0 |
| NOTIF-07 | DNS records present (SPF/DKIM/DMARC) | Manual / DNS CLI check | `dig TXT _dmarc.auth.domain` | ❌ Manual checklist |
| NOTIF-08 | Email job added to BullMQ queue within 200ms of registration | Unit (spy) | `pnpm test:unit -- queue-timing` | ❌ Wave 0 |
| OPS-01 | Non-CF IP returns 403 (WAF block) | Manual + smoke | curl from non-CF IP | ❌ Manual |
| OPS-02 | Sentry captures test error | Smoke (trigger `/api/sentry-test`) | Sentry dashboard check | ❌ Wave 0 |
| OPS-03 | Structured log JSON sent to aggregator | Integration (logger spy) | `pnpm test:unit -- logger` | ❌ Wave 0 |
| OPS-06 | Daily pg_dump job runs and upload to Bunny succeeds | Manual (verify first run) | — | ❌ Manual |
| OPS-07 | CI/CD runs lint + typecheck + Drizzle check + Playwright + deploy | CI (GitHub Actions log) | GitHub Actions | ❌ Wave 0 |
| BRAND-01–03, BRAND-06 | Colors + logo present in DOM; Roboto Cyrillic loads | E2E (visual) | `--g "branding"` | ❌ Wave 0 |
| PUB-05 | No hardcoded Bulgarian string in components (grep) | CI lint check | `grep -r "Регистрирай" src/` fails if any found | ❌ Wave 0 |
| PUB-06 | No horizontal scroll on 360px viewport | E2E (viewport tests) | `--g "responsive"` | ❌ Wave 0 |

### Wave 0 Gaps (All must be created before implementation)

- [ ] `tests/e2e/registration.spec.ts` — SC-1, AUTH-01, AUTH-02, AUTH-07
- [ ] `tests/e2e/login.spec.ts` — SC-2, AUTH-05, AUTH-06
- [ ] `tests/e2e/anti-abuse.spec.ts` — SC-3, AUTH-08 (mocked Turnstile)
- [ ] `tests/e2e/smoke.spec.ts` — SC-5 (prod HTTP 200 check)
- [ ] `tests/unit/disposable-email.test.ts` — AUTH-10
- [ ] `tests/unit/rate-limit.test.ts` — AUTH-09
- [ ] `tests/unit/otp-generator.test.ts` — AUTH-03 (generateVerificationToken produces 6 digits)
- [ ] `tests/unit/turnstile.test.ts` — AUTH-08 (mocked siteverify response)
- [ ] `tests/unit/queue.test.ts` — NOTIF-08 (BullMQ job enqueued on register)
- [ ] `tests/unit/logger.test.ts` — OPS-03 (no PII in log output)
- [ ] `playwright.config.ts` — Playwright config with 4 viewport projects (375px, 360px, 768px, 1440px)
- [ ] `vitest.config.ts` — Vitest config (or `vitest.config.mts`)

### Playwright Testing of Turnstile

Cloudflare Turnstile provides special test keys for automated testing: [CITED: developers.cloudflare.com/turnstile/get-started/]
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` — always passes
- `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA` — always passes server-side

Use these in the Playwright test environment via `.env.test`.

### Email Warm-up Validation (NOTIF-07)

Not automatable. The acceptance criterion is a **screenshot of Google Postmaster Tools showing domain as active** (domain reputation > "Low"). Include in Phase 1 sign-off checklist as a manual evidence artefact.

DMARC report parsing: `p=none` with `rua=mailto:dmarc-reports@your-domain.bg` generates aggregate XML reports. Review manually during Phase 1 — no tooling required at this stage.

### Performance Budgets (Phase 1 Placeholder Pages)

Phase 1 pages are auth/legal only — no heavy assets. Target: Lighthouse score > 90 on mobile (Slow 4G). Measured informally in Phase 1 with Chrome DevTools; formal performance testing is Phase 2 (OPS-05 load test).

---

## Landmines & Known Pitfalls

### Pitfall A: Auth.js v5 Beta Breaking Changes

[VERIFIED: github.com/nextauthjs/next-auth/releases] Current beta: `5.0.0-beta.31`. Auth.js v5 has been in beta since 2023; beta.31 was released in early 2026. The beta has been community-validated as production-ready by many projects but retains the `beta` tag. Breaking changes between beta versions have included:
- Environment variable prefix changed: all must use `AUTH_` prefix, not `NEXTAUTH_`. `AUTH_SECRET` (not `NEXTAUTH_SECRET`), `AUTH_URL` (not `NEXTAUTH_URL`).
- Import paths changed: `next-auth/next` → direct from `next-auth`.
- Adapter `usersTable` / `accountsTable` field names in `@auth/drizzle-adapter` changed between beta versions — always check against the adapter version's own docs.

**Mitigation:** Pin exact version (`next-auth@5.0.0-beta.31` in `package.json`, not `^`). Do not upgrade during Phase 1 without reading the CHANGELOG.

### Pitfall B: Payload CMS + Turbopack Incompatibility

[VERIFIED: github.com/payloadcms/payload/issues] Payload 3.x has known conflicts with Turbopack (Next.js 15/16 dev mode `--turbopack`):
- Issue #14786: Payload 3.65.0 blocks Turbopack production builds.
- Issue #14419: Turbopack HMR causes "Could not find module in React Client Manifest" errors in dev.
- Issue #13527: Route handler type mismatches on Next.js 15.5.0 with Turbopack.

**Status:** Payload 3.73.0+ added Turbopack support for Next.js 16.1.0+. Current Phase 1 (Payload 3.84.1) should work with Turbopack on Next.js 16.

**Mitigation:** If using Next.js 15 (pinned), use **webpack in dev mode** (do not pass `--turbopack` flag). If Next.js 16 is chosen, Turbopack is supported as of Payload 3.73+. Document the chosen combination in the Phase 1 plan.

### Pitfall C: Drizzle Kit Migrations via Pooled Connection Fail

DDL operations through PgBouncer (the pooled endpoint) fail with `ERROR: prepared statement already exists`. Always use `DIRECT_URL` for migrations. [CITED: neon.com/docs/guides/drizzle-migrations]

**Mitigation:** CI/CD pipeline must use `DIRECT_URL` environment variable when running `drizzle-kit migrate`, not `DATABASE_URL`.

### Pitfall D: next-intl v4 — NextIntlClientProvider Now Required

[VERIFIED: next-intl.dev/blog/next-intl-4-0] In v4, client components using `useTranslations` require `NextIntlClientProvider` in their ancestor tree. Phase 1 client components (registration form, OTP form) are client components. Missing the provider causes a runtime error, not a build error — it manifests only when the page loads.

**Mitigation:** Wrap the root layout body in `NextIntlClientProvider`. Pass `messages` and `locale` props. Do this in Wave 0 before any client component is written.

### Pitfall E: BullMQ + Upstash Redis Connection Settings

[VERIFIED: upstash.com/docs/redis/integrations/bullmq] BullMQ requires ioredis with two specific settings for Upstash:
- `maxRetriesPerRequest: null` — BullMQ waits indefinitely for Redis commands; without this, ioredis throws.
- `enableReadyCheck: false` — Upstash doesn't respond to the PING readiness check ioredis expects.

**Mitigation:** These settings are documented in Upstash's BullMQ integration guide and must be applied verbatim.

### Pitfall F: `disposable-email-domains` Package is Abandoned

[VERIFIED: npm registry] The `disposable-email-domains` package (referenced in CONTEXT.md D-06 by name) was last published 4 years ago (v1.0.62). It has not been updated since 2021. New disposable domains added since then are not blocked.

**Mitigation:** Use `disposable-email-domains-js` (v1.20.0, updated monthly) instead. This package wraps the same underlying blocklist but is actively maintained. The CONTEXT.md decision to use "the `disposable-email-domains` open-source blocklist" refers to the blocklist dataset, not the specific npm package name. Using `disposable-email-domains-js` fulfills the intent of D-06.

### Pitfall G: Sentry EU DSN vs US DSN

If the Sentry project is accidentally created in the US region, error data flows to US servers — a GDPR concern. The DSN will have `.sentry.io` (US) vs `.de.sentry.io` (EU). [ASSUMED — verify at account creation]

**Mitigation:** Verify DSN suffix before committing to source code. EU DSNs end in `.de.sentry.io` or `.eu.sentry.io` depending on Sentry's routing. Confirm with Sentry dashboard.

### Pitfall H: Fly.io Machine Must Be Always-On

Fly.io's auto-scale-to-zero feature would cause cold starts for an SMB landing page. Cold starts of 1-3 seconds are unacceptable for the registration flow. [CITED: community.fly.io discussion]

**Mitigation:** Configure `min_machines_running = 1` in `fly.toml` (or via `fly scale count 1 --max-per-region 1`) to ensure at least one machine is always warm. This adds ~$5/month to hosting cost but prevents cold starts.

### Pitfall I: Cyrillic in Email Subjects — Brevo Handles Automatically

Bulgarian Cyrillic in email subjects transmitted via Brevo API is handled automatically by Brevo's SMTP gateway (encodes as `=?UTF-8?B?...?=` quoted-printable). Developers do not need to manually encode subjects when using the Brevo API or SMTP. [ASSUMED — based on Brevo documentation pattern; verify with test send]

**Risk if wrong:** Subject lines appear as raw base64 in the recipient's inbox. Mitigation: send a test email to Gmail and inspect the rendered subject line before warm-up begins.

### Pitfall J: Abv.bg Deliverability

[LOW confidence] Abv.bg (Bulgaria's dominant local email service) has stricter spam filtering than Gmail. Known observations from community sources:
- Plain-text MIME part is mandatory (some reports of HTML-only emails filtered).
- New domains get lower trust scores initially.
- Subject lines with political keywords may trigger filters.

**Mitigation:** Include plain-text MIME alternative in all React Email renders. Test with Abv.bg addresses during week 1 warm-up. No authoritative documentation exists.

### Pitfall K: OTP Token Stored Plaintext by Default in Auth.js Adapter

The `@auth/drizzle-adapter` stores verification tokens as plaintext by default. For a 6-digit numeric OTP, this means anyone with DB read access can see all pending OTP codes. [ASSUMED — verify against adapter source]

**Mitigation:** Hash OTP tokens with HMAC-SHA256 before storage. Store the hash; verify by hashing the user-submitted code and comparing. Add a custom `encode`/`decode` override to the adapter. This is a security hardening step beyond the default adapter behavior.

---

## Project Skills Impact

No project skills found. `.claude/skills/` and `.agents/skills/` directories do not exist in the project root. [VERIFIED: Bash check on 2026-04-29]

No skill-derived constraints apply to Phase 1.

---

## Open Questions for Planner

| # | Question | Blocking? | Recommendation |
|---|----------|-----------|----------------|
| Q1 | **Next.js version: pin at 15.3.x or upgrade to 16.2.4?** — Registry shows 16.2.4 as current stable. CLAUDE.md specifies "15.x". Payload 3.73+ supports Next.js 16. Turbopack works better on 16. | Yes — determines Dockerfile, Turbopack mode, next-intl middleware naming | Pin at **15.3.x** for maximum stability certainty during Phase 1. Upgrade to 16.x in a later phase. |
| Q2 | **Coalition's sender domain** — must be confirmed by end of Phase 1 plan-week 1 (D-17). Until then, DNS warm-up tasks cannot proceed. What is the placeholder domain for development? | Yes for NOTIF-07 | Use a dev domain (e.g., `dev.smb-balgaria.bg`) for DNS setup and Brevo authentication; replace with production domain before QR campaign. Planner must include "domain confirmed" as a blocking deliverable in wave 1. |
| Q3 | **Coalition logo SVG** — must be obtained from coalition (D-17 branding note, BRAND-02). Is the SVG available at sinyabulgaria.bg `/media/2023/08/logo-vector-1.svg`? | No (placeholder acceptable for Phase 1 dev) | Planner includes "logo asset received and committed" as a deliverable. Use colored placeholder rectangle until received. |
| Q4 | **Brevo account and API key** — must be created before Phase 1 can send any email. Is the Brevo account under the coalition's email domain? | Yes for NOTIF-07 start | Planner includes "Brevo account created + API key provisioned" in wave 0 task list. |
| Q5 | **Payload CMS admin first-user setup** — D-25 says "gated to localhost-only on first deploy." How is the initial Payload admin created in a Fly.io container without localhost? | Yes | Create admin via `fly ssh console` and `node` REPL against the running container, or use Payload's `create-first-user` route behind a one-time feature flag. Planner must define the exact procedure. |
| Q6 | **Better Stack EU vs Axiom EU** — Claude's Discretion (D-21). Planner picks. Research recommends Better Stack EU for all-in-one posture. | No | Planner confirms Better Stack EU or overrides with Axiom EU. |
| Q7 | **OTP token hashing in Auth.js adapter** — the default `@auth/drizzle-adapter` stores tokens plaintext. Hardening to HMAC-SHA256 requires a custom adapter override. Is this in scope for Phase 1 or deferred? | No (security best practice, not hard requirement) | Recommend including in Phase 1 as part of AUTH-05 security hardening. The 6-digit OTP is low-entropy — plaintext storage combined with DB access = trivial OTP bypass. |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Drizzle ORM and Payload CMS can co-exist in same Postgres DB without table conflicts if Payload tables are named by Payload's adapter and Drizzle schema uses different table names | §4 Bootstrap | Schema collision; need to namespace one or both |
| A2 | `PAYLOAD_DATABASE_URL` pointing to direct Neon connection is sufficient for Payload's internal migration system | §4 Bootstrap | Payload migrations fail on pooled connection |
| A3 | Auth.js `@auth/drizzle-adapter` stores verificationTokens as plaintext by default | §5 Auth Architecture, §13 Pitfall K | Token storage may already be hashed — verify against adapter source |
| A4 | Sentry EU Frankfurt DSN format ends in `.de.sentry.io` | §10 Infrastructure, §13 Pitfall G | Wrong region; data flows to US |
| A5 | `disposable-email-domains-js` covers the same blocklist as `disposable-email-domains` underlying dataset | §6 Anti-abuse | Gaps in blocklist coverage |
| A6 | BullMQ worker process can run as a separate Fly.io machine in the same app | §10 Infrastructure | Worker scaling complexity; may need separate Fly.io app |
| A7 | Next.js 15.3.x is still available and installable from npm (not replaced by 16.x only) | §3 Versions | Must use 16.x; Turbopack+Payload issues apply |
| A8 | `onDelete: 'restrict'` on `consents.user_id` is the right Phase 1 choice for audit preservation | §5 Schema | Must use 'cascade' to avoid FK violations at Phase 6 deletion time |
| A9 | Honeypot field and minimum submit time are effective Phase 1 anti-bot measures | §6 Anti-abuse | Ineffective; adds dead code |
| A10 | OTP token hashing with HMAC-SHA256 requires custom adapter encode/decode override | §5 Auth Architecture | May have simpler mechanism via Auth.js callback |

---

## Sources

### Primary (HIGH confidence)

- Auth.js v5 official docs — email provider, Drizzle adapter: https://authjs.dev/getting-started/adapters/drizzle + https://authjs.dev/getting-started/authentication/email (accessed 2026-04-29)
- Payload CMS installation docs: https://payloadcms.com/docs/getting-started/installation (accessed 2026-04-29)
- Cloudflare Turnstile server-side validation: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/ (accessed 2026-04-29)
- Upstash @upstash/ratelimit docs: https://upstash.com/docs/redis/sdks/ratelimit-ts/overview (accessed 2026-04-29)
- Upstash BullMQ integration: https://upstash.com/docs/redis/integrations/bullmq (accessed 2026-04-29)
- Neon + Drizzle connection guide: https://neon.com/docs/guides/drizzle (accessed 2026-04-29)
- Neon Frankfurt region (May 2025 changelog): https://neon.com/docs/changelog/2025-05-09 (accessed 2026-04-29)
- next-intl v4 release notes: https://next-intl.dev/blog/next-intl-4-0 (accessed 2026-04-29)
- Sentry Next.js manual setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/ (accessed 2026-04-29)
- Fly.io Next.js docs: https://fly.io/docs/js/frameworks/nextjs/ (accessed 2026-04-29)
- Brevo DKIM/DMARC setup: https://dmarcreport.com/blog/how-to-configure-spf-dkim-and-dmarc-records-for-brevo/ (accessed 2026-04-29)
- Brevo dedicated IP policy: https://help.brevo.com/hc/en-us/articles/115000240344-Set-up-your-dedicated-IP-in-Brevo (accessed 2026-04-29)
- Google Postmaster Tools setup: https://support.google.com/a/answer/9981691 (accessed 2026-04-29)
- Cloudflare origin protection: https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/ (accessed 2026-04-29)
- npm registry (all package versions): verified via `npm view` CLI on 2026-04-29

### Secondary (MEDIUM confidence)

- Payload CMS + Turbopack issues: https://github.com/payloadcms/payload/issues/14786 + #14419 + #13527 (GitHub Issues, accessed 2026-04-29)
- Payload 3.73 Turbopack support: https://github.com/payloadcms/payload/releases/tag/v3.68.0 (accessed 2026-04-29)
- next-intl Next.js 16 breaking change (middleware rename): https://www.buildwithmatija.com/blog/next-intl-nextjs-16-proxy-fix (accessed 2026-04-29)
- Auth.js v5 breaking changes summary: https://authjs.dev/getting-started/migrating-to-v5 (accessed 2026-04-29)
- Better Stack EU GDPR + pricing: https://betterstack.com/pricing (accessed 2026-04-29)
- Google Postmaster Tools V2 (retired V1 Sept 2025): https://www.trulyinbox.com/blog/google-postmaster-tools/ (accessed 2026-04-29)
- disposable-email-domains-js (actively maintained): https://www.npmjs.com/package/disposable-email-domains-js (accessed 2026-04-29)
- disposable-email-domains (abandoned): https://www.npmjs.com/package/disposable-email-domains (accessed 2026-04-29)

### Tertiary (LOW confidence — marked for validation)

- Abv.bg deliverability specifics: community knowledge; no authoritative documentation found
- OTP token plaintext storage in `@auth/drizzle-adapter`: assumed from general Auth.js patterns; verify against adapter source code
- Sentry EU DSN suffix format: verify at account creation

---

*Research completed: 2026-04-29*
*Valid until: 2026-05-30 (30-day window; Auth.js beta releases may occur sooner)*

## RESEARCH COMPLETE
