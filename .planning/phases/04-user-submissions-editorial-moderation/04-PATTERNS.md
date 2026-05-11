# Phase 4: User Submissions + Editorial Moderation — Pattern Map

**Mapped:** 2026-05-10
**Files analyzed:** 22 new/modified files
**Analogs found:** 21 / 22

---

## Critical Architecture Finding: Two Separate User Tables

Before any pattern is applied, the planner MUST understand this architectural reality:

| Table | Schema file | Managed by | `role` column values | Purpose |
|-------|-------------|-----------|----------------------|---------|
| `users` | `src/db/schema/auth.ts` | Drizzle + Auth.js | `owner`, `manager`, `employee`, `other` (D-10) | Application members (front-end auth) |
| `admin_users` | Payload `Users` collection (`src/collections/Users.ts`) | Payload CMS | `admin`, `editor` | Editorial users (admin panel login only) |

**Phase 4 D-A2 declares a new `platform_role` column** (or equivalent) on the application `users` table to hold `editor` / `super_editor` — this is DISTINCT from both `users.role` (business role) and the Payload `admin_users.role` (Payload admin role). The existing `users.role` column cannot be reused — it already holds business-context data (owner/manager/etc). Research Pattern 7 (`assertSuperEditor`) correctly reads from `users` via Drizzle, not from Payload auth.

**Do NOT** put editorial role gating through Payload's `admin_users` table — that table is a separate identity from the `users` table. The Phase 4 two-tier role (`editor` / `super_editor`) lives on the application `users` table under a new column (call it `platform_role text DEFAULT NULL`).

