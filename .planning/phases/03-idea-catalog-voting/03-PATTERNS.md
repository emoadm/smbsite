# Phase 3: Idea Catalog + Voting — Pattern Map

**Mapped:** 2026-05-07
**Files analyzed:** 35 (created/modified during Phase 3)
**Analogs found:** 31 / 35 (89%)

## Project Convention Lockdown (must hold across every plan)

These conventions are non-negotiable and inherited from Phase 1, 2, 2.1, 5. They are referenced by file in §"Pattern Assignments".

| Convention | Source of truth | Enforced by |
|------------|-----------------|-------------|
| All Cyrillic via `next-intl` `t()`; never inline in JSX | Phase 1 D-27 | `getTranslations` in server, `useTranslations` in client; `messages/bg.json` |
| `text` columns over `pgEnum` (Zod boundary check) | `src/db/schema/auth.ts:5-31`, `src/db/schema/attribution.ts:18-20` | Zod enum at API boundary, no DDL on enum extension |
| Append-only audit tables — INSERT only, never UPDATE/DELETE from app code | `src/db/schema/consents.ts:16-35` | App-level discipline + Phase 6 GDPR-07 db-level constraint |
| HMAC-hashed identifiers — NO raw IP, NO raw UA in Postgres | `src/lib/unsubscribe/hmac.ts:34-38`, `src/lib/attribution/worker.ts:1-22` | `tests/unit/attribution-schema.test.ts:5-17` schema-grep regression test |
| `assertEditorOrAdmin` defense-in-depth in Server Actions AND Payload access control | `src/lib/auth/role-gate.ts:14-22`, `src/collections/Newsletters.ts:34-37` | `tests/unit/newsletter-server-actions.test.ts:12-29` import + call check |
| Worker-startup-time env validation; invalid value = startup fail with structured log | Phase 1 D-21 + Phase 5 Plan 05-14 | `tests/unit/start-worker-env.test.ts`, `tests/unit/start-worker-eviction-policy.test.ts` |
| Pino `REDACT` covers `email`, `ip`, `raw_ip`, `name`, `full_name` (extend for vote work) | `src/lib/logger.ts:3-14` | Logger config; tests assert redaction |
| Payload `payload migrate` BLOCKED — manual DDL via Neon SQL for collection changes | Memory `project_payload_schema_constraint` | Phase 2.1 / Phase 5 lineage; Phase 3 plan factors this in for Ideas collection only — Drizzle tables follow normal `pnpm db:generate && pnpm db:migrate` |

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/collections/Ideas.ts` | collection (Payload) | CRUD via admin | `src/collections/Newsletters.ts` (lines 1-172) | exact |
| `src/db/schema/voting.ts` | model (Drizzle) | append-only + UNIQUE state | `src/db/schema/consents.ts:19-35` (append-only), `src/db/schema/attribution.ts:21-64` (HMAC-hashed cols, no inet) | exact (composition of two analogs) |
| `src/db/schema/moderation.ts` | model (Drizzle) | append-only audit | `src/db/schema/consents.ts:19-35` | exact |
| `src/db/schema/index.ts` (modify) | barrel | export | self lines 1-3 | exact |
| `src/db/migrations/0003_*.sql` | migration | Drizzle-generated DDL | `src/db/migrations/0001_grey_umar.sql` | exact (auto-generated; Phase 3 just adds new tables) |
| `src/lib/voting/hmac.ts` | utility | hash function | `src/lib/unsubscribe/hmac.ts:24-39` | exact |
| `src/lib/voting/cooling.ts` | utility | parse-and-validate env + SQL helper | `src/lib/rate-limit.ts:14-17` (env-bypass) + `src/lib/email/queue.ts:36-44` (lazy connection) | role-match |
| `src/lib/voting/rate-limit.ts` | utility | request-response (Redis HTTP) | `src/lib/rate-limit.ts:24-82` | exact |
| `src/lib/voting/cache.ts` | utility | cached server-fetch | RESEARCH §"Cache Implementation" + `src/lib/newsletter/recipients.ts` (Phase 5 cache pattern) | role-match (no exact analog of `unstable_cache` in repo yet) |
| `src/lib/voting/slug.ts` | utility | pure transform | NEW (no direct analog) | none — RESEARCH §"Bulgarian Streamlined Slug Helper" + `src/lib/oblast-names.ts` (static-table style) |
| `src/lib/voting/anomaly.ts` | service / worker integration | event-driven | `src/lib/attribution/worker.ts:32-127` (BullMQ worker shape) + RESEARCH §"Anomaly Detection Worker (skeleton)" | role-match |
| `src/lib/email/templates/VoteAnomalyAlertEmail.tsx` | template | render-once | (any existing React Email template under `src/lib/email/templates/`) | role-match |
| `src/app/actions/cast-vote.ts` | controller (Server Action) | CRUD (INSERT/UPDATE) + audit append | `src/app/actions/register.ts:60-172` (full pipeline) + `src/app/actions/save-preferences.ts:40-103` (auth-gated INSERT-only consent shape) | exact composition |
| `src/app/actions/retract-vote.ts` | controller (Server Action) | DELETE + audit append | `src/app/actions/save-preferences.ts:40-103` | role-match |
| `src/app/actions/undo-retract.ts` | controller (Server Action) | INSERT (restore) + audit append | `src/app/actions/save-preferences.ts:40-103` | role-match |
| `src/app/actions/freeze-idea.ts` | controller (Server Action) | UPDATE + audit append | `src/app/(payload)/admin/views/attribution/actions.ts:42-91` (assertEditorOrAdmin) + `src/app/actions/cancel-scheduled.ts` (editor-only mutation) | exact |
| `src/app/actions/exclude-votes.ts` | controller (Server Action) | bulk DELETE + audit append | `src/app/(payload)/admin/views/attribution/actions.ts:93-122` | exact |
| `src/components/idea/IdeaCard.tsx` | component (Server) | request-response | `src/app/(frontend)/member/page.tsx:28-89` (Card grid) | role-match |
| `src/components/idea/IdeaDetail.tsx` | component (Server) | request-response (with client island) | `src/lib/newsletter/lexical-to-html.ts:1-40` (Lexical render) + Phase 2 prose layout | role-match |
| `src/components/idea/VoteButtons.tsx` | component (Client) | event-driven | RESEARCH Pattern 8 + `src/components/preferences/NewsletterToggleRow.tsx:1-55` (`useTransition` + optimistic toast) | role-match |
| `src/components/idea/VoteCountDisplay.tsx` | component (Server) | role-branched render | NEW (no exact analog) | none — UI-SPEC §S4 + RESEARCH §Anti-Patterns |
| `src/components/idea/RetractToast.tsx` | component (Client) | event-driven | `src/components/preferences/NewsletterToggleRow.tsx:25-36` (sonner toast pattern) + RESEARCH Pattern 7 | role-match |
| `src/components/idea/TopicChips.tsx` | component (Client) | URL-state | `src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx:39-64` (URL-state filter) | role-match |
| `src/components/idea/SortDropdown.tsx` | component (Client) | URL-state | same as TopicChips (filter pattern) | role-match |
| `src/components/idea/CatalogPagination.tsx` | component (Server) | URL-state | NEW (no analog) | none — shadcn Pagination + RESEARCH §"Recommended Project Structure" |
| `src/components/idea/TurnstileChallenge.tsx` | component (Client) | event-driven | (existing client Turnstile widget; verify in `src/components/forms/`) | role-match |
| `src/components/member/MyActivityPanel.tsx` | component (Server) | request-response | `src/components/member/Timeline.tsx:1-35` + `src/app/(frontend)/member/preferences/page.tsx` | exact reuse-as-pattern |
| `src/components/member/CoolingIndicator.tsx` | component (Client) | timer-driven | NEW (no analog) | none — UI-SPEC §S5 |
| `src/components/member/ProfileCard.tsx` | component (Server) | request-response (read-only) | `src/app/(frontend)/member/preferences/page.tsx:42-123` | role-match |
| `src/components/payload/IdeaSidebar.tsx` | component (Server, Payload-mounted) | request-response | `src/components/payload/NewsletterComposer.tsx:1-190` (Payload-mounted custom component) | role-match |
| `src/components/payload/ViewOnSiteButton.tsx` | component (Client, Payload-mounted) | event-driven (link) | `src/components/payload/NewsletterComposer.tsx:1-46` (`'use client'` Payload component header) | role-match |
| `src/components/payload/AnomalyBadge.tsx` | component (Server, Payload-mounted) | request-response | `src/components/payload/SendBlastButton.tsx` (Payload-mounted UI) | role-match |
| `src/app/(frontend)/idei/page.tsx` | route (Server Component) | request-response | `src/app/(frontend)/member/preferences/page.tsx:1-124` | role-match |
| `src/app/(frontend)/idei/[slug]/page.tsx` | route (Server Component) | request-response (slug param + draft preview gate) | `src/app/(frontend)/member/preferences/page.tsx` (server-rendered shape) + RESEARCH §D-19 preview gate | role-match |
| `src/app/(frontend)/member/profile/page.tsx` | route (Server Component) | request-response (read-only) | `src/app/(frontend)/member/preferences/page.tsx:42-123` | exact |
| `src/app/(payload)/admin/views/vote-anomalies/page.tsx` | route (Payload custom view) | request-response | `src/app/(payload)/admin/views/attribution/AttributionView.tsx:1-78` | exact |
| `src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesView.tsx` | view component (Server, role-gated) | request-response | `src/app/(payload)/admin/views/attribution/AttributionView.tsx:1-78` | exact |
| `src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesDashboard.tsx` | view component (Client) | URL-state + table render | `src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx:1-222` | exact |
| `src/app/(payload)/admin/views/vote-anomalies/actions.ts` | server actions (Drizzle aggregates, role-gated) | CRUD aggregates | `src/app/(payload)/admin/views/attribution/actions.ts:1-122` | exact |
| `src/payload.config.ts` (modify) | config | self | self lines 1-42 | exact |
| `messages/bg.json` (modify) | i18n catalog | self | self (582 lines, exists) | exact |
| `tests/unit/voting-schema.test.ts` | test | grep-regression | `tests/unit/attribution-schema.test.ts:1-62` | exact mirror |
| `tests/unit/voting-actions.test.ts` | test | grep + import-and-call assertion | `tests/unit/newsletter-server-actions.test.ts:1-80` | exact mirror |
| `tests/integration/voting-concurrent.test.ts` | test | concurrent INSERT race | NEW (no analog) | none — RESEARCH §"Concurrent-INSERT Race Test" |
| `tests/e2e/voting.spec.ts` | test (Playwright) | full user flow | (existing Playwright e2e under `tests/e2e/`) | role-match |

---

## Pattern Assignments

### `src/collections/Ideas.ts` (Payload collection, CRUD via admin)

**Analog:** `src/collections/Newsletters.ts` (lines 1-172) — direct template.

**Imports pattern** (`src/collections/Newsletters.ts:1-13`):
```typescript
import type { CollectionConfig } from 'payload';
import {
  lexicalEditor,
  ParagraphFeature,
  HeadingFeature,
  LinkFeature,
  UnorderedListFeature,
  OrderedListFeature,
  BoldFeature,
  ItalicFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
} from '@payloadcms/richtext-lexical';
```
**Plan note:** Identical feature set per D-17 — Phase 3 banned blocks (code, blockquote, custom, raw HTML) match Phase 5 banned set verbatim. No new imports.

**Access control** (`src/collections/Newsletters.ts:34-37, 59-64`):
```typescript
const isEditorOrAdmin = ({ req }: { req: { user?: unknown } }): boolean => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  return ['admin', 'editor'].includes(role);
};

