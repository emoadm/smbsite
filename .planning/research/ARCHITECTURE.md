# Architecture Research

**Domain:** Civic-tech political advocacy platform (Bulgarian SMB coalition)
**Researched:** 2026-04-29
**Confidence:** HIGH (stack decisions), MEDIUM (scaling thresholds), HIGH (anti-abuse patterns), HIGH (GDPR lifecycle)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE (CDN + WAF + DDoS)               │
│   Public pages cached at edge  │  Authenticated routes pass-through  │
└───────────────────┬─────────────────────────┬───────────────────────┘
                    │                         │
        ┌───────────▼──────────┐   ┌──────────▼──────────┐
        │   PUBLIC SURFACE     │   │  AUTHENTICATED APP   │
        │  (Next.js SSG/ISR)   │   │  (Next.js SSR/RSC)   │
        │  - Landing pages     │   │  - Member dashboard  │
        │  - Idea catalog      │   │  - Voting UI         │
        │  - Public stats      │   │  - Proposal submit   │
        └───────────┬──────────┘   └──────────┬──────────┘
                    │                         │
        ┌───────────▼─────────────────────────▼───────────┐
        │              NEXT.JS API ROUTES                  │
        │   /api/auth/*   /api/votes/*   /api/content/*    │
        │   /api/gdpr/*   /api/attribution/*               │
        └───────────────────────┬─────────────────────────┘
                                │
        ┌───────────────────────▼─────────────────────────┐
        │                SERVICE LAYER                     │
        │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
        │  │ AuthSvc  │ │ VoteSvc  │ │  ContentSvc      │ │
        │  └──────────┘ └──────────┘ └──────────────────┘ │
        │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
        │  │ GDPRSvc  │ │ AttrSvc  │ │  NotifySvc       │ │
        │  └──────────┘ └──────────┘ └──────────────────┘ │
        └───────────────────────┬─────────────────────────┘
                                │
        ┌───────────────────────▼─────────────────────────┐
        │                DATA LAYER                        │
        │  ┌──────────────┐          ┌──────────────────┐ │
        │  │  PostgreSQL  │          │  Redis           │ │
        │  │  (primary)   │          │  (sessions +     │ │
        │  │              │          │   job queues)    │ │
        │  └──────────────┘          └──────────────────┘ │
        └─────────────────────────────────────────────────┘
                                │
        ┌───────────────────────▼─────────────────────────┐
        │              BACKGROUND WORKERS                  │
        │  BullMQ workers running as separate process(es)  │
        │  ┌────────────┐ ┌──────────────┐ ┌───────────┐  │
        │  │ EmailWorker│ │WhatsAppWorker│ │GeoWorker  │  │
        │  └────────────┘ └──────────────┘ └───────────┘  │
        │  ┌────────────┐ ┌──────────────┐                 │
        │  │GDPRWorker  │ │CleanupWorker │                 │
        │  └────────────┘ └──────────────┘                 │
        └─────────────────────────────────────────────────┘
```

---

## Component Decomposition

### Component Responsibilities

| Component | Responsibility | Boundary / Owns |
|-----------|---------------|-----------------|
| **Public Surface** | Agitation pages, public idea catalog, public vote counts. Served from CDN cache. No auth required. | Static/ISR HTML; no user-PII in response |
| **Member App** | Authenticated views: voting, proposal submission, problem reporting, profile, GDPR self-service | Session-gated SSR; `private, no-store` cache headers |
| **Editorial Admin** | Moderate proposals/problems, publish ideas, manage newsletter, view attribution dashboards | Role `editor` / `admin`; separate Next.js route segment `/admin/*` |
| **Identity / Auth** | Registration, email confirmation, login, logout, password reset, session management | `users`, `email_tokens`, `sessions` tables; issues JWT/session cookie |
| **Voting Engine** | One vote per member per idea (approve/reject), idempotent upsert, integrity checks | `votes` table; enforces DB-level unique constraint |
| **Content / Proposal Store** | Ideas (editorial + user), proposals, problem reports — all with moderation lifecycle | `ideas`, `proposals`, `problems`, `moderation_log` tables |
| **Attribution Service** | Captures UTM params, HTTP Referer, QR-scan flag, `source_answer`, IP→region at registration | `attribution_events` table; IP not stored raw — only derived region |
| **Email Service** | Transactional (confirm, reset, unsubscribe) + newsletter broadcasts via queue | Integrates Resend/Postmark; `email_log` table |
| **WhatsApp Integration** | Broadcast messages to WhatsApp Channel/Business API; unsubscribe webhook | Wraps Meta Cloud API; `whatsapp_log` table |
| **GDPR Compliance Services** | Consent recording, one-click unsubscribe, account deletion, data export (right of access) | `consent_records`, `deletion_log`, `data_exports` tables |
| **Background Job System** | Async: email send, WhatsApp send, IP geo enrichment, GDPR exports, cleanup jobs | BullMQ + Redis; independent worker process |
| **Observability** | Structured request logs, error tracking, job failure alerts, rate-limit events | Sentry (errors) + structured JSON logs → log aggregator |

---

## Monolith vs Microservices Decision

**Verdict: Modular Monolith — single Next.js application with explicit module boundaries.**

Rationale:
- Small team (likely 1-3 developers). Operational overhead of microservices (service mesh, inter-service auth, distributed tracing wiring, separate deploy pipelines) consumes engineering capacity that should go into product.
- Next.js App Router naturally separates public (`app/(public)/`) from authenticated (`app/(member)/`) and admin (`app/(admin)/`) surfaces via route groups without a network boundary.
- All modules share one PostgreSQL database — avoiding distributed transactions and eventual-consistency issues during the critical launch phase.
- Background workers are the only true "other process": a BullMQ worker Node process reading from Redis queues. This is the correct extraction because it needs independent scaling during blast events (email sends spike when a newsletter goes out).
- Well-defined service interfaces inside the monolith allow extracting a module to a standalone service later if a clear bottleneck justifies it (the "Strangler Fig" path).

**What is NOT microservices here:** Each service named above is a TypeScript module (`src/modules/auth/`, `src/modules/voting/`, etc.) with its own data access — not a separate HTTP service.

---

## Recommended Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (public)/               # Public surface — CDN-cacheable
│   │   ├── page.tsx            # Landing / agitation
│   │   ├── ideas/              # Public idea catalog
│   │   └── layout.tsx
│   ├── (member)/               # Auth-gated — never cached
│   │   ├── dashboard/
│   │   ├── ideas/[id]/vote/
│   │   ├── proposals/new/
│   │   ├── problems/new/
│   │   └── account/            # GDPR self-service
│   ├── (admin)/                # Editor / admin panel
│   │   ├── content/
│   │   ├── members/
│   │   └── attribution/
│   └── api/
│       ├── auth/               # Registration, confirm, login, logout
│       ├── votes/              # Cast / retract vote
│       ├── content/            # Ideas, proposals, problems CRUD
│       ├── notifications/      # Newsletter trigger, WA blast
│       ├── attribution/        # UTM capture endpoint
│       ├── gdpr/               # Export, delete, unsubscribe
│       └── webhooks/           # WhatsApp status, email bounce
├── modules/
│   ├── auth/                   # AuthService, session, tokens
│   ├── voting/                 # VotingService, integrity
│   ├── content/                # ContentService, moderation
│   ├── attribution/            # AttributionService, IP→region
│   ├── notifications/          # EmailService, WhatsAppService
│   ├── gdpr/                   # GDPRService: delete, export, consent
│   └── jobs/                   # BullMQ queue definitions + workers
├── db/
│   ├── schema/                 # Drizzle ORM schema files
│   ├── migrations/             # Drizzle migration SQL
│   └── client.ts               # Singleton DB connection
├── lib/
│   ├── rate-limit.ts           # Upstash Redis rate limiter wrapper
│   ├── captcha.ts              # Friendly Captcha / hCaptcha verify
│   ├── geo.ts                  # IP→region lookup (MaxMind GeoLite2)
│   └── observability.ts        # Sentry init + structured logger
└── workers/
    └── index.ts                # BullMQ worker entry point (separate process)
```

---

## Data Model Sketch

### Core Tables

```sql
-- Identity
users (
  id              uuid PK,
  name            text NOT NULL,
  email           text UNIQUE NOT NULL,
  email_verified  boolean DEFAULT false,
  password_hash   text,                   -- nullable if magic-link only
  role            text DEFAULT 'member',  -- member | editor | admin
  created_at      timestamptz,
  deleted_at      timestamptz             -- soft delete for GDPR
)

email_tokens (
  id          uuid PK,
  user_id     uuid FK users,
  token_hash  text NOT NULL,
  purpose     text,                       -- confirm | reset | magic_link
  expires_at  timestamptz,
  used_at     timestamptz
)

sessions (
  id          uuid PK,
  user_id     uuid FK users,
  created_at  timestamptz,
  expires_at  timestamptz,
  ip_hash     text,                       -- hashed, not raw
  user_agent  text
)

-- Content
ideas (
  id            uuid PK,
  slug          text UNIQUE,
  title         text NOT NULL,
  body          text,
  source        text,                     -- editorial | user_submitted
  author_id     uuid FK users NULLABLE,   -- null for editorial
  status        text DEFAULT 'draft',     -- draft | published | archived
  level         text,                     -- national | local | both
  created_at    timestamptz,
  published_at  timestamptz
)

votes (
  id         uuid PK,
  user_id    uuid FK users NOT NULL,
  idea_id    uuid FK ideas NOT NULL,
  value      smallint NOT NULL,           -- 1 approve | -1 reject
  created_at timestamptz,
  UNIQUE (user_id, idea_id)              -- DB-enforced one-vote-per-user
)

proposals (
  id          uuid PK,
  user_id     uuid FK users NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  status      text DEFAULT 'pending',    -- pending | approved | rejected
  moderator   uuid FK users NULLABLE,
  created_at  timestamptz
)

problems (
  id          uuid PK,
  user_id     uuid FK users NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  level       text NOT NULL,             -- local | national
  status      text DEFAULT 'pending',
  created_at  timestamptz
)

moderation_log (
  id            uuid PK,
  entity_type   text,                    -- idea | proposal | problem
  entity_id     uuid,
  action        text,                    -- approved | rejected | edited
  moderator_id  uuid FK users,
  reason        text,
  created_at    timestamptz
)

-- Attribution
attribution_events (
  id             uuid PK,
  session_id     text,                   -- anonymous pre-registration token
  user_id        uuid FK users NULLABLE, -- joined after registration
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  utm_term       text,
  http_referer   text,
  qr_scan        boolean DEFAULT false,
  source_answer  text,                   -- user's free-text "how did you hear"
  region         text,                   -- derived from IP (e.g. "Sofia", "BG")
  country        text,
  ip_stored      boolean DEFAULT false,  -- raw IP never stored
  created_at     timestamptz
)
-- Note: raw IP resolved to region at capture time and discarded

-- GDPR
consent_records (
  id           uuid PK,
  user_id      uuid FK users NOT NULL,
  consent_type text,                     -- marketing_email | whatsapp | analytics
  granted      boolean,
  ip_hash      text,
  user_agent   text,
  created_at   timestamptz
)

deletion_log (
  id              uuid PK,
  user_id_hash    text NOT NULL,         -- hashed user ID for audit without PII
  requested_at    timestamptz,
  completed_at    timestamptz,
  tables_cleared  text[],               -- audit trail of what was erased
  initiated_by    text                   -- self | admin | scheduled
)

data_exports (
  id           uuid PK,
  user_id      uuid FK users,
  requested_at timestamptz,
  ready_at     timestamptz,
  download_url text,
  expires_at   timestamptz,
  downloaded_at timestamptz
)

-- Notifications
email_log (
  id           uuid PK,
  user_id      uuid FK users NULLABLE,
  email_to     text NOT NULL,
  template     text,
  status       text,                    -- queued | sent | bounced | failed
  provider_id  text,                    -- Resend/Postmark message ID
  created_at   timestamptz,
  sent_at      timestamptz
)

whatsapp_log (
  id           uuid PK,
  user_id      uuid FK users NULLABLE,
  wa_recipient text,
  template     text,
  status       text,
  provider_id  text,
  created_at   timestamptz,
  sent_at      timestamptz
)
```

### Key Constraints

- `votes.UNIQUE(user_id, idea_id)` — enforced at DB level, not just application level. Cannot be circumvented by race conditions.
- `users.deleted_at` — soft delete. Downstream data (votes, proposals) is anonymized (user_id NULLed or replaced with tombstone) by the GDPRWorker. Hard-delete the users row 30 days after soft-delete to allow cancellation window.
- Raw IP addresses are NEVER stored. At capture the IP is resolved to `(region, country)` and discarded. This removes the GDPR "online identifier" classification concern for stored attribution data.

---

## Data Flow: Key Paths

### 1. Registration (QR Scan → Member)

```
User scans QR code on direct-mail letter
    ↓
Browser → Landing page (Cloudflare edge, cached)
    ↓
Browser stores anonymous session_token + captures UTM/referer
    ↓
User fills registration form (name, email, source_answer)
    ↓ POST /api/auth/register
Server:
  1. Friendly Captcha token verified
  2. Rate-limit checked (IP bucket: 5 registrations/10min)
  3. Email disposable-domain check
  4. Geo IP lookup → region (raw IP discarded)
  5. INSERT users (email_verified=false)
  6. INSERT attribution_events (user_id, utm_*, region, qr_scan=true)
  7. INSERT consent_records (marketing_email=true if ticked)
  8. Enqueue: email-confirm job → EmailWorker
    ↓
User receives confirmation email → clicks link
    ↓ GET /api/auth/confirm?token=...
Server:
  1. Verify token (hashed, single-use, 24h expiry)
  2. SET users.email_verified = true
  3. Enqueue: welcome-email job
  4. Set session cookie (httpOnly, Secure, SameSite=Lax)
    ↓
Redirect → /dashboard (member area, SSR, private cache headers)
```

### 2. Voting

```
Member views idea page (SSR, auth check in middleware)
    ↓ POST /api/votes
Server:
  1. Verify session (Redis session lookup)
  2. Rate-limit: 20 votes/min per user_id (not IP)
  3. Check users.email_verified = true
  4. INSERT votes ON CONFLICT (user_id, idea_id) DO UPDATE SET value = $new
     (idempotent upsert — repeated tap changes vote, doesn't double-count)
  5. Invalidate idea's public vote-count cache key in Redis
    ↓
Response: updated vote counts
```

### 3. Problem / Proposal Submission

```
Member submits form → POST /api/content/proposals (or /problems)
    ↓
Server:
  1. Session + email_verified check
  2. Rate-limit: 3 submissions/hour per user
  3. Content length / basic XSS sanitization
  4. INSERT proposals (status='pending')
  5. Enqueue: notify-editor job → EmailWorker (alert to admin email)
    ↓
Editorial admin reviews in /admin/content → approves/rejects
    ↓
INSERT moderation_log (action, moderator_id, reason)
UPDATE proposals SET status='approved'
Enqueue: notify-submitter job (outcome email)
```

### 4. Newsletter Broadcast (Email Blast)

```
Admin triggers blast in /admin → POST /api/notifications/email-blast
    ↓
Server:
  1. Admin role check
  2. Fetch all users WHERE email_verified=true AND NOT unsubscribed
  3. Chunk into batches of 100
  4. For each batch: enqueue email-batch job
    ↓
EmailWorker (BullMQ):
  1. Pull job from queue
  2. For each recipient: call Resend/Postmark API
  3. INSERT email_log (status='sent' or 'failed')
  4. On provider bounce webhook: UPDATE email_log, mark user unsubscribed
```

### 5. GDPR Deletion Request

```
Member clicks "Скрий акаунта ми" → POST /api/gdpr/delete
    ↓
Server:
  1. Session check (re-authenticate with password if sensitive action)
  2. Soft-delete: SET users.deleted_at = NOW()
  3. INSERT deletion_log (user_id_hash, requested_at, initiated_by='self')
  4. Enqueue: gdpr-delete job (delayed 30 days for cancellation window)
  5. Immediately: revoke all sessions, send unsubscribe to email + WA
    ↓
GDPRWorker (after 30 days):
  1. SET votes.user_id = NULL (or tombstone UUID)
  2. SET proposals.user_id = NULL; anonymize content if public
  3. DELETE attribution_events WHERE user_id = ?
  4. DELETE consent_records WHERE user_id = ?
  5. DELETE users WHERE id = ?
  6. UPDATE deletion_log SET completed_at=NOW(), tables_cleared=[...]
```

---

## Background Job Architecture

### Queue Definitions (BullMQ on Redis)

| Queue | Jobs | Concurrency | Retry Policy |
|-------|------|-------------|-------------|
| `email-transactional` | confirm, reset, welcome | 10 | 3x exponential backoff |
| `email-broadcast` | newsletter batch chunks | 5 | 5x with dead-letter |
| `whatsapp-broadcast` | WA channel message chunks | 3 | 3x; honour 24h window |
| `geo-enrichment` | IP→region lookup at registration (sync in practice, async fallback) | 20 | 2x |
| `gdpr-deletion` | Delayed 30-day account wipe | 1 | 1x; alert on failure |
| `gdpr-export` | Generate data export ZIP | 2 | 2x |
| `cleanup` | Purge expired sessions, tokens, old export files | 1 (cron) | 1x |

Workers run as a separate Node.js process (`node workers/index.ts`) deployed alongside the Next.js server. On a single VPS they share the host; on a PaaS (Railway, Render) they are a separate service reading the same Redis instance.

---

## Caching / CDN Strategy

### Public Pages (Heavy Traffic During Direct-Mail Campaign)

```
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

- Cloudflare caches landing pages, public idea catalog, and public vote-count snapshots at the edge.
- Vote counts shown publicly are **approximate** (Redis counter, refreshed every 5 min via ISR revalidation). Exact counts for admin are from DB.
- QR scan landing: the single `/` route is the hot path. No personalization in the HTML — UTM params are query-string-only, captured by client JS and POSTed to `/api/attribution` without affecting the cached HTML.
- Cloudflare WAF rule: challenge (JS challenge) on `/` for IPs generating >50 req/min during blast events. Managed rules ON for OWASP top-10.

### Authenticated Pages (Member App, Admin)

```
Cache-Control: private, no-store
```

- Set in `next.config.js` headers for `/(member)/*` and `/(admin)/*` route groups.
- Cloudflare "Cache Everything" rules explicitly BYPASS for these paths.
- Session cookies are `HttpOnly; Secure; SameSite=Lax; Path=/member` — scoped so they don't appear on public routes.

### Static Assets

```
Cache-Control: public, max-age=31536000, immutable
```

- Next.js content-hashed `/_next/static/*` assets — permanent cache.

### Redis Application Cache

- Vote count aggregates per idea: `votes:count:{idea_id}` — 5 min TTL, invalidated on write.
- User session store: `session:{id}` — TTL = session expiry.
- Rate-limit buckets: `rl:{action}:{identifier}` — sliding window via Upstash Redis or ioredis + Lua.

---

## Anti-Abuse Architecture

### Layered Defense Model

```
Layer 0 — Network: Cloudflare WAF + DDoS protection
Layer 1 — Edge:    Cloudflare rate-limit rules (IP-based, before origin)
Layer 2 — App:     Upstash/Redis sliding-window rate limiter (per IP + per user)
Layer 3 — Human:   Friendly Captcha on registration + voting (privacy-first, PoW)
Layer 4 — Domain:  Email verification (unverified users cannot vote)
Layer 5 — DB:      UNIQUE constraint on votes(user_id, idea_id)
Layer 6 — Monitor: Anomaly alerts on vote velocity, registration spikes
```

### Captcha Placement

| Action | Captcha Required | Rationale |
|--------|-----------------|-----------|
| Registration | YES — Friendly Captcha | Primary abuse vector; PoW variant GDPR-friendlier than reCAPTCHA |
| Login | Conditional (after 3 failed attempts) | Avoid friction for normal logins |
| Voting | NO (rate-limit + email-verified sufficient) | Unverified can't vote; rate-limit prevents scripting |
| Proposal submission | YES on first submission per session | Low-friction but blocks bots |
| Password reset | YES | Prevents enumeration via timing |

Friendly Captcha is preferred over reCAPTCHA for GDPR compliance (no Google third-party cookies, proof-of-work runs locally, no behavioral telemetry sent to Google).

### Rate Limit Thresholds

| Action | Limit | Window | Key |
|--------|-------|--------|-----|
| Registration | 5 | 10 min | IP |
| Registration | 100 | 1 hour | /24 subnet |
| Login attempts | 10 | 15 min | IP + email |
| Vote cast | 30 | 1 min | user_id |
| Proposal submit | 3 | 1 hour | user_id |
| Email confirm resend | 3 | 1 hour | user_id |
| API global | 200 | 1 min | IP |

### Vote Integrity Safeguards

1. **DB UNIQUE constraint** is the authoritative lock — application code cannot accidentally allow double-votes.
2. **Email verified gate** — `middleware.ts` returns 403 on vote endpoints if `user.email_verified = false`. Attacker cannot vote with unconfirmed throwaway email.
3. **Idempotent upsert** — re-casting the same vote value is a no-op; changing value is allowed (a member can change their mind). This prevents double-counting on network retry.
4. **Velocity anomaly detection** — BullMQ scheduled job runs every 5 min: if `COUNT(votes WHERE created_at > NOW()-5min) > threshold`, POST alert to admin Slack/email webhook.
5. **Disposable email blocking** — registration checks email domain against a maintained blocklist (open-source `disposable-email-domains` list). Reduces throwaway account creation.
6. **Delayed public vote display** — public counts update every 5 min from cache. Bursts are visible to admins in real-time but not amplified for coordinated actors watching for reactions.

### Fake Account Detection Signals

Checked at registration and flagged (not hard-blocked) for human review:

- Email domain in disposable list
- Multiple registrations from same IP in < 60 seconds
- Registration time < 3 seconds from page load (bot speed heuristic)
- Captcha solved in < 500ms (Friendly Captcha PoW minimum time)
- Same device fingerprint (JS) + different email within 10 min window

Flagged users: `users.suspicious = true` — they can still register but their votes are held in a "provisional" state, reviewed by admin before counting. This avoids false positives (a small office registering 5 staff) while isolating coordinated bot campaigns.

---

## GDPR Data Lifecycle

```
Registration
    ↓
Consent recorded (consent_records, timestamped, versioned)
    ↓
Data processed under: Art.6(1)(b) — contract; Art.6(1)(a) — consent for marketing
    ↓
Retention period:
  - Active account: data retained while account active
  - Inactive account (no login 2yr): soft-delete prompt email sent
  - Deletion request: 30-day grace period → hard-delete
    ↓
On deletion:
  - Personal data erased: name, email, ip_hash in sessions, attribution events
  - Derived/aggregate data kept: anonymized vote counts, anonymized region stats
  - Audit evidence kept: deletion_log row (contains only hashed user_id, no PII)
    ↓
Right of access:
  - /account/export → triggers gdpr-export job
  - ZIP generated: user data, vote history, submissions, consent records
  - Available for 48h download window, then auto-deleted from storage
    ↓
One-click unsubscribe:
  - Every email contains signed unsubscribe link (/api/gdpr/unsubscribe?token=...)
  - Token is HMAC-signed user_id + timestamp — no login required
  - Sets consent_records (marketing_email = false)
  - WhatsApp: separate opt-out via WA channel reply or profile toggle
```

### Data Minimization Rules

- Raw IP never stored — only derived `region` + `country` (city-level precision dropped).
- Browser fingerprint used only for bot detection at registration, not stored after session ends.
- UTM parameters stored in `attribution_events` but not linked to the user row itself — joined only via `attribution_events.user_id` for analytics; analytics queries use aggregates, not individual rows.
- `email_log.email_to` is the only place email appears outside `users` table — cleared on user deletion.

---

## Observability (Political Accountability Layer)

This platform operates in an adversarial political environment. Logs are not just for debugging — they are evidence.

### What to Log and Why

| Event | What to Log | Retention | Why It Matters |
|-------|-------------|-----------|----------------|
| Vote cast | `user_id_hash`, `idea_id`, `value`, timestamp, IP subnet (/24) | 2 years | Vote manipulation evidence |
| Registration | IP subnet, captcha outcome, disposable-flag, time-from-load | 6 months | Coordinated fake registration evidence |
| Admin actions | admin_id, action, target entity, before/after values | 5 years | Editorial integrity |
| Rate limit hit | IP, action, threshold hit | 30 days | Attack pattern recognition |
| Auth failures | IP, email hash, attempt count | 30 days | Credential stuffing evidence |
| GDPR requests | Request type, timestamp, initiator | 5 years (GDPR obligation) | Regulatory audit trail |
| Moderation decisions | moderator_id, entity, reason | 5 years | Content integrity |

Note: No PII in structured logs. User-identifying log entries use `user_id_hash` (SHA-256 of user UUID, salted with env secret) so they can be correlated by the team but are not directly readable PII.

### Stack

- **Structured logs**: JSON to stdout → collected by hosting platform (Railway/Render) or shipped via Fluent Bit to a log aggregator (Logtail / Grafana Loki on EU-hosted instance).
- **Error tracking**: Sentry (EU region data residency) — captures unhandled exceptions with context; deduplicates; alerts on spike.
- **Alerting rules**:
  - Vote velocity > N/5min → Slack webhook
  - Registration rate > 100/min → Slack webhook + Cloudflare "Under Attack Mode" API call
  - BullMQ dead-letter queue non-empty → Slack webhook
  - GDPR worker failure → Slack webhook (SLA obligation)
- **Audit table**: `moderation_log` + `deletion_log` are immutable append-only tables. No UPDATE/DELETE permissions granted to app DB user on these tables — only INSERT + SELECT. Enforced via PostgreSQL GRANT.

### Incident Review Capability

In case of alleged vote manipulation post-launch:
1. `votes` table has full timestamp history — export timestamped vote activity per idea.
2. `attribution_events` provides registration region and source — can show if a spike came from an unexpected region (e.g., all from same /24 with identical timing).
3. Sentry traces show API call patterns during the window.
4. Cloudflare logs (available on Pro+ plan) capture full request logs including IP, for the CDN layer.
5. `moderation_log` shows what editorial changes were made and by whom.

---

## Suggested Build Order

Dependencies flow from bottom to top. Each phase unblocks the next.

```
Phase 1 — Foundation
  ├── Database schema (users, sessions, ideas — core tables only)
  ├── Auth module (register, confirm, login, session)
  ├── Cloudflare setup (DNS, WAF basic rules)
  └── Observability wiring (Sentry, structured logs)
       ↓ unblocks all authenticated features

Phase 2 — Public Surface
  ├── Landing / agitation pages (SSG)
  ├── Public idea catalog (ISR)
  └── CDN caching rules + DDoS config
       ↓ unblocks public traffic and QR campaign

Phase 3 — Attribution
  ├── attribution_events table
  ├── UTM/referer capture (client-side → /api/attribution)
  ├── IP→region geo lookup (MaxMind GeoLite2, local lookup)
  └── Attribution dashboard in admin
       ↓ must be in place BEFORE direct-mail launch

Phase 4 — Voting Engine
  ├── ideas table fully populated
  ├── votes table + UNIQUE constraint
  ├── Vote API (idempotent upsert + rate limits)
  └── Anti-abuse layers (captcha, rate limit, email-verified gate)
       ↓ can only work after auth + content exist

Phase 5 — Content / Proposals / Problems
  ├── proposals + problems tables
  ├── User submission forms
  ├── Editorial admin moderation panel
  └── moderation_log
       ↓ editorial workflow needed before inviting submissions

Phase 6 — Notifications
  ├── BullMQ + Redis job queues
  ├── Email transactional (confirm, reset already done in Phase 1 as sync)
  │    → move to queue; add newsletter broadcast
  └── WhatsApp integration (Channel or Business API)
       ↓ retention channel; needed after member base exists

Phase 7 — GDPR Compliance Services
  ├── consent_records (started in Phase 1 registration)
  ├── One-click unsubscribe (email + WhatsApp)
  ├── Account deletion flow + GDPRWorker
  └── Data export (right of access)
       ↓ must be complete before scale; regulatory obligation

Phase 8 — Hardening
  ├── Provisional vote queue for suspicious accounts
  ├── Anomaly alerting (vote velocity, registration spikes)
  ├── Load test (simulate 10K concurrent QR scans)
  └── Penetration test on auth + voting endpoints
```

**Critical dependency**: Attribution capture (Phase 3) must be deployed before the direct-mail QR campaign launches, or the first wave of registrations will have no source data.

**Critical dependency**: Anti-abuse layers (Phase 4) must be complete before going public — political platforms attract coordinated attacks from day one.

---

## Architectural Patterns

### Pattern 1: Service Module with Repository

Each module (`modules/auth/`, `modules/voting/`, etc.) exports a service class that is the only entry point for its domain. API routes call services; services call repositories; repositories call the DB. No direct DB access from API route handlers.

**Why:** Makes testing possible (mock the service in route tests), enforces boundaries, makes future extraction clean.

### Pattern 2: Idempotent Writes at DB Level

`ON CONFLICT DO UPDATE` for votes, `ON CONFLICT DO NOTHING` for duplicate attribution events. Application logic cannot create double-entries even under retry.

**Why:** Network retries from mobile clients during spotty connectivity are real. A political vote count must be exact.

### Pattern 3: Queue-First Notification

Email and WhatsApp sends always go through BullMQ queues — never direct synchronous API calls from a web request handler. The API returns 202 Accepted immediately; delivery is asynchronous.

**Why:** Prevents registration latency spikes when the email provider is slow. During a blast, thousands of sends are queued and processed at controlled concurrency.

### Pattern 4: Attribute-First, Join-Later

Attribution events are captured with an anonymous `session_token` (cookie set before registration). On successful registration, a background step joins `attribution_events.user_id = new_user.id` where `session_token` matches. The event and the user identity are separate records until that join.

**Why:** Captures attribution even if the user abandons the form mid-way. Also simplifies GDPR deletion (attribution events are just unlinked rows if user is deleted).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Storing Raw IP Addresses

**What people do:** `INSERT INTO registrations (ip_address, ...)`.
**Why it's wrong:** Under GDPR, IP addresses are personal data (Art. 4(1)), requiring legal basis, explicit mention in privacy policy, and deletion on request. Creates audit/deletion complexity.
**Do this instead:** Resolve IP → (region, country) at capture time using local MaxMind lookup. Discard the raw IP. Store only the derived region. Anonymization is complete.

### Anti-Pattern 2: Application-Level Vote Uniqueness Only

**What people do:** `SELECT COUNT(*) FROM votes WHERE user_id=? AND idea_id=?` before inserting.
**Why it's wrong:** Race condition — two simultaneous requests both see zero, both insert. Results in double votes.
**Do this instead:** `UNIQUE(user_id, idea_id)` DB constraint + `ON CONFLICT DO UPDATE`. The DB is the authoritative lock.

### Anti-Pattern 3: Synchronous Email in Request Handler

**What people do:** `await emailProvider.send(...)` inside the POST /api/auth/register handler.
**Why it's wrong:** If the email provider is slow or fails, the registration response times out. Under launch blast, all registrations block on email API latency.
**Do this instead:** Enqueue job, return 200/201 immediately.

### Anti-Pattern 4: Public Cache for Authenticated Content

**What people do:** No explicit cache headers; CDN caches everything by default.
**Why it's wrong:** A logged-in user's private data gets cached and served to the next visitor.
**Do this instead:** Explicit `Cache-Control: private, no-store` on all authenticated routes. Cloudflare bypass rule for `/member/*` and `/admin/*` paths.

### Anti-Pattern 5: Microservices for a Small Team

**What people do:** Build separate auth service, content service, notification service with REST/gRPC between them.
**Why it's wrong:** Distributed transactions required for registration (auth + attribution + consent must all succeed). Network failures between services. Four deployment pipelines instead of one. One developer can't hold the whole system in their head.
**Do this instead:** Modular monolith with clear module boundaries. Extract only the background worker (legitimate need for independent process).

---

## Scaling Considerations

| Scale | Architecture Approach |
|-------|----------------------|
| 0–5K members | Single VPS (Railway/Render), Cloudflare free/pro. Single Postgres, single Redis. BullMQ worker as second process on same host. All pages cached at edge — origin sees only authenticated traffic. |
| 5K–50K members | Upgrade Postgres to managed instance (Neon, Supabase, Railway managed). Redis to Upstash (serverless, no ops). Worker scales to 2 replicas. Read replica for analytics queries. |
| 50K–200K members | Add connection pooler (PgBouncer/Supabase pooler). Read replica. CDN caching more aggressive (ISR TTL increase). Consider partitioning `votes` table by `idea_id` if counting gets slow. |
| 200K+ members | At this scale the platform is politically significant — invest in dedicated infra. Votes and attribution can move to separate Postgres schema or separate DB. Consider read-through cache for idea vote counts. |

**First bottleneck at scale:** Postgres connection exhaustion during a registration spike. Prevention: PgBouncer or Supabase pooler from Phase 1. Each Next.js serverless invocation takes a connection; without pooling, 100 concurrent users = 100 open connections.

**Second bottleneck:** Email broadcast blocking newsletter delivery. Prevention: Queue with concurrency control (max 5 concurrent email sends), chunk large broadcasts, respect provider rate limits.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|-------------------|-------|
| Cloudflare | DNS proxy, WAF rules, Cache Rules API | Configure Cache Rules to bypass for `/member/*` and `/admin/*`. Enable "Under Attack Mode" toggle via API during DDoS events. |
| Resend / Postmark | REST API via BullMQ EmailWorker | EU data region for GDPR. Store `provider_id` in `email_log` for bounce webhook correlation. |
| Meta WhatsApp Cloud API | REST from WhatsAppWorker; webhooks for delivery status | Requires Business Account approval. Fall back to WhatsApp Channel (broadcast-only) if Business API approval is delayed. |
| MaxMind GeoLite2 | Local MMDB file lookup (no outbound call) | Bundled with app. Free, no PII leaves the server. Update MMDB weekly via cron. |
| Friendly Captcha | JS widget + server-side token verify | Privacy-first (no Google). EU servers. Token verified at `/api/captcha/verify` before processing registration. |
| Sentry (EU) | OpenTelemetry SDK + Sentry SDK | Use EU-hosted Sentry (`o1.ingest.de.sentry.io`) for GDPR data residency. |

### Internal Module Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| API route ↔ Service | Direct function call (same process) | No HTTP between them. Service is imported TypeScript module. |
| Service ↔ Repository | Direct function call | Repository is thin DB access wrapper. No business logic in repositories. |
| API route → Job queue | BullMQ `.add()` call | Fire-and-forget for notifications. For GDPR deletion: store job ID in `deletion_log` for status tracking. |
| Worker ↔ Database | Separate DB connection pool | Worker process has its own pool. Size: max 5 connections (workers are not latency-sensitive). |
| AuthModule → NotifySvc | Through job queue only | Auth enqueues "send-confirm" job. Never calls email service directly. Prevents auth from depending on email. |

---

## Sources

- Modular monolith rationale: [ByteByteGo — Monolith vs Microservices vs Modular Monoliths](https://blog.bytebytego.com/p/monolith-vs-microservices-vs-modular), [Modular Monoliths Are a Good Idea — materializedview.io](https://materializedview.io/p/modular-monoliths-are-a-good-idea)
- Caching public vs authenticated: [Next.js CDN Caching docs](https://nextjs.org/docs/app/guides/cdn-caching), [Cloudflare Pages Next.js caching](https://developers.cloudflare.com/pages/framework-guides/nextjs/ssr/caching/), [AuthKit CDN headers](https://www.mintlify.com/workos/authkit-nextjs/guides/cdn-deployments)
- GDPR erasure architecture: [Architecting data for right to erasure — Logic20/20](https://logic2020.com/insight/architect-data-erasure/), [Art. 17 GDPR — gdpr-info.eu](https://gdpr-info.eu/art-17-gdpr/)
- IP as personal data: [CookieYes — Is IP address personal data under GDPR?](https://www.cookieyes.com/blog/ip-address-personal-data-gdpr/)
- Anti-abuse patterns: [Fake account creation defense — castle.io](https://blog.castle.io/fake-account-creation-attacks-anatomy-detection-and-defense/), [Friendly Captcha fake account prevention](https://friendlycaptcha.com/insights/fake-account-creation-prevention/)
- BullMQ for background jobs: [BullMQ docs](https://docs.bullmq.io/), [Scheduling WhatsApp with BullMQ](https://dev.to/anupom69/scheduling-whatsapp-messages-with-bun-bullmq-3il2)
- PostgreSQL audit logging: [pgAudit — oneuptime](https://oneuptime.com/blog/post/2026-01-25-postgresql-pgaudit-track-data-changes/view), [Row change auditing — CYBERTEC](https://www.cybertec-postgresql.com/en/row-change-auditing-options-for-postgresql/)
- Observability stack: [Sentry OpenTelemetry integration](https://sentry.io/for/opentelemetry/)

---
*Architecture research for: SMBsite — Bulgarian civic-tech advocacy platform*
*Researched: 2026-04-29*