**The AttributionView role gate is a PARTIAL anti-pattern for Phase 4.** It checks `(user as { role?: string }).role` against `['admin', 'editor']` — this is the *Payload admin user's* role, not the application user's `platform_role`. The moderation queue view registers in Payload admin and therefore uses the same Payload user check for the admin-panel-level guard. But the submission Server Actions (`lib/submissions/admin-actions.ts`) gate using `assertEditorOrAdmin` → which calls `payload.auth()` → which reads from `admin_users`. For those to work, editors must also exist in `admin_users`. The planner must reconcile this dual-identity in the ops runbook.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/db/schema/submissions.ts` | model | CRUD | `src/db/schema/attribution.ts` + `src/db/schema/consents.ts` | role-match |
| `src/collections/Ideas.ts` | config | CRUD | `src/collections/Newsletters.ts` | exact |
| `src/collections/Pages.ts` | config | CRUD | `src/collections/Newsletters.ts` | role-match |
| `messages/bg.json` (additions) | config | — | `messages/bg.json` existing structure | exact |
| `src/lib/submissions/zod.ts` | utility | transform | `src/app/actions/register.ts` (schema block lines 17–53) | role-match |
| `src/lib/submissions/actions.ts` | service | request-response | `src/app/actions/register.ts` | exact |
| `src/lib/submissions/admin-actions.ts` | service | request-response | `src/app/(payload)/admin/views/attribution/actions.ts` | exact |
| `src/lib/auth/role-gate.ts` (extend) | utility | request-response | `src/lib/auth/role-gate.ts` existing | exact |
| `src/app/(frontend)/member/layout.tsx` (extend) | middleware | request-response | `src/app/(frontend)/member/layout.tsx` existing | exact |
| `src/app/(frontend)/предложения/page.tsx` | component | CRUD | `src/app/(frontend)/community/page.tsx` | role-match |
| `src/app/(frontend)/проблеми/page.tsx` | component | CRUD | `src/app/(frontend)/community/page.tsx` | role-match |
| `src/app/(frontend)/member/предложи/page.tsx` | component | request-response | `src/app/(frontend)/(auth)/register/page.tsx` | exact |
| `src/app/(frontend)/member/предложения/page.tsx` | component | CRUD | `src/app/(frontend)/member/page.tsx` | role-match |
| `src/app/(frontend)/member/сигнализирай/page.tsx` | component | request-response | `src/app/(frontend)/(auth)/register/page.tsx` | role-match |
| `src/app/(frontend)/member/сигнали/page.tsx` | component | CRUD | `src/app/(frontend)/member/page.tsx` | role-match |
| `src/components/proposals/ProposalCard.tsx` | component | CRUD | `src/components/member/MemberWelcomeBanner.tsx` | role-match |
| `src/components/submissions/SubmissionStatusCard.tsx` | component | CRUD | `src/components/member/MemberWelcomeBanner.tsx` | role-match |
| `src/components/forms/ProposalForm.tsx` | component | request-response | `src/components/forms/RegistrationForm.tsx` | exact |
| `src/components/forms/ProblemReportForm.tsx` | component | request-response | `src/components/forms/RegistrationForm.tsx` | exact |
| `src/components/problems/OblastMap.tsx` | component | transform | `src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx` | role-match |
| `src/components/problems/OblastBreakdownTable.tsx` | component | CRUD | `src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx` | role-match |
| `src/app/(payload)/admin/views/moderation-queue/ModerationQueueView.tsx` | component | request-response | `src/app/(payload)/admin/views/attribution/AttributionView.tsx` | exact |
| `src/app/(payload)/admin/views/moderation-queue/QueueTable.tsx` | component | CRUD | `src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx` | exact |
| `src/app/(payload)/admin/views/moderation-queue/ReviewDialog.tsx` | component | request-response | `src/components/forms/RegistrationForm.tsx` | role-match |
| `src/app/(payload)/admin/importMap.js` (extend) | config | — | `src/app/(payload)/admin/importMap.js` existing | exact |
| `src/payload.config.ts` (extend) | config | — | `src/payload.config.ts` existing | exact |

---

## Pattern Assignments

### `src/db/schema/submissions.ts` (model, CRUD)

**Analog 1:** `src/db/schema/attribution.ts`
**Analog 2:** `src/db/schema/consents.ts`

**Imports pattern** — copy from `src/db/schema/attribution.ts` lines 1–2:
```typescript
import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { users } from './auth';
```

**Table declaration pattern** — copy from `src/db/schema/attribution.ts` lines 21–64 (structure only, not columns):
```typescript
// All enum-shaped values stored as `text(...)` (project convention from
// src/db/schema/auth.ts lines 16-17 sector/role). NEVER use pgEnum.
export const submissions = pgTable(
  'submissions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    submitter_id: uuid('submitter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    kind: text('kind').notNull(),       // 'proposal' | 'problem'
    status: text('status').notNull().default('pending'), // 'pending' | 'approved' | 'rejected'
    // ... columns ...
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    submitterIdx: index('submissions_submitter_idx').on(t.submitter_id),
    statusIdx: index('submissions_status_idx').on(t.status),
    kindIdx: index('submissions_kind_idx').on(t.kind),
  }),
);
```

**Append-only enforcement pattern** — copy from `src/db/schema/consents.ts` header comment (lines 16–18):
```typescript
// D-A1: append-only for moderation_log. NEVER UPDATE or DELETE rows from the application.
// Enforced at DB layer: REVOKE UPDATE, DELETE ON TABLE moderation_log FROM <app_db_user>;
// Applied via Neon SQL editor alongside CREATE TABLE DDL (not via payload migrate).
export const moderation_log = pgTable(
  'moderation_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    action: text('action').notNull(),       // enum: 'submission_approve' | 'submission_reject' | 'user_suspend' | ...
    actor_user_id: uuid('actor_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
    target_kind: text('target_kind').notNull(), // 'submission' | 'user'
    target_id: uuid('target_id'),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    actorIdx: index('moderation_log_actor_idx').on(t.actor_user_id),
    targetIdx: index('moderation_log_target_idx').on(t.target_id),
    createdIdx: index('moderation_log_created_idx').on(t.created_at),
  }),
);
```

**Schema index export** — update `src/db/schema/index.ts` to add:
```typescript
export * from './submissions';
```

**Anti-patterns:**
- Do NOT use `pgEnum` for `kind`, `status`, or `action` — project convention is `text` with Zod enforcement at API boundary (verified in `auth.ts` line 3 comment and `attribution.ts` line 21 comment)
- Do NOT add moderation_log to a Payload collection (prevents DB-level REVOKE protection)
- Do NOT run `payload migrate` — apply DDL via Neon SQL editor

---

### `src/collections/Ideas.ts` (config, CRUD)

**Analog:** `src/collections/Newsletters.ts`

**Imports pattern** (lines 1–13):
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

**Access control pattern** — copy from `src/collections/Newsletters.ts` lines 34–37:
```typescript
const isEditorOrAdmin = ({ req }: { req: { user?: unknown } }): boolean => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  return ['admin', 'editor'].includes(role);
};
```
**Extend for super_editor:** `return ['admin', 'editor', 'super_editor'].includes(role);`

Note: this `role` is the Payload `admin_users.role` — it checks Payload admin identity, not the application `users.platform_role`. Both identities must be in sync via the ops runbook.

**Collection config pattern** (lines 39–58):
```typescript
export const Ideas: CollectionConfig = {
  slug: 'ideas',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'topic', 'status'],
    description: 'Политически идеи — EDIT-02. Гласуването се добавя при реактивирането на Фаза 3.',
  },
  access: {
    read: () => true,           // public read for approved ideas
    create: isEditorOrSuperEditor,
    update: isEditorOrSuperEditor,
    delete: isEditorOrSuperEditor,
  },
  fields: [ /* text fields, no pgEnum */ ],
};
```

**Registration in payload.config.ts** — mirror lines 6–7 and 30:
```typescript
import { Ideas } from './collections/Ideas';
// ...
collections: [Users, Newsletters, Ideas],
```

**importMap.js registration** — if Ideas adds a custom component, mirror lines 39–40 and 59–60 of `importMap.js`:
```typescript
import { MyComponent as MyComponent_ideas } from '@/collections/...'
// in exportMap object:
"/src/collections/..#MyComponent": MyComponent_ideas,
```

**Anti-patterns:**
- Do NOT use `pgEnum` for status or topic fields in Payload collection fields either — use `type: 'select'` (consistent with Newsletters.ts pattern)
- Phase 4 Ideas collection has no voting fields — do not add `votes_open_at` or `votable` now; columns must be additive-only ALTER when Phase 3 re-activates

---

### `src/collections/Pages.ts` (config, CRUD — EDIT-03 agitation pages)

**Analog:** `src/collections/Newsletters.ts`

Same access control pattern as Ideas.ts. Fields: title (text), slug (text, unique), body (richText with same Lexical features as Newsletters), status ('draft' | 'published'). Public read only when status='published' (`read: ({ doc }) => doc?.status === 'published'`).

---

### `messages/bg.json` additions (config)

**Analog:** `messages/bg.json` existing structure

**Namespace pattern** — copy the nesting convention from existing keys. Phase 4 adds under these namespaces (must be locked before any JSX references them — D-25 pattern):

```json
{
  "submission": {
    "proposals": {
      "pageTitle": "Предложения от общността",
      "pageLead": "Одобрените предложения на членовете на коалицията.",
      "votingSoon": "Гласуването по предложенията предстои. Следете за обновления.",
      "emptyHeading": "Предложенията скоро ще се появят тук.",
      "emptyBody": "Бъди първият — изпрати предложение за политическо решение.",
      "emptyCta": "Предложи идея",
      "attribution": "Член на коалицията",
      "submitTitle": "Подай предложение",
      "submitCta": "Изпрати предложение",
      "fields": { "title": "Заглавие", "body": "Описание", "topic": "Тема" }
    },
    "problems": {
      "pageTitle": "Сигнали за проблеми",
      "pageLead": "Агрегирани сигнали на членовете по области.",
      "attribution": "Анонимен сигнал",
      "submitTitle": "Подай сигнал",
      "submitCta": "Изпрати сигнал",
      "fields": { "body": "Описание на проблема", "level": "Ниво", "oblast": "Област" },
      "level": { "local": "Местен", "national": "Национален" }
    },
    "status": {
      "pending": "Изчаква преглед",
      "approved": "Одобрено",
      "rejected": "Отхвърлено"
    },
    "errors": {
      "rateLimit": "Твърде много опити. Опитайте по-късно.",
      "captchaFailed": "Проверката за бот не премина. Презаредете страницата.",
      "validation": "Моля, попълнете всички задължителни полета."
    }
  },
  "admin": {
    "queue": {
      "pageTitle": "Опашка за модерация",
      "denied": "Нямате права за достъп до тази страница.",
      "loginRequired": "Необходим е вход в системата.",
      "tabs": { "proposals": "Предложения", "problems": "Сигнали", "dsa": "DSA сигнали" },
      "columns": { "submitter": "Подател", "topic": "Тема", "status": "Статус", "submitted": "Дата" },
      "actions": { "approve": "Одобри", "reject": "Отхвърли", "suspend": "Суспендирай" },
      "dialog": {
        "rejectTitle": "Отхвърли предложение",
        "rejectNotePlaceholder": "Причина за отхвърляне (задължително)...",
        "suspendTitle": "Суспендирай акаунт",
        "confirm": "Потвърди",
        "dismiss": "Отказ"
      },
      "empty": "Няма чакащи за преглед."
    },
    "suspended": {
      "pageTitle": "Суспендиран акаунт",
      "body": "Акаунтът ви е временно суспендиран. Свържете се с екипа за повече информация."
    }
  },
  "email": {
    "submissionStatus": {
      "approved": {
        "subject": "Вашето предложение беше одобрено",
        "body": "Предложението ви „{title}" беше прегледано и одобрено."
      },
      "rejected": {
        "subject": "Вашето предложение не беше одобрено",
        "body": "Предложението ви „{title}" не беше одобрено. Бележка: {note}"
      }
    }
  }
}
```

**Anti-patterns:**
- Do NOT add keys before this namespace block is merged — all JSX and Server Actions must reference keys that already exist in bg.json (D-25 Wave 0 pattern)
- Do NOT use variants of "Анонимен сигнал" or "Член на коалицията" — these two strings are locked by D-C1

---

### `src/lib/submissions/zod.ts` (utility, transform)

**Analog:** `src/app/actions/register.ts` (lines 17–53)

**Schema pattern:**
```typescript
import { z } from '@/lib/zod-i18n'; // NOT raw 'zod' — use the project's i18n-aware import