// ... in CollectionConfig:
access: {
  read: isEditorOrAdmin,    // Ideas collection deviates: read = anyone
  create: isEditorOrAdmin,
  update: isEditorOrAdmin,
  delete: isEditorOrAdmin,
},
```
**Plan note (Ideas-specific):** Per D-17, public site reads `published` ideas via Drizzle directly (catalog page); the **Payload admin** read access stays editor/admin. If using Payload's REST/GraphQL on the public side (NOT recommended per Phase 5 Plan 05-01 pattern), fix `read` access to filter by `status='published'`. Recommend reading from Drizzle on the catalog page (lower coupling, no Payload REST surface in v1 public traffic).

**Lexical editor + admin custom-component registration** (`src/collections/Newsletters.ts:39-58, 95-119`):
```typescript
admin: {
  useAsTitle: 'subject',          // Ideas: 'title'
  defaultColumns: ['subject', 'topic', 'status', 'scheduledAt'], // Ideas: ['title', 'topic', 'status', 'is_featured']
  components: {
    edit: {
      beforeDocumentControls: [
        '/src/components/payload/NewsletterComposer#NewsletterComposer',
        // Ideas adds: '/src/components/payload/IdeaSidebar#IdeaSidebar'
        // Ideas adds: '/src/components/payload/ViewOnSiteButton#ViewOnSiteButton'
      ],
    },
  },
},
// ...
fields: [
  // ...
  {
    name: 'body',
    type: 'richText',
    required: true,
    editor: lexicalEditor({
      features: () => [
        ParagraphFeature(),
        HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
        LinkFeature(),
        UnorderedListFeature(),
        OrderedListFeature(),
        BoldFeature(),
        ItalicFeature(),
        FixedToolbarFeature(),
        InlineToolbarFeature(),
      ],
    }),
  },
],
```
**Plan note:** importMap.js explicit string registration is **mandatory** (Pitfall 7 — `payload.config.ts` does not auto-resolve admin custom component paths; the slot uses string literals resolved by the importMap). Same pattern as Newsletters.

**beforeChange hook for status flow** (`src/collections/Newsletters.ts:156-171`):
```typescript
hooks: {
  beforeChange: [
    ({ data, originalDoc }) => {
      if (originalDoc) {
        // Newsletters tracks lastEditedAfterTestAt; Ideas does NOT need this hook
        // unless we want to enforce slug-immutability-after-publish here.
      }
      return data;
    },
  ],
},
```
**Plan note (Ideas-specific):** Per D-18, slug must be immutable after `status='published'`. Implement via `beforeChange` hook: if `originalDoc.status === 'published'` and `data.slug !== originalDoc.slug`, throw `APIError('Slug is immutable after publish')`. Auto-generate slug from title via `slugifyBg()` (D-18) only when `data.slug` is undefined AND status is `draft`.

**Plan note (memory `project_payload_schema_constraint`):** Adding the Ideas collection requires **manual DDL via Neon SQL** for new Payload-managed tables (`ideas`, `ideas_versions`, etc.). Drizzle migrations (`pnpm db:generate && pnpm db:migrate`) are NOT used for the Payload-managed schema. The Drizzle-managed tables `votes`, `vote_events_log`, `moderation_log`, `vote_anomalies` follow the normal Drizzle pipeline.

---

### `src/db/schema/voting.ts` (Drizzle schema, append-only + UNIQUE state)

**Analog (composition):**
- `src/db/schema/consents.ts:19-35` — append-only pattern (the `vote_events_log` mirror).
- `src/db/schema/attribution.ts:21-64` — HMAC-hashed columns + no-raw-IP convention + `text` over `pgEnum`.

**Imports** (`src/db/schema/consents.ts:1-2`):
```typescript
import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
```
**Plan note:** Voting also imports `unique` and `pgTable` (existing) for the UNIQUE on `(user_id, idea_id)`.

**Append-only audit table pattern** (`src/db/schema/consents.ts:16-35`):
```typescript
// D-13: append-only. NEVER UPDATE or DELETE rows from the application.
// Withdrawals INSERT a new row with granted = false.
// onDelete: 'restrict' — Phase 6 deletion flow handles cascade explicitly.
export const consents = pgTable(
  'consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    kind: text('kind').notNull(), // one of CONSENT_KINDS
    granted: boolean('granted').notNull(),
    version: text('version').notNull(),
    granted_at: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    region: text('region'),
  },
  (t) => ({
    userKindIdx: index('consents_user_kind_idx').on(t.user_id, t.kind),
  }),
);
```

**Plan note (vote_events_log specifics — D-13/D-15/D-16):**
- `user_id` is **NULLABLE** (per D-16 lawyer-flip path — see `// NULLABLE for D-16 lawyer-flip path` comment in code).
- `onDelete: 'cascade'` (NOT `'restrict'` like consents) per D-16 default-safe Art. 17 reading.
- 3 indexes per `[CITED: 03-RESEARCH.md §"vote_events_log Index Strategy"]`:
  - `vote_events_idea_time_idx` on `(idea_id, occurred_at)` — D-12 trigger 1
  - `vote_events_subnet_time_idx` on `(subnet_hash, occurred_at)` — D-12 trigger 2
  - `vote_events_user_time_idx` on `(user_id, occurred_at)` — D-12 trigger 3 + admin forensic
- NO indexes on `ip_hash` or `ua_hash` (forensic-only, not hot-path).
- Topic constants exported as `as const` arrays (mirrors `CONSENT_KINDS`):
  ```typescript
  export const VOTE_ACTIONS = ['cast', 'change', 'retract'] as const;
  export const VOTE_CHOICES = ['approve', 'reject'] as const;
  export const IDEA_TOPICS = ['taxes', 'labor', 'regulation', 'financing', 'digitalization', 'other'] as const;
  ```

**HMAC-hashed columns + no-raw-IP convention** (`src/db/schema/attribution.ts:10-20`):
```typescript
// CRITICAL — D-19 / GDPR-09: NO inet column. NO raw IP column. NO ip address
// column. Raw IP exists only inside the BullMQ job payload (Redis-resident,
// ephemeral) and is discarded by the worker after the in-memory MaxMind
// GeoLite2 lookup. tests/unit/attribution-schema.test.ts grep-asserts this.
//
// All enum-shaped values stored as `text(...)` (D-24 + project convention from
// src/db/schema/auth.ts lines 16-17 sector/role). Never use pgEnum — adding
// values to a pg enum is DDL.
```
**Plan note:** Phase 3 mirror — `vote_events_log` columns:
```typescript
ip_hash: text('ip_hash').notNull(),
subnet_hash: text('subnet_hash').notNull(),
ua_hash: text('ua_hash').notNull(),
fresh_account_at_event: boolean('fresh_account_at_event').notNull(),
```
NO `inet`, NO `raw_ip`, NO `ip_address`, NO `user_agent` (only `ua_hash`).

**Plan note (votes-table specifics — D-13/D-14):**
- `votes` is the **current-state table** (NOT append-only). UNIQUE on `(user_id, idea_id)` enforces IDEA-04 at DB level.
- `ON DELETE CASCADE` from both `users` and `ideas` (per D-13).
- `updated_at` column for change-detection.
- Retract = DELETE the votes row; vote_events_log records the action='retract' with choice=null.

---

### `src/db/schema/moderation.ts` (Drizzle schema, append-only audit)

**Analog:** `src/db/schema/consents.ts:19-35` (append-only pattern, `onDelete: 'restrict'`).