const TopicEnum = z.enum(['economy', 'labor', 'taxes', 'regulation', 'other']);

const LevelEnum = z.enum(['local', 'national']);

export const proposalSchema = z.object({
  title: z.string().min(5).max(300),
  body: z.string().min(20).max(5000),
  topic: TopicEnum,
  turnstileToken: z.string().min(1),   // same field name as registration
});

export const problemReportSchema = z.object({
  body: z.string().min(20).max(5000),
  level: LevelEnum,
  topic: TopicEnum,
  oblast: z.string().optional(),       // required when level='local', enforced by .superRefine()
  turnstileToken: z.string().min(1),
});

// Admin action schemas
export const rejectSchema = z.object({
  submissionId: z.string().uuid(),
  note: z.string().min(5),             // non-empty note required on reject (EDIT-05)
});

export const approveSchema = z.object({
  submissionId: z.string().uuid(),
});

export const suspendSchema = z.object({
  userId: z.string().uuid(),
  note: z.string().min(5),
});
```

**Anti-patterns:**
- Do NOT import raw `zod` — always use `@/lib/zod-i18n` (project convention from register.ts line 5)

---

### `src/lib/submissions/actions.ts` (service, request-response)

**Analog:** `src/app/actions/register.ts`

**Top-level pattern** (register.ts lines 1–16 + 61–100):
```typescript
'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { proposalSchema, problemReportSchema } from './zod';
import { verifyTurnstile } from '@/lib/turnstile';
import { getClientIp } from '@/lib/ip';
// Rate limit: add new submission-specific limiters to src/lib/rate-limit.ts
// following the existing Ratelimit.slidingWindow() pattern (rate-limit.ts lines 24-53)