**Plan note (D-21 schema lock):**
```typescript
// Phase 3 D-21 — append-only. Phase 4 EDIT-06 ADDS action enum values
// (user_suspend, user_unsuspend, submission_reject) without schema change.
export const moderation_log = pgTable(
  'moderation_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    action: text('action').notNull(),
    actor_user_id: uuid('actor_user_id')
      .references(() => users.id, { onDelete: 'restrict' }),  // restrict — preserve audit
    target_kind: text('target_kind').notNull(),  // 'idea' | 'user' | 'votes' | 'submission'
    target_id: uuid('target_id'),
    target_ids: uuid('target_ids').array(),  // Drizzle: .array() postgres array
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    actionIdx: index('moderation_log_action_idx').on(t.action, t.created_at),
    targetKindIdx: index('moderation_log_target_kind_idx').on(t.target_kind, t.target_id),
  }),
);
```

**Plan note:** `actor_user_id` uses `onDelete: 'restrict'` (audit must outlive user deletion — same posture as `consents.user_id`). The `target_ids` array column captures bulk-action ids for `vote_exclude`. Action enum is enforced in Server Action via Zod (NOT pgEnum).

---

### `src/lib/voting/hmac.ts` (utility, hash function)

**Analog:** `src/lib/unsubscribe/hmac.ts:24-39` — direct template for HMAC pattern.

**Imports + lazy SECRET()** (`src/lib/unsubscribe/hmac.ts:1, 24-28`):
```typescript
import { createHmac, timingSafeEqual } from 'node:crypto';

// Why lazy SECRET()? RESEARCH §Pitfall 8 — module-eval-time env-var bug from
// Phase 02.1. Build must not fail when secret is unset; only first sign/verify call.

function SECRET(): string {
  const s = process.env.UNSUBSCRIBE_HMAC_SECRET;
  if (!s) throw new Error('UNSUBSCRIBE_HMAC_SECRET not set');
  return s;
}
```
**Plan note:** Phase 3 swaps env name to `VOTE_AUDIT_HMAC_SECRET` per D-15. Identical lazy-init pattern.

**Hash function shape** (`src/lib/unsubscribe/hmac.ts:34-39`):
```typescript
export function signUnsubToken(uid: string): string {
  const payload: UnsubPayload = { uid, iat: Date.now() };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', SECRET()).update(body).digest('base64url');
  return `${body}.${sig}`;
}
```
**Plan note (Phase 3 simplification):** Voting HMAC needs no payload-with-iat — it's a one-way clustering hash, not a verifiable token. Use `.digest('hex')` per RESEARCH Pattern 2:
```typescript
export function hashIp(ip: string): string {
  return createHmac('sha256', SECRET()).update(ip).digest('hex');
}
export function hashSubnet(ip: string): string {
  // Use src/lib/ip.ts:9-13 getSubnet for IPv4 /24 prefix; extend for IPv6 /64.
  const subnet = subnetPrefix(ip);
  return createHmac('sha256', SECRET()).update(subnet).digest('hex');
}
export function hashUa(ua: string): string {
  return createHmac('sha256', SECRET()).update(ua).digest('hex');
}
```

**Subnet helper to extend** (`src/lib/ip.ts:9-13`):
```typescript
export function getSubnet(ip: string): string {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return ip;
  const parts = ip.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}
```
**Plan note:** Phase 3 needs IPv6 /64 support (D-15). Either extend `src/lib/ip.ts` with `getSubnetV6()` or add `subnetPrefix()` in `src/lib/voting/hmac.ts`. Either is fine; recommend **extending `ip.ts`** so the helper is reusable for future cases.

---

### `src/lib/voting/cooling.ts` (utility, parse-validate env + SQL helper)

**Analog:** `src/lib/rate-limit.ts:14-17` (env validation pattern) + `src/lib/email/queue.ts:36-44` (lazy connection pattern).

**Plan note (D-10 startup-time validation):** Per RESEARCH §"Cooling-Period Drizzle Query":
```typescript
import { sql } from 'drizzle-orm';

// D-10 — parsed at startup. Format regex: ^\d+ (hours|days)$
// Mirrors Phase 5 Plan 05-14 Redis eviction policy startup-validation pattern.
function parseInterval(raw: string): string {
  if (!/^\d+ (hours|days)$/.test(raw)) {
    throw new Error(`Invalid VOTE_COUNTABLE_INTERVAL: ${raw}`);
  }
  return raw;
}
const COOLING_INTERVAL = parseInterval(process.env.VOTE_COUNTABLE_INTERVAL ?? '48 hours');
```

**Cooling-aware count via JOIN** (RESEARCH §"Cooling-Period Drizzle Query"):
```typescript
export async function getCooledApproveCount(db: DrizzleDb, ideaId: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS approve_count
    FROM votes v
    INNER JOIN users u ON u.id = v.user_id
    WHERE v.idea_id = ${ideaId}
      AND v.choice = 'approve'
      AND u.email_verified_at + INTERVAL '${sql.raw(COOLING_INTERVAL)}' < NOW()
  `);
  return Number(result.rows[0]?.approve_count ?? 0);
}
```
**Plan note:** `sql.raw()` is required because Postgres `INTERVAL` literal cannot be parameterized. The startup regex validation IS the SQL-injection defense — the value is whitelisted at boot, never user input.

---

### `src/lib/voting/rate-limit.ts` (utility, two-tier Upstash gate)

**Analog:** `src/lib/rate-limit.ts:1-90` — direct template. **Extend, do not rewrite.**

**Imports + connection** (`src/lib/rate-limit.ts:1-22`):
```typescript
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL ?? '';

// Bypass when env is missing or points at a local placeholder (CI / .env.test).
const STAGING_BYPASS =
  process.env.LOAD_TEST_BYPASS_RATE_LIMIT === 'true' &&
  process.env.AUTH_URL?.includes('staging.');
const BYPASS = !upstashUrl || upstashUrl.startsWith('http://localhost') || upstashUrl.startsWith('http://127.') || STAGING_BYPASS;

const redis = new Redis({
  url: upstashUrl || 'https://placeholder.invalid',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
});
```
**Plan note:** Reuse the existing `redis` instance and BYPASS pattern — do NOT instantiate a second Redis client. Extend `src/lib/rate-limit.ts` directly OR import the existing `redis` and add new Ratelimit definitions in `src/lib/voting/rate-limit.ts`. **Recommend the latter** to keep voting-specific limits scoped to the voting module.

**Two-tier gate function** (RESEARCH §Pattern 6):
```typescript
const voteSoft = new Ratelimit({
  redis,
  prefix: 'vote-soft',
  limiter: Ratelimit.slidingWindow(5, '60 s'),  // VOTE_RATE_SOFT default
  analytics: false,
});
const voteHard = new Ratelimit({
  redis,
  prefix: 'vote-hard',
  limiter: Ratelimit.slidingWindow(20, '60 s'), // VOTE_RATE_HARD default
  analytics: false,
});

export async function gateVoteRate(
  userId: string,
  hasTurnstile: boolean,
): Promise<{ ok: true } | { ok: false; reason: 'turnstile-required' | 'hard-block' }> {
  if (BYPASS) return { ok: true };  // mirrors src/lib/rate-limit.ts:64
  const hard = await voteHard.limit(userId);
  if (!hard.success) return { ok: false, reason: 'hard-block' };
  const soft = await voteSoft.limit(userId);
  if (!soft.success && !hasTurnstile) return { ok: false, reason: 'turnstile-required' };
  return { ok: true };
}
```

**Plan note:** Numbers (5, 20) sourced from RESEARCH §"Soft / Hard Rate-Limit Numbers" — ship CONTEXT defaults via env-flags `VOTE_RATE_SOFT` / `VOTE_RATE_HARD`. **Test mirror** `tests/unit/rate-limit.test.ts:1-90` shape applies for `tests/unit/voting-rate-limit.test.ts`.

---

### `src/lib/voting/cache.ts` (utility, `unstable_cache` wrapper)

**Analog:** No exact analog yet (Phase 5 cache uses `getCurrentTopicState` per-call query, not `unstable_cache`). Phase 3 introduces the project's first `unstable_cache` usage.

**Plan note:** Per RESEARCH §"Cache Implementation":
```typescript
import { unstable_cache } from 'next/cache';
import { getCooledApproveCount, getCooledRejectCount } from './cooling';
import { db } from '@/db';

const REVEAL_THRESHOLD = Number(process.env.IDEA_REVEAL_THRESHOLD ?? 20);

export const getCachedDisplayCounts = unstable_cache(
  async (ideaId: string) => {
    const approve = await getCooledApproveCount(db, ideaId);
    const reject = await getCooledRejectCount(db, ideaId);
    const total = approve + reject;
    if (total < REVEAL_THRESHOLD) {
      return { revealed: false, total };
    }
    return {
      revealed: true,
      approve,
      reject,
      total,
      approvePct: Math.round((approve / total) * 100),
    };
  },
  ['idea-display-counts'],
  { revalidate: 300 },  // D-03 — 5-minute TTL
);
```

**Anti-pattern lock (RESEARCH §"Catalog `unstable_cache` Invalidation on Vote"):** Plans MUST NOT call `revalidatePath('/idei/...')` or `revalidateTag(...)` from `castVote`, `retractVote`, `undoRetract`. Test:
```typescript
// tests/unit/voting-cache-not-busted.test.ts
import { readFileSync } from 'node:fs';
const sources = ['cast-vote.ts', 'retract-vote.ts', 'undo-retract.ts'];
for (const f of sources) {
  const src = readFileSync(`src/app/actions/${f}`, 'utf8');
  expect(src).not.toMatch(/revalidatePath|revalidateTag/);
}
```

---

### `src/lib/voting/slug.ts` (utility, pure transform — NO ANALOG)

**Plan note:** No direct analog. Use RESEARCH §"Bulgarian Streamlined Slug Helper" verbatim (already verified against `transliteration@2.6.1`):
```typescript
import { transliterate } from 'transliteration';