export type SubmitResult =
  | { ok: true }
  | { ok: false; error?: string; fieldErrors?: Record<string, string[]> };
```

**Auth + rate-limit + Turnstile guard** — mirror register.ts lines 64–93:
```typescript
export async function submitProposal(
  _prevState: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  // 1. Session check — must be logged in AND email verified AND not suspended
  const session = await auth();
  if (!session?.user) return { ok: false, error: 'submission.errors.rateLimit' }; // generic
  const user = session.user as { id: string; emailVerified?: Date | null };
  if (!user.emailVerified) return { ok: false, error: 'submission.errors.validation' };

  // 2. Suspended check via DB (session does NOT embed status — Pattern 6)
  const [dbUser] = await db.select({ status: users.status, platform_role: users.platform_role })
    .from(users).where(eq(users.id, user.id)).limit(1);
  if (dbUser?.status === 'suspended') return { ok: false, error: 'submission.errors.validation' };

  // 3. IP-based rate limit (mirror rate-limit.ts pattern)
  const h = await headers();
  const ip = getClientIp(h);
  if (ip) {
    const limitResult = await checkSubmissionRateLimit(ip, user.id);
    if (!limitResult.success) return { ok: false, error: 'submission.errors.rateLimit' };
  }

  // 4. Zod parse (register.ts lines 84-88 pattern)
  const raw = Object.fromEntries(formData.entries());
  const parsed = proposalSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // 5. Turnstile (register.ts lines 91-92 pattern)
  const tr = await verifyTurnstile(parsed.data.turnstileToken, ip ?? undefined);
  if (!tr.ok) return { ok: false, error: 'submission.errors.captchaFailed' };

  // 6. DB insert
  await db.insert(submissions).values({
    id: crypto.randomUUID(),
    submitter_id: user.id,
    kind: 'proposal',
    status: 'pending',
    title: parsed.data.title,
    body: parsed.data.body,
    topic: parsed.data.topic,
    created_at: new Date(),
  });

  return { ok: true };
}
```

**Anti-patterns:**
- Do NOT import `@/db` or `@/lib/auth` in `middleware.ts` — only in Node.js runtime (server actions, RSC layouts). See research Pitfall 2.
- Do NOT embed `status` in the session token (acceptable tradeoff per Pattern 6 — document it, don't silence it)

---

### `src/lib/submissions/admin-actions.ts` (service, request-response)

**Analog:** `src/app/(payload)/admin/views/attribution/actions.ts`

**Top-level pattern** (attribution/actions.ts lines 1–11):
```typescript
'use server';

import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { db } from '@/db';
import { submissions, moderation_log, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
```

**Role-gated action pattern** (attribution/actions.ts lines 42–44):
```typescript
export async function approveSubmission(input: { submissionId: string }): Promise<void> {
  await assertEditorOrAdmin();   // throws Forbidden if not editor/admin/super_editor
  const parsed = approveSchema.safeParse(input);
  if (!parsed.success) throw new Error('Invalid input');

  await db.transaction(async (tx) => {
    await tx.update(submissions)
      .set({ status: 'approved', approved_at: new Date() })
      .where(eq(submissions.id, parsed.data.submissionId));
    await tx.insert(moderation_log).values({
      id: crypto.randomUUID(),
      action: 'submission_approve',
      actor_user_id: /* get from payload.auth() */,
      target_kind: 'submission',
      target_id: parsed.data.submissionId,
      created_at: new Date(),
    });
  });
}
```

**Aggregate query pattern** — copy from attribution/actions.ts lines 46–58 (groupBy + sql<number>):
```typescript
// Heat-map aggregate (D-D2 small-N suppression at DB layer)
export async function fetchProblemHeatmap() {
  await assertEditorOrAdmin(); // or public — planner decides
  return db
    .select({
      oblast: submissions.oblast,
      count: sql<number>`count(*)::int`,
    })
    .from(submissions)
    .where(/* kind='problem' AND status='approved' AND level='local' */)
    .groupBy(submissions.oblast)
    .having(sql`count(*) >= 5`)   // D-D2: N<5 suppression
    .orderBy(sql`count(*) desc`);
}
```

---

### `src/lib/auth/role-gate.ts` (extend existing utility)

**Analog:** `src/lib/auth/role-gate.ts` (existing file, lines 1–22)

**Existing pattern to preserve** (lines 14–22):
```typescript
export async function assertEditorOrAdmin(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  if (!['admin', 'editor'].includes(role)) {
    throw new Error('Forbidden — editor or admin role required');
  }
}
```

**New `assertSuperEditor` function to add** (mirror exact structure):
```typescript
export async function assertSuperEditor(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  if (!['admin', 'super_editor'].includes(role)) {
    throw new Error('Forbidden — super_editor role required');
  }
}
```

**"Last super_editor" guard** — add to same file (uses Drizzle for count):
```typescript
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function assertNotLastSuperEditor(targetUserId: string): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.platform_role, 'super_editor'));
  if (count <= 1) {
    throw new Error('Cannot demote the last super_editor');
  }
}
```

**Update `assertEditorOrAdmin` to include super_editor:**
```typescript
if (!['admin', 'editor', 'super_editor'].includes(role)) {
```

**Anti-patterns:**
- The `role` read in `role-gate.ts` is the Payload admin user's role (from `admin_users` table via `payload.auth()`), NOT the application `users.platform_role`. Keep these two checks logically separate — `assertEditorOrAdmin` checks Payload admin identity; `assertNotSuspended(userId)` checks application `users.status`

---

### `src/app/(frontend)/member/layout.tsx` (extend existing middleware)

**Analog:** `src/app/(frontend)/member/layout.tsx` (existing file, lines 1–13)

**Existing pattern** (lines 1–13):
```typescript
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect('/login?next=/member');
  }
  if (!(session.user as { emailVerified?: Date | null }).emailVerified) {
    redirect('/auth/otp');
  }
  return <>{children}</>;
}
```

**Phase 4 extension** — add DB status check after emailVerified check (Pattern 6 from research):
```typescript
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// After existing emailVerified check:
const userId = (session.user as { id: string }).id;
const [dbUser] = await db
  .select({ status: users.status })
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);

if (dbUser?.status === 'suspended') {
  redirect('/suspended');
}
```

**Anti-patterns:**
- Do NOT add this check to `middleware.ts` — Edge runtime cannot import `@/db` or `@/lib/auth` (verified: middleware.ts comment explicitly forbids it, research Pitfall 2)
- Session token does NOT embed `status` — always query DB live to avoid stale-cache suspension bypass

---

### `src/app/(frontend)/предложения/page.tsx` (component, CRUD — public)

**Analog:** `src/app/(frontend)/community/page.tsx`

**Page scaffold pattern** (community/page.tsx lines 1–27):
```typescript
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { submissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { MainContainer } from '@/components/layout/MainContainer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ProposalCard } from '@/components/proposals/ProposalCard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('submission.proposals');
  return { title: t('pageTitle') };
}

export default async function ProposalsPage() {
  const t = await getTranslations('submission.proposals');
  // Public SSR — no session check (anonymous users can view approved proposals)
  const proposals = await db
    .select({ /* no submitter PII columns — D-C1 */ })
    .from(submissions)
    .where(and(eq(submissions.kind, 'proposal'), eq(submissions.status, 'approved')))
    .orderBy(/* approved_at desc */)
    .limit(12);

  return (
    <MainContainer width="page">
      <h1 className="font-display text-4xl font-extrabold text-primary">
        {t('pageTitle')}
      </h1>
      <Alert className="mt-8 border-l-4 border-l-primary bg-primary/5">
        <AlertDescription>{t('votingSoon')}</AlertDescription>
      </Alert>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {proposals.map((p) => <ProposalCard key={p.id} proposal={p} />)}
      </div>
    </MainContainer>
  );
}
```

**DO NOT export `revalidate`** for the member status pages — they are dynamic per-user. For the public `/предложения` page, ISR with a short revalidate (e.g. `export const revalidate = 60`) is acceptable.

---

### `src/app/(frontend)/member/предложи/page.tsx` (component, request-response)

**Analog:** `src/app/(frontend)/(auth)/register/page.tsx` (all 38 lines)

**Page scaffold pattern:**
```typescript
import { getTranslations } from 'next-intl/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { MainContainer } from '@/components/layout/MainContainer';
import { ProposalForm } from '@/components/forms/ProposalForm';