const BULGARIAN_OVERRIDES: Array<[RegExp, string]> = [
  [/ия\b/g, 'ia'],  // 2006 amendment word-final exception
];

function applyOverrides(input: string): string {
  let result = input;
  for (const [pattern, replacement] of BULGARIAN_OVERRIDES) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

export function slugifyBg(title: string): string {
  const overridden = applyOverrides(title);
  return transliterate(overridden, { trim: true })
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

**Slug-uniqueness retry-loop** (RESEARCH §Pitfall 5):
```typescript
export async function ensureUniqueSlug(db: DrizzleDb, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let n = 2;
  while (true) {
    const existing = await db.select({ id: ideas.id }).from(ideas).where(eq(ideas.slug, slug)).limit(1);
    if (existing.length === 0) return slug;
    slug = `${baseSlug}-${n++}`;
  }
}
```

**Static-table convention reference:** `src/lib/oblast-names.ts` — same shape for the `IDEA_TOPICS` const array + display name resolver via `next-intl` keys `idea.topic.*`.

---

### `src/lib/voting/anomaly.ts` (BullMQ worker integration)

**Analog (composition):**
- `src/lib/attribution/worker.ts:1-127` — BullMQ worker shape, lazy connection, raw-input-discard pattern.
- `src/lib/email/queue.ts:1-117` — `addEmailJob` enqueue pattern (extend `EmailJobKind` enum to include `'vote-anomaly-alert'`).

**BullMQ worker shape** (`src/lib/attribution/worker.ts:23-30, 118-127`):
```typescript
function workerConnection(): IORedis {
  const url = process.env.UPSTASH_REDIS_URL!;
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
}

export function startWorker() {
  return new Worker<AttributionJobPayload, void>(
    ATTRIBUTION_QUEUE_NAME,
    processor,
    { connection: workerConnection(), concurrency: 5 },
  );
}
```
**Plan note:** Phase 3 anomaly detection runs inline in the BullMQ email worker (since it triggers email sends). Alternative: a separate `vote-anomaly-queue` worker. **Recommend the simpler path:** anomaly check runs inside the existing email worker as a side-effect of `'vote-anomaly-alert'` jobs (cheap aggregates), and `castVote` enqueues `{ kind: 'vote-anomaly-check', ideaId }` after each vote. Decision deferred to planner.

**Anomaly detector shape** (RESEARCH §"Anomaly Detection Worker (skeleton)"):
```typescript
export async function detectAnomaliesForIdea(db: DrizzleDb, ideaId: string) {
  // Trigger 1 — per-idea velocity > N1 / T1 min
  // Trigger 2 — /24-subnet aggregate > N2 / T2 min
  // Trigger 3 — fresh-account share > P% of last N3 votes
  // Each fires emitAnomaly() on threshold cross — INSERT vote_anomalies + Sentry + addEmailJob
}
```

**Sentry tag schema (D-12 + RESEARCH §11):**
```typescript
Sentry.captureMessage('vote_velocity_anomaly', {
  level: 'warning',
  tags: { idea_id: ideaId, trigger_type: trigger, count: String(count) },
});
```
**No PII in tags** — Phase 1 D-21 logging discipline. The anomaly module imports nothing from `users` rows except the boolean `fresh_account_at_event` already on `vote_events_log`.

**Email queue extension** (`src/lib/email/queue.ts:7-15`):
```typescript
export type EmailJobKind =
  | 'register-otp'
  | 'login-otp'
  | 'welcome'
  | 'newsletter-blast'
  | 'newsletter-send-recipient'
  | 'newsletter-test'
  | 'unsubscribe-brevo-retry'
  | 'vote-anomaly-alert';   // Phase 3 D-12 — NEW
```
**Plan note:** Add `anomalyId?: string; ideaId?: string;` to `EmailJobPayload` for the new kind.

---

### `src/app/actions/cast-vote.ts` (Server Action, vote/change pipeline)

**Analog (composition):**
- `src/app/actions/register.ts:1-172` — full pipeline: Zod validation → rate-limit → Turnstile → DB transaction → enqueue.
- `src/app/actions/save-preferences.ts:40-103` — auth-gated session reading + INSERT-only consent shape.

**Imports + headers + 'use server'** (`src/app/actions/register.ts:1-15`):
```typescript
'use server';

import { headers } from 'next/headers';
import { eq } from 'drizzle-orm';
import { z } from '@/lib/zod-i18n';     // i18n-mapped Zod, NOT bare 'zod'
import { db } from '@/db';
import { users, consents } from '@/db/schema';
import { verifyTurnstile } from '@/lib/turnstile';
import { addEmailJob } from '@/lib/email/queue';
import { getClientIp, getSubnet } from '@/lib/ip';
```
**Plan note:** `castVote` adds `import { auth } from '@/lib/auth'`, `import { gateVoteRate } from '@/lib/voting/rate-limit'`, `import { hashIp, hashSubnet, hashUa } from '@/lib/voting/hmac'`.

**Auth-gated session reading** (`src/app/actions/save-preferences.ts:44-46`):
```typescript
export async function castVote(input: { ideaId: string; choice: 'approve' | 'reject'; turnstileToken?: string }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return { ok: false, reason: 'unauthenticated' };
  // ...
}
```

**Zod validation** (`src/app/actions/register.ts:17-52, 83-87`):
```typescript
const ChoiceEnum = z.enum(['approve', 'reject']);
const VoteInput = z.object({
  ideaId: z.string().uuid(),
  choice: ChoiceEnum,
  turnstileToken: z.string().optional(),
});
const parsed = VoteInput.safeParse(input);
if (!parsed.success) return { ok: false, reason: 'invalid_input' };
```

**Rate-limit + Turnstile composition** (`src/app/actions/register.ts:71-91`):
```typescript
const h = await headers();
const ip = getClientIp(h);

const gate = await gateVoteRate(userId, !!parsed.data.turnstileToken);
if (gate.ok === false && gate.reason === 'hard-block') {
  return { ok: false, reason: 'rate_limited' };
}
if (gate.ok === false && gate.reason === 'turnstile-required') {
  if (!parsed.data.turnstileToken) return { ok: false, reason: 'turnstile_required' };
  const tr = await verifyTurnstile(parsed.data.turnstileToken, ip ?? undefined);
  if (!tr.ok) return { ok: false, reason: 'captcha_failed' };
}
```

**DB transaction with INSERT/UPDATE + audit** (`src/app/actions/register.ts:102-159`):
```typescript
await db.transaction(async (tx) => {
  // 1. Look up existing vote (current state)
  const existing = await tx.select(...).from(votes).where(and(eq(votes.user_id, userId), eq(votes.idea_id, ideaId))).limit(1);

  // 2. UPSERT into votes table (ON CONFLICT (user_id, idea_id) DO UPDATE)
  await tx.insert(votes).values({...}).onConflictDoUpdate({
    target: [votes.user_id, votes.idea_id],
    set: { choice: parsed.data.choice, updated_at: new Date() },
  });

  // 3. INSERT into vote_events_log (append-only mirror)
  const ipHash = ip ? hashIp(ip) : '';
  const subnetHash = ip ? hashSubnet(ip) : '';
  const uaHash = hashUa(h.get('user-agent') ?? '');
  await tx.insert(vote_events_log).values({
    user_id: userId,
    idea_id: parsed.data.ideaId,
    choice: parsed.data.choice,
    action: existing.length > 0 ? 'change' : 'cast',
    ip_hash: ipHash,
    subnet_hash: subnetHash,
    ua_hash: uaHash,
    fresh_account_at_event: /* computed in SQL or with subquery */,
  });
});
```

**Plan note:** `fresh_account_at_event` per D-15 is computed at INSERT-time as `(NOW() - voter.email_verified_at) < VOTE_COUNTABLE_INTERVAL`. Either:
- Compute in SQL via `INSERT ... SELECT` from users table; OR
- Pre-compute in a separate `tx.select()` and pass as boolean.
Recommend the SQL approach to avoid race conditions.

**Anti-pattern lock:** No `revalidatePath` / `revalidateTag` (Pitfall 7).

---

### `src/app/actions/retract-vote.ts` (Server Action, DELETE + audit append)

**Analog:** `src/app/actions/save-preferences.ts:40-103` — auth-gated short pipeline.

**Plan note:** Same imports as cast-vote.ts. Pipeline:
1. `auth()` — get session
2. `Zod` — validate `{ ideaId }`
3. Look up current vote (return previous choice for undo-toast to use)
4. Single `db.transaction`:
   - `DELETE FROM votes WHERE user_id = $1 AND idea_id = $2 RETURNING choice`
   - `INSERT INTO vote_events_log` with `action='retract', choice=null`, returning `id` (toast uses this for undo)
5. Return `{ ok: true, voteEventLogId, prevChoice }`

---

### `src/app/actions/undo-retract.ts` (Server Action, INSERT restore + audit append)

**Analog:** `src/app/actions/save-preferences.ts:40-103` (auth-gated INSERT) + RESEARCH §Pattern 7 (5-sec toast undo flow).

**Plan note:** Pipeline:
1. `auth()` — verify session matches the user_id stored in the previous `vote_events_log` row by `voteEventLogId` (defense against undo-other-users-retract)
2. `Zod` — validate `{ voteEventLogId, prevChoice }`
3. Single `db.transaction`:
   - `INSERT INTO votes (user_id, idea_id, choice) VALUES ...` (clean INSERT after retract — DELETEd row)
   - `INSERT INTO vote_events_log` with `action='cast'` (NOT 'undo' — RESEARCH note: undo-IS-cast-restoring-previous-choice and IS audit-trailed)

**Pitfall guardrail:** RESEARCH §Pitfall 4 — rapid Retract→Undo→Retract sequence is by-design correct because every state change writes a `vote_events_log` row.

---

### `src/app/actions/freeze-idea.ts` + `src/app/actions/exclude-votes.ts` (editor Server Actions)

**Analog:** `src/app/(payload)/admin/views/attribution/actions.ts:1-122` — direct template for editor-only actions.

**Imports + role gate** (`src/app/(payload)/admin/views/attribution/actions.ts:1-12`):
```typescript
'use server';

import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { db } from '@/db';
import { ideas, votes, vote_events_log, moderation_log } from '@/db/schema';
import { sql, gte, lte, and, eq, inArray } from 'drizzle-orm';
```

**Role-gate assertion** (`src/app/(payload)/admin/views/attribution/actions.ts:43`):
```typescript
export async function freezeIdea(input: { ideaId: string; note?: string }) {
  await assertEditorOrAdmin();  // throws on unauthorized
  // ...
}
```
**Plan note:** Defense-in-depth — `assertEditorOrAdmin` is also enforced by the Payload collection access control in `Ideas.ts`, but Server Actions can be invoked outside the Payload admin shell (e.g., direct fetch), so the action must re-check.

**Bulk-update + moderation_log INSERT (excludeVotes specifics):**
```typescript
export async function excludeVotes(input: { voteEventLogIds: string[]; note?: string }) {
  await assertEditorOrAdmin();
  const session = await auth();
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  if (!actorId) throw new Error('Forbidden');

  await db.transaction(async (tx) => {
    // 1. Look up the vote_events_log rows to get their (user_id, idea_id) pairs
    const events = await tx.select({...}).from(vote_events_log).where(inArray(vote_events_log.id, input.voteEventLogIds));
    // 2. DELETE corresponding votes rows (vote_events_log untouched — audit preserved)
    for (const e of events) {
      await tx.delete(votes).where(and(eq(votes.user_id, e.user_id!), eq(votes.idea_id, e.idea_id)));
    }
    // 3. INSERT moderation_log row with action='vote_exclude', target_kind='votes', target_ids=[...]
    await tx.insert(moderation_log).values({
      action: 'vote_exclude',
      actor_user_id: actorId,
      target_kind: 'votes',
      target_ids: input.voteEventLogIds,
      note: input.note,
    });
  });
}
```

---

### `src/components/idea/IdeaCard.tsx` (Server Component, catalog grid card)

**Analog:** `src/app/(frontend)/member/page.tsx:28-89` — Card grid with Lucide icons, next-intl text.

**Imports + i18n + Card** (`src/app/(frontend)/member/page.tsx:1-7, 29-43`):
```typescript
import Link from 'next/link';
import { Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';   // Phase 3 NEW shadcn install
import { Progress } from '@/components/ui/progress';  // Phase 3 NEW

export async function IdeaCard({ idea }: { idea: Idea }) {
  const t = await getTranslations('idea');
  const topicLabel = t(`topic.${idea.topic}`);
  return (
    <Card>
      <CardHeader>
        {idea.is_featured && <Badge variant="secondary"><Star /> {t('badge.featured')}</Badge>}
        <Badge variant="outline">{topicLabel}</Badge>
        <h3 className="font-display text-xl">{idea.title}</h3>
      </CardHeader>
      <CardContent>
        <p className="text-base text-muted-foreground">{idea.excerpt}</p>
        {/* Threshold-gated progress bar via VoteCountDisplay */}
      </CardContent>
    </Card>
  );
}
```

**Plan note:** Card is Server Component (no `'use client'`); the `<VoteCountDisplay>` child reads cached display counts via `getCachedDisplayCounts()` (server-side only).

---

### `src/components/idea/VoteButtons.tsx` (Client component, aria-pressed toggle)

**Analog (composition):**
- RESEARCH Pattern 8 — `aria-pressed` toggle pattern (W3C ARIA APG canonical).
- `src/components/preferences/NewsletterToggleRow.tsx:1-55` — `useTransition` + optimistic-then-toast pattern.

**Imports + 'use client'** (`src/components/preferences/NewsletterToggleRow.tsx:1-8`):
```typescript
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { castVote } from '@/app/actions/cast-vote';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, X, Loader2 } from 'lucide-react';
```

**Optimistic + toast pattern** (`src/components/preferences/NewsletterToggleRow.tsx:25-36`):
```typescript
const onToggle = (next: boolean) => {
  setGranted(next); // optimistic
  startTransition(async () => {
    const result = await saveTopicPreference({ topic, granted: next });
    if (result.ok) {
      toast.success(t('toast.saved'));
    } else {
      setGranted(!next);  // revert on failure
      toast.error(t('toast.error'));
    }
  });
};
```

**Vote button shape** (RESEARCH §Pattern 8):
```typescript
export function VoteButtons({ ideaId, currentChoice }: { ideaId: string; currentChoice: 'approve' | 'reject' | null }) {
  const t = useTranslations('vote');
  const [isPending, startTransition] = useTransition();
  const [choice, setChoice] = useState(currentChoice);

  const onClick = (next: 'approve' | 'reject') => {
    if (choice === next) {
      // RETRACT
      // ...
      return;
    }
    // CHANGE or CAST
    setChoice(next);  // optimistic
    startTransition(async () => {
      const result = await castVote({ ideaId, choice: next });
      if (!result.ok) {
        setChoice(currentChoice);  // revert
        if (result.reason === 'turnstile_required') {/* show TurnstileChallenge */}
        else toast.error(t('error.failed'));
      }
    });
  };

  return (
    <div className="flex gap-2">
      <Button
        variant={choice === 'approve' ? 'default' : 'outline'}
        aria-pressed={choice === 'approve'}
        disabled={isPending}
        onClick={() => onClick('approve')}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <Check />}
        {t('approve')}
      </Button>
      <Button
        variant={choice === 'reject' ? 'default' : 'outline'}
        aria-pressed={choice === 'reject'}
        disabled={isPending}
        onClick={() => onClick('reject')}
      >
        {isPending ? <Loader2 className="animate-spin" /> : <X />}
        {t('reject')}
      </Button>
    </div>
  );
}
```

---

### `src/components/idea/RetractToast.tsx` (Sonner action-slot wrapper)

**Analog:** `src/components/preferences/NewsletterToggleRow.tsx:25-36` (sonner toast call) + RESEARCH §Pattern 7 (action slot + 5-sec undo).

**Plan note:** Per RESEARCH §Pattern 7:
```typescript
'use client';
import { toast } from 'sonner';
import { undoRetract } from '@/app/actions/undo-retract';
import { useTranslations } from 'next-intl';

export function showRetractToast(voteEventLogId: string, prevChoice: 'approve' | 'reject') {
  // i18n note: this function is not a component, so call useTranslations from the caller
  // and pass the localized strings down — OR use getTranslations on the server before
  // rendering. Recommend: caller wraps with useTranslations and passes resolved strings.
  toast('Гласът ти е оттеглен.', {  // PLACEHOLDER — must come from t('vote.retract.toast')
    duration: 5000,                  // D-24 — 5-second undo window
    action: {
      label: 'Отмени',               // PLACEHOLDER — t('vote.retract.undo')
      onClick: async () => {
        await undoRetract({ voteEventLogId, prevChoice });
        toast.success('Възстановен.');  // PLACEHOLDER
      },
    },
  });
}
```

**i18n discipline note:** `sonner.toast()` is called inside an event handler — `useTranslations` is unavailable. Two options: (1) call `useTranslations` in the component that calls `showRetractToast` and pass localized strings as args; (2) refactor to read messages directly from `messages/bg.json` (mirrors `src/lib/email/i18n-direct.ts:1-30` `getAdminT` pattern). **Recommend option 1** — keeps the i18n provider chain intact.

---

### `src/components/member/MyActivityPanel.tsx` (Server Component, voted-ideas list)

**Analog:** `src/components/member/Timeline.tsx:1-35` (Server Component pattern + getTranslations + numbered list shape).

**Imports + getTranslations** (`src/components/member/Timeline.tsx:1-13`):
```typescript
import { getTranslations } from 'next-intl/server';

export async function Timeline() {
  const t = await getTranslations('member.welcome.next.items');
  // ...
}
```

**Plan note (D-05 specifics):** MyActivityPanel reads voted ideas via Drizzle JOIN at request time:
```typescript
import { db } from '@/db';
import { votes, ideas } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function MyActivityPanel({ userId }: { userId: string }) {
  const t = await getTranslations('member.activity');
  const myVotes = await db
    .select({
      voteId: votes.id,
      choice: votes.choice,
      createdAt: votes.created_at,
      ideaId: ideas.id,
      ideaTitle: ideas.title,
      ideaSlug: ideas.slug,
    })
    .from(votes)
    .innerJoin(ideas, eq(votes.idea_id, ideas.id))
    .where(eq(votes.user_id, userId))
    .orderBy(desc(votes.created_at));

  return (
    <ol className="mt-6 space-y-4">
      {myVotes.map((v) => (
        <li key={v.voteId} className="flex gap-4">
          {/* CoolingIndicator (client) for cooling votes */}
          <Link href={`/idei/${v.ideaSlug}`}>{v.ideaTitle}</Link>
          {/* badge: "Одобрено от теб" / "Не одобрено от теб" */}
          {/* inline retract/change buttons (client islands) */}
        </li>
      ))}
    </ol>
  );
}
```

**Cooling indicator decision:** The "Гласът ти ще се отчете след HHч MMм" countdown (D-04 cooling-display) is a client component (`CoolingIndicator.tsx`) that takes `emailVerifiedAt` as prop and renders a live counter. Server pre-computes `cooling_remaining_ms` to avoid layout shift on hydration.

---

### `src/components/member/ProfileCard.tsx` + `src/app/(frontend)/member/profile/page.tsx`

**Analog:** `src/app/(frontend)/member/preferences/page.tsx:1-124` — DIRECT template for the page shell.

**Page shell pattern** (`src/app/(frontend)/member/preferences/page.tsx:30-66`):
```typescript
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('member.profile');
  return { title: t('heading') };
}

export default async function ProfilePage() {
  const t = await getTranslations('member.profile');
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;

  const userRows = await db
    .select({
      full_name: users.full_name,
      email: users.email,
      created_at: users.created_at,
      sector: users.sector,
      role: users.role,
      preferred_channel: users.preferred_channel,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const profile = userRows[0]!;

  return (
    <MainContainer width="legal">
      <h1>{t('heading')}</h1>
      <Card className="mt-12">
        <CardContent>
          <dl>
            <dt>{t('fields.fullName')}</dt><dd>{profile.full_name}</dd>
            <dt>{t('fields.email')}</dt><dd>{profile.email}</dd>
            {/* ... */}
          </dl>
        </CardContent>
      </Card>
      {/* GDPR-04 placeholder card with disabled "Изнеси моите данни" button */}
      <Link href="/member/preferences">{t('links.preferences')}</Link>
    </MainContainer>
  );
}
```

**Plan note (D-26 specifics):** Profile is **read-only** in v1 — no inline editing, no form. Sector / role display via `t(\`sector.${profile.sector}\`)` (next-intl labels resolve internal English snake_case to Bulgarian display names).

---

### `src/app/(frontend)/idei/page.tsx` + `[slug]/page.tsx` (catalog routes)

**Analog:** `src/app/(frontend)/member/preferences/page.tsx:1-124` — server-rendered shape with auth-aware guard from layout.

**Plan note (catalog index — `/idei/page.tsx`):**
- Reads `searchParams` for `page`, `topic`, `sort` (per D-09 page-based pagination, multi-select topic, 3-option sort).
- Drizzle query with `WHERE status='published'` + topic filter + sort + `LIMIT 12 OFFSET (page-1)*12`.
- For "Най-одобрени" sort, uses cooling-aware approve count (Pitfall 6).
- Renders `<TopicChips>`, `<SortDropdown>`, grid of `<IdeaCard>`, `<CatalogPagination>`.
- Two empty-state branches per D-09 (platform-empty vs filter-empty).
- NO `auth()` call — catalog is public. (auth-aware reject-count happens inside `<VoteCountDisplay>`.)

**Plan note (idea detail — `/idei/[slug]/page.tsx`):**
- Reads `slug` param + `preview` searchParam (D-19 draft preview gate).
- If `?preview=draft`: call `auth()` and verify role is editor/admin via `role-gate`; if not, 404.
- Otherwise: fetch `WHERE slug = $1 AND status = 'published'`; 404 on miss.
- Renders `<IdeaDetail>` with Lexical content (via `renderLexicalToHtml` from Phase 5).
- `<VoteButtons>` client island reads current user's vote via `auth()` + a small Drizzle lookup at SSR time.
- `<VoteCountDisplay>` reads `getCachedDisplayCounts(ideaId)` — branches on `revealed: boolean`.

**Lexical render reuse** (`src/lib/newsletter/lexical-to-html.ts:1-40`):
```typescript
import { renderLexicalToHtml } from '@/lib/newsletter/lexical-to-html';

// In IdeaDetail.tsx:
const bodyHtml = renderLexicalToHtml(idea.body);
return <div className="prose" dangerouslySetInnerHTML={{ __html: bodyHtml }} />;
```
**Plan note:** Reuse Phase 5's lexical-to-html; the allowed-blocks set is identical so no new converters needed. The `upload` converter at lines 21-35 already handles hero/inline images.

---

### `src/app/(payload)/admin/views/vote-anomalies/` (Payload custom view)

**Analog:** `src/app/(payload)/admin/views/attribution/` — DIRECT template (3 files).

**View component pattern** (`src/app/(payload)/admin/views/attribution/AttributionView.tsx:1-78`):
```typescript
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import bg from '../../../../../../messages/bg.json';
import { fetchAttributionAggregates, type AttributionFilter } from './actions';
import { AttributionDashboard } from './AttributionDashboard';

const t = (bg as { attribution: { dashboard: Record<string, unknown> } }).attribution.dashboard as { /* ... */ };

export async function AttributionView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req: { user, i18n, payload }, locale, visibleEntities } = initPageResult;

  // Role gate — D-13 + ASVS V4. NO Drizzle query runs before this passes.
  if (!user) return /* loginRequired */;
  const role = (user as { role?: string }).role ?? '';
  if (!['admin', 'editor'].includes(role)) return /* denied */;

  const sp = (await searchParams) ?? {};
  const filter = parseFilter(sp);
  const data = await fetchAttributionAggregates(filter);

  return (
    <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
      <Gutter>
        <h1>{t.title}</h1>
        <AttributionDashboard initialFilter={filter} initialData={data} />
      </Gutter>
    </DefaultTemplate>
  );
}
```

**i18n loading-direct pattern (mirrors `src/lib/email/i18n-direct.ts`):** Payload admin shell does NOT mount NextIntlClientProvider, so view components import `messages/bg.json` directly. Same pattern for `vote-anomalies` view.

**Server actions pattern** (`src/app/(payload)/admin/views/attribution/actions.ts:1-91`):
```typescript
'use server';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { db } from '@/db';
import { sql, gte, lte, and, eq } from 'drizzle-orm';

export interface VoteAnomalyFilter {
  dateFrom: string;
  dateTo: string;
  triggerType?: string;
  status?: string;
}

export async function fetchVoteAnomalies(filter: VoteAnomalyFilter): Promise<VoteAnomalyAggregates> {
  await assertEditorOrAdmin();  // role re-check (defense-in-depth)
  // ... Drizzle aggregates from vote_anomalies + JOIN ideas for title
}

export async function fetchVoteEventForensic(anomalyId: string): Promise<VoteForensicRow[]> {
  await assertEditorOrAdmin();
  // ... per-vote rows from vote_events_log for the anomaly's idea_id within the trigger window
}
```

**Dashboard client component** (`src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx:1-222`):
- URL-state via `useRouter` + `useSearchParams` for filter persistence (lines 39-64).
- Tables rendered with inline styles (Payload theme tokens `var(--theme-elevation-100)`) — Phase 3 may swap to shadcn `Table` per UI-SPEC §S9 component inventory.
- CSV export via Server Action returning text → Blob → download (lines 66-82).

**Plan note:** UI-SPEC §S9 specifies shadcn `Table`, `Dialog`, `Alert`, `Badge` for the dashboard — the Phase 2.1 attribution dashboard uses inline styles. **Phase 3 should use shadcn primitives** (mirrors UI-SPEC) but keep the URL-state + Server Action wiring identical.

---

### `src/payload.config.ts` (modify — register Ideas + custom view)

**Self pattern** (lines 6-31):
```typescript
import { Users } from './collections/Users';
import { Newsletters } from './collections/Newsletters';
import { Ideas } from './collections/Ideas';   // Phase 3 NEW
import { CommunityChannels } from './globals/CommunityChannels';

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      views: {
        attribution: {
          Component: '/src/app/(payload)/admin/views/attribution/AttributionView#AttributionView',
          path: '/views/attribution',
        },
        // Phase 3 D-20 — NEW
        voteAnomalies: {
          Component: '/src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesView#VoteAnomaliesView',
          path: '/views/vote-anomalies',
        },
      },
    },
  },
  collections: [Users, Newsletters, Ideas],   // Phase 3 D-17 adds Ideas
  globals: [CommunityChannels],
  // ...
});
```

**Plan note (memory `project_payload_schema_constraint`):** Adding `Ideas` to collections triggers the Payload-side schema requirement — manual DDL via Neon SQL is required for the `ideas` table and any related Payload-managed schema (versions/relations). Drizzle migrations DO NOT manage Payload-managed tables. The plan must include a documented Neon-SQL DDL script.

---

### `messages/bg.json` (modify — add Phase 3 keys)

**Plan note:** Add namespaces per D-25 + UI-SPEC §"Copywriting Contract":
```json
{
  "idea": {
    "topic": {
      "taxes": "Данъци",
      "labor": "Трудово законодателство",
      "regulation": "Регулаторни режими",
      "financing": "Финансиране и кредит",
      "digitalization": "Цифровизация",
      "other": "Други"
    },
    "badge": { "featured": "Отбор на редактора" },
    "empty": {
      "platform": "Скоро ще започнем да публикуваме идеи...",
      "filter": "Нямаме идеи в избраните теми."
    }
  },
  "vote": {
    "approve": "Одобрявам",
    "reject": "Не одобрявам",
    "approvedByYou": "Одобрено от теб",
    "rejectedByYou": "Не одобрено от теб",
    "publicCount": "{n} одобряват",
    "publicPct": "{p}% одобрение",
    "memberRejectCount": "{n} не одобряват",
    "thresholdPending": "Гласуването е в ход — резултатите ще се покажат след първите {N} гласа.",
    "coolingIndicator": "Гласът ти ще се отчете след {hh}ч {mm}м",
    "changed": "Гласът ти е променен.",
    "retracted": "Гласът ти е оттеглен.",
    "undo": "Отмени",
    "captchaPrompt": "Моля потвърди, че не си бот.",
    "rateLimited": "Превишаваш допустимата честота на гласуване. Опитай отново след няколко минути."
  },
  "member": {
    "profile": {
      "heading": "Профил",
      "fields": { "fullName": "Име", "email": "Имейл", "registeredAt": "Регистриран на", "sector": "Сектор", "role": "Роля", "preferredChannel": "Предпочитан канал" },
      "links": { "preferences": "Настройки за известия", "exportData": "Изнеси моите данни" }
    },
    "activity": { "heading": "Моята активност", "empty": "Не си гласувал/а още." }
  },
  "admin": {
    "voteAnomalies": {
      "title": "Аномалии в гласуване",
      "subtitle": "Замразяването е ръчно решение — масов глас НЕ е масова злоупотреба",
      "denied": "Достъпът отказан.",
      "loginRequired": "Трябва да влезеш."
    }
  }
}
```

**Existing structure reference:** `messages/bg.json` is 582 lines, already contains `attribution.dashboard.*`, `member.preferences.*`, `member.welcome.*`, `email.*`, `errorsZod.*`. Phase 3 appends new top-level keys without restructuring.

---

### `tests/unit/voting-schema.test.ts` (test, schema-grep regression)

**Analog:** `tests/unit/attribution-schema.test.ts:1-62` — DIRECT MIRROR.

**Imports + structure** (`tests/unit/attribution-schema.test.ts:1-3`):
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Phase 3 D-15 / GDPR-09 — vote_events_log schema invariants', () => {
  it('vote_events_log schema contains no inet/raw_ip/ip_address column (D-15)', () => {
    const src = readFileSync('src/db/schema/voting.ts', 'utf8');
    const codeOnly = src.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(codeOnly).not.toMatch(/\binet\b/);
    expect(codeOnly).not.toMatch(/\braw_ip\b/);
    expect(codeOnly).not.toMatch(/\bip_address\b/);
    expect(codeOnly).not.toMatch(/\buser_agent\b/);  // only ua_hash allowed
  });

  it('votes table declares UNIQUE on (user_id, idea_id) — IDEA-04', () => {
    const src = readFileSync('src/db/schema/voting.ts', 'utf8');
    expect(src).toMatch(/unique.*user_id.*idea_id|user_id.*idea_id.*unique/i);
  });

  it('vote_events_log declares onDelete cascade FK to users + ideas', () => {
    const src = readFileSync('src/db/schema/voting.ts', 'utf8');
    expect(src).toMatch(/references\(\(\)\s*=>\s*users\.id,\s*\{\s*onDelete:\s*'cascade'\s*\}\)/);
    expect(src).toMatch(/references\(\(\)\s*=>\s*ideas\.id,\s*\{\s*onDelete:\s*'cascade'\s*\}\)/);
  });

  it('vote_events_log.user_id is NULLABLE (D-16 lawyer-flip path)', () => {
    const src = readFileSync('src/db/schema/voting.ts', 'utf8');
    // user_id column block must NOT contain .notNull()
    const userIdBlock = src.match(/user_id:\s*uuid[\s\S]*?references[^,]*\)/)?.[0] ?? '';
    expect(userIdBlock).not.toMatch(/\.notNull\(\)/);
  });

  it('IDEA_TOPICS export contains exactly 6 values (D-07)', () => {
    const src = readFileSync('src/db/schema/voting.ts', 'utf8');
    expect(src).toMatch(/IDEA_TOPICS\s*=\s*\[\s*'taxes',\s*'labor',\s*'regulation',\s*'financing',\s*'digitalization',\s*'other'\s*\]/);
  });

  it('schema barrel exports voting + moderation modules', () => {
    const src = readFileSync('src/db/schema/index.ts', 'utf8');
    expect(src).toMatch(/export \* from '\.\/voting'/);
    expect(src).toMatch(/export \* from '\.\/moderation'/);
  });
});
```

---

### `tests/unit/voting-actions.test.ts` (test, server-action grep + import)

**Analog:** `tests/unit/newsletter-server-actions.test.ts:1-80` — DIRECT MIRROR.

**Imports + role-gate assertion pattern** (`tests/unit/newsletter-server-actions.test.ts:1-29`):
```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const FILES = {
  cast: 'src/app/actions/cast-vote.ts',
  retract: 'src/app/actions/retract-vote.ts',
  undo: 'src/app/actions/undo-retract.ts',
  freeze: 'src/app/actions/freeze-idea.ts',
  exclude: 'src/app/actions/exclude-votes.ts',
} as const;