export default async function SubmitProposalPage() {
  const t = await getTranslations('submission.proposals');
  return (
    <>
      {/* Turnstile script — same raw <script> pattern as register/page.tsx lines 21-26 */}
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
      />
      <MainContainer width="form">
        <Card>
          <CardHeader>
            <h1 className="font-display text-3xl">{t('submitTitle')}</h1>
          </CardHeader>
          <CardContent>
            <ProposalForm />
          </CardContent>
        </Card>
      </MainContainer>
    </>
  );
}
```

Note: this page is nested under `/member/` so `MemberLayout` already enforces auth + emailVerified + not-suspended. No additional session check needed in the page itself.

---

### `src/components/forms/ProposalForm.tsx` (component, request-response)

**Analog:** `src/components/forms/RegistrationForm.tsx`

**Client component pattern** (RegistrationForm.tsx lines 1–42):
```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { submitProposal, type SubmitResult } from '@/lib/submissions/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TurnstileWidget } from './TurnstileWidget';

const initialState: SubmitResult = { ok: false };

export function ProposalForm() {
  const t = useTranslations('submission.proposals');
  const [state, formAction, pending] = useActionState(submitProposal, initialState);
  const router = useRouter();
  const [turnstileStatus, setTurnstileStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (state.ok) router.push('/member/предложения'); // redirect to status list on success
  }, [state, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Error alert — mirror RegistrationForm.tsx lines 55-63 */}
      {/* fields: title (Input), body (Textarea), topic (Select) */}
      {/* TurnstileWidget — same as RegistrationForm */}
      <Button type="submit" size="lg" className="min-h-[44px] w-full" disabled={pending || turnstileStatus !== 'ready'}>
        {t('submitCta')}
      </Button>
    </form>
  );
}
```

**Anti-patterns:**
- Do NOT use `useTranslations` in Server Components — use `getTranslations` (next-intl/server). The form is a client component so `useTranslations` is correct here
- Card is NOT a link wrapper for ProposalCard on the public page — no `<Link>` wrapper, no `cursor-pointer` (UI-SPEC S1)

---

### `src/components/proposals/ProposalCard.tsx` (component, CRUD)

**Analog:** `src/components/member/MemberWelcomeBanner.tsx`

**RSC component pattern** (MemberWelcomeBanner.tsx lines 22–43):
```typescript
// Server component — no 'use client'
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ProposalCardProps {
  proposal: {
    id: string;
    title: string;
    body: string;
    topic: string;
    approved_at: Date;
    // NO: submitter_id, submitter email, full_name — D-C1 anonymity
  };
}

export function ProposalCard({ proposal }: ProposalCardProps) {
  // Attribution: ALWAYS "Член на коалицията" — D-C1 lock. No variants.
  const attribution = 'Член на коалицията';
  return (
    <Card className="flex flex-col gap-4 rounded-xl border bg-card p-6 hover:ring-1 hover:ring-secondary/50 transition-shadow">
      <Badge variant="outline" className="self-start text-xs">{proposal.topic}</Badge>
      <h2 className="font-display text-2xl font-extrabold text-balance line-clamp-3">
        {proposal.title}
      </h2>
      <p className="text-base text-muted-foreground line-clamp-2">{proposal.body}</p>
      <Separator />
      <p className="text-sm font-semibold text-muted-foreground">
        {attribution} · {proposal.approved_at.toLocaleDateString('bg-BG')}
      </p>
    </Card>
  );
}
```

**Anti-patterns:**
- Do NOT wrap card in `<Link>` — proposals have no detail page in Phase 4 (UI-SPEC S1 explicit)
- Do NOT expose `submitter_id`, `full_name`, or `email` in any public-facing card — D-C1 absolute lock

---

### `src/app/(payload)/admin/views/moderation-queue/ModerationQueueView.tsx` (component, request-response)

**Analog:** `src/app/(payload)/admin/views/attribution/AttributionView.tsx` (all 78 lines — exact match)

**Imports pattern** (lines 1–6):
```typescript
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import bg from '../../../../../../messages/bg.json';
import { fetchModerationQueue } from './actions';
import { QueueTable } from './QueueTable';
```

**next-intl direct import pattern** (AttributionView.tsx lines 16–21) — MUST use this, not `getTranslations()`:
```typescript
const t = (bg as { admin: { queue: Record<string, unknown> } }).admin.queue as {
  pageTitle: string;
  denied: string;
  loginRequired: string;
};
```

**Role gate pattern** (AttributionView.tsx lines 48–63):
```typescript
if (!user) {
  return (
    <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
      <Gutter><p>{t.loginRequired}</p></Gutter>
    </DefaultTemplate>
  );
}
const role = (user as { role?: string }).role ?? '';
if (!['admin', 'editor', 'super_editor'].includes(role)) {
  return (
    <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
      <Gutter><p>{t.denied}</p></Gutter>
    </DefaultTemplate>
  );
}
```

**RSC root return pattern** (AttributionView.tsx lines 69–78):
```typescript
return (
  <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
    <Gutter>
      <h1>{t.pageTitle}</h1>
      <QueueTable initialData={data} currentUserRole={role} />
    </Gutter>
  </DefaultTemplate>
);
```

**payload.config.ts registration** — mirror lines 22–28:
```typescript
views: {
  attribution: { /* existing — do not touch */ },
  moderationQueue: {
    Component: '/src/app/(payload)/admin/views/moderation-queue/ModerationQueueView#ModerationQueueView',
    path: '/views/moderation-queue',
  },
},
```

**Anti-patterns:**
- Do NOT use `getTranslations()` or `useTranslations()` inside Payload admin shell — no next-intl Provider exists there. Direct JSON import is the ONLY correct approach (verified in AttributionView.tsx line 4 + comment lines 8–14)

---

### `src/app/(payload)/admin/views/moderation-queue/QueueTable.tsx` (component, CRUD)

**Analog:** `src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx`

**Client component pattern** (AttributionDashboard.tsx lines 1–37):
```typescript
'use client';