// Editor-only actions: freeze, exclude
describe('Phase 3 — editor-only Server Actions call assertEditorOrAdmin', () => {
  for (const [name, path] of Object.entries({ freeze: FILES.freeze, exclude: FILES.exclude })) {
    it(`${name}.ts imports assertEditorOrAdmin from @/lib/auth/role-gate`, () => {
      const src = readFileSync(path, 'utf8');
      expect(src).toMatch(/import\s*\{\s*assertEditorOrAdmin\s*\}\s*from\s+['"]@\/lib\/auth\/role-gate['"]/);
    });
    it(`${name}.ts calls assertEditorOrAdmin in the function body`, () => {
      const src = readFileSync(path, 'utf8');
      expect(src).toMatch(/await\s+assertEditorOrAdmin\(\)/);
    });
  }
});

describe('Phase 3 — every Server Action declares "use server"', () => {
  for (const [name, path] of Object.entries(FILES)) {
    it(`${name}.ts declares 'use server'`, () => {
      const src = readFileSync(path, 'utf8');
      expect(src.split('\n').slice(0, 5).join('\n')).toMatch(/['"]use server['"]/);
    });
  }
});

// Pitfall 7 lock — vote/change/retract/undo MUST NOT bust unstable_cache
describe('Phase 3 D-03 / Pitfall 7 — voting actions never bust the count cache', () => {
  for (const path of [FILES.cast, FILES.retract, FILES.undo]) {
    it(`${path} does not import revalidatePath / revalidateTag`, () => {
      const src = readFileSync(path, 'utf8');
      expect(src).not.toMatch(/revalidatePath|revalidateTag/);
    });
  }
});
```

---

### `tests/integration/voting-concurrent.test.ts` (test, concurrent-INSERT race)

**Plan note (NO ANALOG):** Per RESEARCH §"Concurrent-INSERT Race Test (CRITICAL for IDEA-04)":
```typescript
// Two concurrent INSERTs against votes(user_id, idea_id) must result in exactly
// one row + one DUPLICATE_KEY violation. Tests the UNIQUE constraint at DB level.

it('concurrent castVote against same idea results in 1 vote row, 1 unique violation', async () => {
  await db.insert(users).values({ /* ... */ });
  await db.insert(ideas).values({ /* ... */ });

  const [r1, r2] = await Promise.allSettled([
    castVote({ ideaId, choice: 'approve' }),
    castVote({ ideaId, choice: 'reject' }),
  ]);

  // Exactly one votes row exists
  const rows = await db.select().from(votes).where(eq(votes.idea_id, ideaId));
  expect(rows).toHaveLength(1);

  // Exactly two vote_events_log rows exist (cast + change OR cast + cast-rejected-by-DB)
  const events = await db.select().from(vote_events_log).where(eq(vote_events_log.idea_id, ideaId));
  expect(events.length).toBeGreaterThanOrEqual(1);
});
```

---

## Shared Patterns (cross-cutting concerns)

### Authentication + Role Gate

**Source:** `src/lib/auth/role-gate.ts:14-22` (assertEditorOrAdmin), `src/lib/auth.ts:31-71` (auth() helper).

**Apply to:**
- All editor Server Actions (`freeze-idea.ts`, `exclude-votes.ts`, anomaly dashboard actions): call `await assertEditorOrAdmin()` at top.
- All member Server Actions (`cast-vote.ts`, `retract-vote.ts`, `undo-retract.ts`): call `const session = await auth(); const userId = (session?.user as { id?: string } | undefined)?.id; if (!userId) return { ok: false, reason: 'unauthenticated' };`
- Payload Ideas collection access (`Ideas.ts:34-37`): use the same `isEditorOrAdmin` predicate as Newsletters.
- Payload custom view (`VoteAnomaliesView.tsx`): role gate inline as in `AttributionView.tsx:48-63`.

### Error Handling (Server Actions)

**Source:** `src/app/actions/save-preferences.ts:36-69` — discriminated-union return type.

**Apply to:** All Server Actions. Pattern:
```typescript
export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; reason: 'unauthenticated' | 'invalid_input' | 'rate_limited' | 'turnstile_required' | 'captcha_failed' | 'db_error' };
```

**Logging on failure** (`src/app/actions/save-preferences.ts:64-68`):
```typescript
} catch (err) {
  logger.warn(
    { user_id: userId, err: err instanceof Error ? err.message : String(err) },
    'voting.cast.db_error',
  );
  return { ok: false, reason: 'db_error' };
}
```
**Plan note:** Logger uses `logger.warn` for expected failures (db error inside transaction), `logger.error` only for unexpected exceptions. Pino REDACT covers `email`, `ip`, `name`, `full_name` already (`src/lib/logger.ts:3-14`); voting work needs no additional REDACT keys.

### Validation (Zod + i18n)

**Source:** `src/lib/zod-i18n.ts:1-29` — pre-mapped Bulgarian error messages.

**Apply to:** All Server Action input validation:
```typescript
import { z } from '@/lib/zod-i18n';   // NOT bare 'zod'
```
**Reason:** `messages/bg.json#errorsZod.*` provides Bulgarian error strings (`invalidType`, `required`, `tooLong`, `invalidEmail`, etc.). The custom errorMap in `zod-i18n.ts` wires Zod issue codes to the Bulgarian strings.

### i18n Loading (server vs Payload-admin vs background-worker)

| Context | API | Source |
|---------|-----|--------|
| Server Component (in App Router request scope) | `import { getTranslations } from 'next-intl/server'; const t = await getTranslations('namespace');` | `src/app/(frontend)/member/page.tsx:3, 18` |
| Client Component | `import { useTranslations } from 'next-intl'; const t = useTranslations('namespace');` | `src/components/preferences/NewsletterToggleRow.tsx:7, 21` |
| Payload admin custom component (`'use client'` Payload-mounted) | `import { getAdminT } from '@/lib/email/i18n-direct'; const t = getAdminT('admin.newsletters');` — **NEVER** `useTranslations` (no provider in admin shell) | `src/components/payload/NewsletterComposer.tsx:12, 30` |
| Payload custom view (Server Component, but no NextIntlClientProvider) | `import bg from '../../../../../../messages/bg.json'; const t = (bg as ...).attribution.dashboard;` | `src/app/(payload)/admin/views/attribution/AttributionView.tsx:4, 16` |
| Background worker (BullMQ, not in request scope) | Custom `loadT` reading messages directly | `src/lib/email/worker.tsx:36-52` |

**Plan note:** Phase 3 voting code spans all 5 contexts. Use the appropriate API per location.

### Pino Structured Logging (No PII)

**Source:** `src/lib/logger.ts:3-14` — REDACT list.

**Apply to:** Every voting log call MUST NOT include `email`, `ip` (raw), `full_name`, `name`, `raw_ip`, `to`, `recipient_email`. Always pass user_id, idea_id, action, trigger_type, count.

**Anti-pattern (RESEARCH §Pitfall 3):** The HMAC helper (`src/lib/voting/hmac.ts`) MUST NOT log inputs. Test asserts no log call inside hmac.ts contains the raw value.

### Sentry Tagging (No PII)

**Source:** RESEARCH §"Sentry Tag Schema" + Phase 1 D-21.

**Apply to:** `vote_velocity_anomaly` Sentry events. Tags allowed: `idea_id`, `trigger_type`, `count`. NEVER include user_id (Phase 1 D-21 — user_id is internally PII when joined to other tables, even though it's a UUID).

### BullMQ Job Enqueue (idempotent, with retry policy)

**Source:** `src/lib/email/queue.ts:53-109` — `addEmailJob` with attempts/backoff/removeOn{Complete,Fail}.

**Apply to:** All anomaly emails go through `addEmailJob({ kind: 'vote-anomaly-alert', anomalyId, ideaId })`. Retry policy inherited (5 attempts, exponential backoff from 5s, removeOnComplete 24h, removeOnFail 7d).

**Idempotency note:** Newsletter blasts use `jobId: \`newsletter-\${newsletterId}\`` for deterministic dedup (lines 104-107). Anomaly emails should use `jobId: \`anomaly-\${anomalyId}\`` to prevent duplicate emails on worker re-process.

### Worker Startup-Time Env Validation

**Source:** Phase 1 D-21 + Phase 5 Plan 05-14 (`tests/unit/start-worker-env.test.ts`).

**Apply to:**
- `VOTE_AUDIT_HMAC_SECRET` — assert non-empty at worker startup; structured log + exit on miss.
- `VOTE_COUNTABLE_INTERVAL` — regex match `/^\d+ (hours|days)$/`; structured log + exit on miss/invalid.
- `IDEA_REVEAL_THRESHOLD` — parse to int; structured log + exit if NaN or <1.
- `VOTE_RATE_SOFT`, `VOTE_RATE_HARD` — parse to int; assert SOFT < HARD.
- `ANOMALY_PER_IDEA_N1`, `ANOMALY_PER_IDEA_T1_MIN`, `ANOMALY_SUBNET_N2`, `ANOMALY_SUBNET_T2_MIN`, `ANOMALY_FRESH_PCT`, `ANOMALY_FRESH_WINDOW_N3` — parse to int with sensible defaults if missing (RESEARCH §1).

**Test mirror:** `tests/unit/start-worker-eviction-policy.test.ts` shape — boot-time assertion + log capture.

---

## No Analog Found

Files with no close match in the codebase (planner uses RESEARCH.md patterns):

| File | Role | Data Flow | Reason | Reference |
|------|------|-----------|--------|-----------|
| `src/lib/voting/slug.ts` | utility | pure transform | No transliteration helper exists in repo. Use `transliteration@2.6.1` per RESEARCH §"Bulgarian Streamlined Slug Helper" | RESEARCH lines 798-866 |
| `src/lib/voting/cache.ts` | utility | server-fetch cache | No `unstable_cache` usage exists yet. Phase 3 introduces it. | RESEARCH §"Cache Implementation" lines 1022-1034 |
| `src/components/idea/VoteCountDisplay.tsx` | component (Server) | role-branched render | First instance of viewer-role-conditional rendering. Public/member/editor branches per D-02. | UI-SPEC §S4 + RESEARCH §"Anti-Patterns" |
| `src/components/idea/CatalogPagination.tsx` | component (Server) | URL-state | First page-based pagination component. Use shadcn `Pagination`. | UI-SPEC §"Component Inventory" |
| `src/components/member/CoolingIndicator.tsx` | component (Client) | timer-driven | First client-side countdown component. `setInterval` + `aria-live` | UI-SPEC §S5 |
| `tests/integration/voting-concurrent.test.ts` | test | concurrent-INSERT race | First concurrent-DB-test in repo. Use `Promise.allSettled` against the unique constraint. | RESEARCH §"Concurrent-INSERT Race Test" lines 1313-1336 |

---

## Metadata

**Analog search scope:**
- `/Users/emoadm/projects/SMBsite/src/collections/`
- `/Users/emoadm/projects/SMBsite/src/db/schema/`
- `/Users/emoadm/projects/SMBsite/src/lib/`
- `/Users/emoadm/projects/SMBsite/src/lib/auth/`
- `/Users/emoadm/projects/SMBsite/src/lib/email/`
- `/Users/emoadm/projects/SMBsite/src/lib/newsletter/`
- `/Users/emoadm/projects/SMBsite/src/lib/unsubscribe/`
- `/Users/emoadm/projects/SMBsite/src/lib/attribution/`
- `/Users/emoadm/projects/SMBsite/src/components/member/`
- `/Users/emoadm/projects/SMBsite/src/components/payload/`
- `/Users/emoadm/projects/SMBsite/src/components/preferences/`
- `/Users/emoadm/projects/SMBsite/src/app/actions/`
- `/Users/emoadm/projects/SMBsite/src/app/(frontend)/member/`
- `/Users/emoadm/projects/SMBsite/src/app/(payload)/admin/views/attribution/`
- `/Users/emoadm/projects/SMBsite/tests/unit/`

**Files scanned:** 23 source files + 5 test files = 28 files read in pattern extraction.

**Pattern extraction date:** 2026-05-07

**Project conventions verified against:**
- `CLAUDE.md` — stack lock + GDPR component map
- Memory `project_payload_schema_constraint` — manual DDL via Neon SQL for Payload schema
- Memory `project_sender_domain` — chastnik.eu (transactional + newsletter sender; not directly used by Phase 3 actions but inherited via `addEmailJob`)
- Phase 1 D-13 (consents append-only), D-19 (BullMQ queue), D-21 (PII-free Sentry), D-27 (next-intl)
- Phase 2.1 D-19 (no raw IP in Postgres) / GDPR-09
- Phase 5 D-01 (Lexical allowed-blocks), D-25 (assertEditorOrAdmin)

---

## PATTERN MAPPING COMPLETE

**Phase:** 3 - Idea Catalog + Voting
**Files classified:** 35
**Analogs found:** 31 / 35 (89% coverage)

### Coverage
- Files with exact analog: 18
- Files with role-match analog: 13
- Files with no analog (use RESEARCH.md / UI-SPEC.md): 6
- Files modifying existing source: 4 (`payload.config.ts`, `messages/bg.json`, `src/db/schema/index.ts`, `src/lib/email/queue.ts`)

### Key Patterns Identified

1. **Newsletters.ts is the direct template for Ideas.ts** — Lexical allowed-blocks, `isEditorOrAdmin` access, importMap explicit-string admin component registration, `beforeChange` hook for derived fields. Phase 3 deviates only on `read` access (public catalog reads via Drizzle, not Payload REST).
2. **Two-table audit pattern** — `consents` (append-only, restrict-on-delete) is the template for `vote_events_log` and `moderation_log`. The `votes` table is the new "current state" cousin with UNIQUE on `(user_id, idea_id)` and cascade-on-delete.
3. **HMAC + no-raw-IP discipline is locked at schema-grep level** — `tests/unit/attribution-schema.test.ts` is the direct mirror for `tests/unit/voting-schema.test.ts`. Same predicate: code-only grep MUST NOT contain `inet`, `raw_ip`, `ip_address`, `user_agent`.
4. **Server Action template pipeline** — `register.ts` is the canonical full pipeline (Zod → rate-limit → Turnstile → DB transaction → enqueue). `cast-vote.ts` is a smaller variant; `freeze-idea.ts` and `exclude-votes.ts` are editor-only variants that swap the auth gate to `assertEditorOrAdmin`.
5. **`/admin/views/attribution/` is the direct template for `/admin/views/vote-anomalies/`** — three-file shape (View / Dashboard / actions), inline role gate, URL-state filter, Server Action aggregates with `assertEditorOrAdmin` defense-in-depth, CSV export pattern.
6. **i18n discipline is context-dependent** — 5 distinct loading patterns based on whether code runs in Server Component / Client Component / Payload admin custom component / Payload custom view / BullMQ worker. Plan must use the right API per file.
7. **Memory `project_payload_schema_constraint` is load-bearing** — Ideas collection requires manual Neon SQL DDL. Drizzle tables (`votes`, `vote_events_log`, `moderation_log`, `vote_anomalies`) follow normal Drizzle pipeline.

### File Created
`/Users/emoadm/projects/SMBsite/.planning/phases/03-idea-catalog-voting/03-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns + line ranges + verbatim code excerpts in PLAN.md files. Each new file has a clear template; cross-cutting conventions (auth, error handling, i18n, logging, Sentry tagging, BullMQ enqueue, env validation) are listed in §"Shared Patterns" with file/line citations.