import { useState } from 'react';
import bg from '../../../../../../messages/bg.json';
// Import shadcn: Table, TableBody, TableCell, TableHead, TableHeader, TableRow
// Import shadcn: Badge, Button, Tabs, TabsList, TabsTrigger, TabsContent
// Import shadcn: Dialog, DialogContent, DialogHeader, DialogTitle, Textarea

type QueueCopy = {
  tabs: { proposals: string; problems: string; dsa: string };
  actions: { approve: string; reject: string; suspend: string };
  // ...
};
const t = (bg as { admin: { queue: QueueCopy } }).admin.queue;
```

**importMap.js registration** — mirror lines 38–40 and 58–60 of `importMap.js`:
```typescript
// In importMap.js imports section:
import { QueueTable as QueueTable_modqueue } from '@/app/(payload)/admin/views/moderation-queue/QueueTable'
import { ReviewDialog as ReviewDialog_modqueue } from '@/app/(payload)/admin/views/moderation-queue/ReviewDialog'

// In exportMap object:
"/src/app/(payload)/admin/views/moderation-queue/QueueTable#QueueTable": QueueTable_modqueue,
"/src/app/(payload)/admin/views/moderation-queue/ReviewDialog#ReviewDialog": ReviewDialog_modqueue,
```

**Anti-patterns:**
- Do NOT omit importMap registration for Client Components used inside Payload admin — they silently blank out (research Pitfall 3, verified in importMap.js comments lines 1–21)

---

### `src/components/problems/OblastMap.tsx` (component, transform)

**Analog:** `src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx` + `src/lib/oblast-names.ts`

**Oblast lookup pattern** (AttributionDashboard.tsx line 6 + oblast-names.ts lines 13–48):
```typescript
import { OBLAST_NAMES, oblastDisplayName } from '@/lib/oblast-names';

// For SVG fill density, map count → CSS class (4-step scale per UI-SPEC S2):
function densityClass(count: number, maxCount: number): string {
  const ratio = count / maxCount;
  if (ratio >= 0.75) return 'fill-primary';            // highest
  if (ratio >= 0.50) return 'fill-primary/60';
  if (ratio >= 0.25) return 'fill-secondary/70';
  return 'fill-secondary/40';                          // lowest
}
// Suppressed (N<5) or absent oblasts → 'fill-muted' (no count shown, no tooltip count)
```

**Anti-patterns:**
- Do NOT reuse attribution SVG map for problem heat-map without checking: the SVG path IDs map to ISO 3166-2 codes (e.g., `BG-22`) — verify that the SVG uses these same IDs before reusing the asset

---

## Shared Patterns

### Authentication in Server Components (RSC layouts + page-level)
**Source:** `src/lib/auth.ts` + `src/app/(frontend)/member/layout.tsx`
**Apply to:** All `/member/*` pages, all admin Server Actions
```typescript
// In RSC (layout or page):
import { auth } from '@/lib/auth';
const session = await auth();
const userId = (session?.user as { id: string }).id;
```

### next-intl in Frontend RSC Pages
**Source:** `src/app/(frontend)/community/page.tsx` lines 25–26, `src/app/(frontend)/member/page.tsx` line 18
**Apply to:** All `/предложения`, `/проблеми`, `/member/*` pages
```typescript
import { getTranslations } from 'next-intl/server';
const t = await getTranslations('submission.proposals'); // namespace path
```

### next-intl in Payload Admin RSC (NO Provider — direct JSON import)
**Source:** `src/app/(payload)/admin/views/attribution/AttributionView.tsx` lines 4, 16–21
**Apply to:** `ModerationQueueView.tsx`, `QueueTable.tsx`, `ReviewDialog.tsx`
```typescript
import bg from '../../../../../../messages/bg.json';
const t = (bg as { admin: { queue: SomeType } }).admin.queue;
```

### Editor/Admin Role Gate in Server Actions
**Source:** `src/lib/auth/role-gate.ts` lines 14–22
**Apply to:** All admin Server Actions in `admin-actions.ts`
```typescript
await assertEditorOrAdmin(); // first line of every admin action — throws Forbidden if not authorized
```

### Drizzle DB Import
**Source:** `src/app/(payload)/admin/views/attribution/actions.ts` line 3
**Apply to:** All Server Actions and RSC pages that query the DB
```typescript
import { db } from '@/db';
import { submissions, moderation_log, users } from '@/db/schema';
```

### Aggregate Query with sql<number>
**Source:** `src/app/(payload)/admin/views/attribution/actions.ts` lines 46–58
**Apply to:** `fetchProblemHeatmap()` in admin-actions.ts, oblast breakdown query
```typescript
.select({ oblast: submissions.oblast, count: sql<number>`count(*)::int` })
.groupBy(submissions.oblast)
.having(sql`count(*) >= 5`)   // D-D2 N<5 suppression
```

### Turnstile + Rate Limit Guard in Member Server Actions
**Source:** `src/app/actions/register.ts` lines 65–93
**Apply to:** `submitProposal()`, `submitProblemReport()` in actions.ts
```typescript
const tr = await verifyTurnstile(parsed.data.turnstileToken, ip ?? undefined);
if (!tr.ok) return { ok: false, error: 'submission.errors.captchaFailed' };
```

### useActionState Pattern in Client Forms
**Source:** `src/components/forms/RegistrationForm.tsx` lines 29–40
**Apply to:** `ProposalForm.tsx`, `ProblemReportForm.tsx`
```typescript
const [state, formAction, pending] = useActionState(submitProposal, initialState);
useEffect(() => {
  if (state.ok && state.nextHref) router.push(state.nextHref);
}, [state, router]);
```

### MainContainer Width Tokens
**Source:** `src/components/layout/MainContainer.tsx` lines 3–10
**Apply to:** All new frontend pages
```typescript
// Submission forms:           <MainContainer width="form">   (max-w-[480px])
// Member status lists:        <MainContainer width="prose">  (max-w-[768px])
// Public proposals/heat-map:  <MainContainer width="page">   (max-w-[1140px])
```

### Payload Collection Registration
**Source:** `src/payload.config.ts` lines 6–7, 30
**Apply to:** `Ideas.ts`, `Pages.ts` (new collections)
```typescript
import { Ideas } from './collections/Ideas';
import { Pages } from './collections/Pages';
// ...
collections: [Users, Newsletters, Ideas, Pages],
```

### importMap.js Manual Registration (bypass payload generate:importmap)
**Source:** `src/app/(payload)/admin/importMap.js` lines 38–61
**Apply to:** Every new Client Component rendered inside Payload admin
```typescript
// Pattern: import alias = Namespace_context_descriptor
import { QueueTable as QueueTable_modqueue } from '@/app/(payload)/admin/views/moderation-queue/QueueTable'
// In exportMap:
"/src/app/(payload)/admin/views/moderation-queue/QueueTable#QueueTable": QueueTable_modqueue,
```

### Email Job Enqueue
**Source:** `src/app/actions/register.ts` lines 162–168 + `src/lib/email/queue.ts` lines 7–14
**Apply to:** Notification on submission status change
```typescript
// Add new kind to EmailJobKind union in src/lib/email/queue.ts:
| 'submission-status-approved'
| 'submission-status-rejected'

// Enqueue from admin-actions.ts after approve/reject:
await addEmailJob({
  to: submitterEmail,
  kind: 'submission-status-approved',
  fullName: submitterFullName,
  // title: proposal.title — add to EmailJobPayload if needed
});
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/app/(frontend)/suspended/page.tsx` | component | request-response | No existing "account suspended" page pattern. Simple static page with `MainContainer width="form"` + Card + Bulgarian copy from `admin.suspended.*` keys. No server data fetch needed. |

---

## Role Architecture Warning (Planner Must Resolve)

The research (Pattern 7) and CONTEXT (D-A2) describe `platform_role` on the application `users` table. The existing `users.role` column (auth.ts line 17) already holds business role (`owner`/`manager`/`employee`/`other`). The planner must:

1. Add `platform_role text DEFAULT NULL` column to `users` table via Neon SQL (NOT `payload migrate`)
2. Update `src/lib/auth/role-gate.ts`'s `assertNotLastSuperEditor` to query `users.platform_role`, not `users.role`
3. The Payload admin-level gate (`assertEditorOrAdmin` via `payload.auth()`) checks `admin_users.role` — this governs who can access the Payload admin panel
4. For member-facing submission Server Actions, the `platform_role` on `users` table determines editorial authority
5. The ops runbook must document that editorial users need entries in BOTH `users` (for `submitProposal` auth session) AND `admin_users` (for Payload admin panel access) — or clarify whether editors are always admin-panel-only users (no member registration)

The AttributionView role gate (line 57) checks `['admin', 'editor']` — this must be updated to `['admin', 'editor', 'super_editor']` for the moderation queue view.

---

## Metadata

**Analog search scope:** `src/app/`, `src/collections/`, `src/db/schema/`, `src/lib/`, `src/components/`, `messages/`, `src/payload.config.ts`, `src/app/(payload)/admin/importMap.js`
**Files scanned:** ~35
**Pattern extraction date:** 2026-05-10
