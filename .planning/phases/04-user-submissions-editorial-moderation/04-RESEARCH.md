# Phase 4: User Submissions + Editorial Moderation — Research

**Researched:** 2026-05-10
**Domain:** Payload CMS custom admin views, Drizzle ORM schema design (append-only audit log), Next.js 15 Server Actions, member-submission lifecycle, Auth.js v5 suspended-account gating, DSA Art.16
**Confidence:** HIGH (stack is proven in prior phases; patterns are established and verified in-codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-A1:** Phase 4 absorbs EDIT-01 (admin login + role gating), EDIT-02 (Payload Ideas collection CRUD without voting fields), and the `moderation_log` table schema. Schema sketch: `(id, action, actor_user_id, target_kind, target_id, target_ids[], note, created_at)` append-only. Action enum extended with: `submission_approve`, `submission_reject`, `user_suspend`, `user_unsuspend`, `editor_grant`, `editor_revoke`. No structural change vs Phase 3's planned schema.

- **D-A2:** Two roles: `editor` and `super_editor`. `editor` does moderation, publishing, suspension. `super_editor` does everything plus: grant/revoke `editor` to other users, reverse suspensions, override moderation decisions with required note. Bootstrap: first `super_editor` created by operator via direct DB seed (documented in `04-OPS-RUNBOOK.md`). "Last super_editor cannot be demoted" guard at Server Action layer. Role stored in `users.role` text column (NOT a separate Payload Users collection).

- **D-B1:** Approved member proposals appear on read-only public page `/предложения`. Each proposal renders as a Card with title + body + topic + submission date + anonymous byline ("Член на коалицията"). Voting-soon notice. Proposals never auto-publish — every public proposal has been approved by an `editor`.

- **D-C1:** Anonymous on every public surface. Internally, editor sees full member identity. "Член на коалицията" / "Анонимен сигнал" are the ONLY public attribution labels — no variants.

- **D-D1:** Aggregated heat map per oblast for problem reports. Page `/проблеми`. No individual records on public surface.

- **D-D2:** Small-N suppression: oblast+topic buckets with N<5 are hidden entirely. National-level reports aggregate into a single national bucket (same N≥5 rule for topic breakdown).

### Claude's Discretion

- Bootstrap mechanism for first super-editor
- Payload roles vs application-roles storage details (D-A2 names the column; storage details flexible)
- Audit-log policy for super-editor override actions
- moderation_log additional fields beyond Phase 3's D-08 sketch
- PROP-04 page placement in nav
- PROB heat-map update cadence (real-time vs daily aggregate cache vs hybrid)
- PROB topic taxonomy (free-text vs admin-curated list vs hybrid)
- Section heading copy on public pages
- Internal admin "open submitter identity" privacy gradient
- DSA Art.16 reporting mechanism scope
- Notification cadence when submission status changes
- Suspended-account submission handling (preserve + show as "[suspended]" in admin)

### Deferred Ideas (OUT OF SCOPE)

- Voting on member-submitted proposals (Phase 3 re-activation)
- Optional `display_name` byline (Art.9(2)(a) consent — lawyer-track required)
- Per-signal detail pages for problem reports
- Editor "compare with prior policy" view
- Notification preferences edit from member dashboard (Phase 6)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROP-01 | Member can submit proposal (title, description, topic) | Server Action + Zod + Turnstile + Upstash rate-limit pattern (§ Submission Server Actions) |
| PROP-02 | Submitted proposals go to moderation queue — NOT published automatically | Submissions collection with `status='pending'` default; no public read access until `status='approved'` (§ Payload Collections Architecture) |
| PROP-03 | Member sees status of their own proposals (pending/approved/rejected + note) | Filter by `submitter = currentUser` via Payload access control or Drizzle query; SubmissionStatusCard component (§ Status Read Flow) |
| PROP-04 | Approved proposals appear on public read-only page `/предложения` (D-B1 re-scope: no voting in Phase 4) | Public RSC page with Drizzle query for `status='approved'` submissions; pagination 12/page (§ Public Surfaces Architecture) |
| PROB-01 | Member can submit problem report | Server Action + Zod + Turnstile + Upstash rate-limit; same anti-abuse pattern as PROP-01 (§ Submission Server Actions) |
| PROB-02 | Problem report has mandatory local/national level tag | `level` field ('local' \| 'national'); Zod enforces at API boundary (§ Schema Design) |
| PROB-03 | Local problem reports include oblast/municipality selection | 28-item Select from existing `OBLAST_NAMES` constant + GeoLite2 auto-suggestion as initial value (§ Oblast Picker) |
| PROB-04 | Problem reports go through moderation queue | Same `status='pending'` default as proposals; separate table or shared Submissions table with `kind` discriminator (§ Payload Collections Architecture) |
| PROB-05 | Member sees status of their own problem reports | Same pattern as PROP-03; `/member/сигнали` route (§ Status Read Flow) |
| EDIT-03 | Editor can create, edit, publish agitation pages (PUB content) from admin panel | Payload CMS already provides full-CRUD admin for any registered collection; agitation pages = Payload Pages collection or existing content primitives (§ Editorial Actions) |
| EDIT-04 | Editor sees moderation queue with member proposals and signals | `/admin/views/moderation-queue` custom Payload view; mirrors `/admin/views/attribution` pattern (§ Payload Custom Admin Views) |
| EDIT-05 | Editor can approve/reject (with note) proposal or signal | Server Actions: `approveSubmission`, `rejectSubmission`; Zod enforces non-empty note on reject; writes `moderation_log` (§ Editorial Actions) |
| EDIT-06 | Editor can suspend member account; documented in moderation_log | Server Action: `suspendUser`; sets `users.status='suspended'`; writes `moderation_log`; Auth.js session gate blocks suspended members (§ Suspended-Account Gate) |
| EDIT-07 | Editor can review attribution statistics | Already shipped: `/admin/views/attribution` (Phase 2.1) — no new work; just verify role gate includes new role values (§ Editorial Actions) |
</phase_requirements>

---

## Summary

Phase 4 builds on a well-established foundation. The stack is fully proven: Payload CMS custom views (the attribution dashboard is the canonical template), Server Actions with Zod + Turnstile + Upstash rate-limiting (Phase 1/02.x pattern), Drizzle ORM schema additions via manual Neon DDL (Phase 2.1 operational constraint), and next-intl `bg.json` string lock-in (Phase 3 D-25 contract). No new stack components are introduced.

The three architecture domains that need the most research attention are: (1) how to implement the `moderation_log` as a truly append-only table using the existing project patterns, (2) how Auth.js v5 session gating can honor a `users.status = 'suspended'` flag without introducing an Edge-incompatible check in `middleware.ts`, and (3) what minimum DSA Article 16 compliance means for this platform.

Key finding: DSA Art.16 applies to all hosting service providers regardless of size. There is no small-platform exemption from the notice-and-action requirement. Minimum compliance requires a user-accessible reporting form (electronic) that captures content location + reason for the report, acknowledgement of receipt, and notification of the decision. For a Bulgarian political advocacy platform, this translates to a simple "Сигнализирай за неподходящо съдържание" form that feeds into the existing editorial moderation queue.

**Primary recommendation:** Implement `moderation_log` as a Drizzle-managed table (not a Payload collection) with a DB-level `REVOKE UPDATE, DELETE` grant on the app DB user — this is the cleanest append-only enforcement pattern. Use the `assertEditorOrAdmin` role-gate established in Phase 5 as the template, extended for the two-tier `editor` / `super_editor` role structure.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Proposal submission form (PROP-01) | Frontend Server (Next.js RSC page + Server Action) | — | Member-facing form with server-side Zod validation; Turnstile token verified server-side |
| Problem report form (PROB-01..03) | Frontend Server (Next.js RSC page + Server Action) | — | Same pattern; GeoIP auto-suggestion computed server-side from IP |
| Submission queue storage | Database (PostgreSQL via Drizzle) | — | Relational: status enum, FK to users, append-only moderation_log |
| Public proposals page (PROP-04, D-B1) | Frontend Server (Next.js RSC page, ISR/dynamic) | CDN (Cloudflare cache) | SSR with Drizzle query; cacheable on Cloudflare since content is public once approved |
| Problem heat-map page (D-D1) | Frontend Server (Next.js RSC) | Database (aggregate cache) | SVG rendering server-side; aggregate query results cached (Next.js `unstable_cache` or server-side cache) |
| Member status views (PROP-03, PROB-05) | Frontend Server (Next.js RSC page under `/member/`) | — | Per-user; already behind Auth.js session gate in `member/layout.tsx`; not cacheable |
| Editorial moderation queue UI (EDIT-04) | Frontend Server inside Payload Admin (custom RSC view) | Database (Drizzle query) | Inherits `DefaultTemplate + Gutter` pattern from attribution view; role-gated |
| Editorial actions: approve/reject/suspend (EDIT-05, EDIT-06) | API (Next.js Server Actions) | Database | `'use server'` functions with `assertEditorOrAdmin` guard; write to submissions table + moderation_log |
| Append-only moderation_log | Database (PostgreSQL) | — | REVOKE UPDATE/DELETE on app DB user for this table; enforced at storage layer |
| Suspended-account auth gate | Frontend Server (Auth.js v5 session check in RSC/layout) | — | `member/layout.tsx` extends existing session check with `users.status` column check; NOT in Edge middleware |
| Oblast GeoIP auto-suggestion (PROB-03) | API / Backend (Node.js Server Component) | — | GeoLite2 lookup already in `src/lib/geoip.ts`; returns suggestion as prop to client Select |
| DSA Art.16 reporting form | Frontend Server (Server Action) | Database | Simple form submission feeding into moderation queue with `kind='dsa_report'` |
| Role management (D-A2) | API (Server Actions) | Database | `grantEditor` / `revokeEditor` actions guarded by `assertSuperEditor`; write to `users.role` + moderation_log |
| Email notification on status change | API (BullMQ worker, Phase 5 infrastructure) | — | Reuse `src/jobs/blast-worker.tsx` queue; new job kind `submission-status` |

---

## Standard Stack

All packages below are already in the project. Phase 4 introduces NO new npm dependencies.

### Core (already installed — no new installs)

| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| Next.js | 16.2.6 [VERIFIED: npm registry] | RSC pages, Server Actions, layouts | Locked in CLAUDE.md |
| Payload CMS | 3.84.1 [VERIFIED: npm registry] | Admin custom views, collections, access control | Locked in CLAUDE.md |
| Drizzle ORM | 0.45.2 [VERIFIED: npm registry] | Schema additions (submissions, problem_reports, moderation_log), queries | Locked in CLAUDE.md |
| Auth.js v5 | beta (installed, project-confirmed) | Session auth gate, suspended-account check | Locked in CLAUDE.md |
| Tailwind v4 + shadcn/ui | installed (Phase 1/2) | New shadcn components: badge, separator, skeleton, table, textarea | Locked in UI-SPEC |
| next-intl | 3.x installed | Bulgarian strings under submission.*, problem.*, admin.queue.*, admin.moderation.* | Locked in CLAUDE.md |
| zod | 3.x installed | Form validation for proposal and problem report Server Actions | Locked in CLAUDE.md |
| React Hook Form + @hookform/resolvers | 7.x / 3.x installed | Proposal and problem report client forms | Locked in CLAUDE.md |
| @upstash/ratelimit + @upstash/redis | installed (Phase 1) | Rate-limiting for submission endpoints | Locked in CLAUDE.md |
| Cloudflare Turnstile | JS snippet (Phase 1) | Anti-bot on submission forms | Locked in CLAUDE.md |
| BullMQ (Phase 5) | installed | Status-change notification emails | Reuse existing Phase 5 worker |
| MaxMind GeoLite2 (`src/lib/geoip.ts`) | installed (Phase 2.1) | PROB-03 oblast auto-suggestion from IP | Already in `src/lib/geoip.ts` |

### New shadcn components to add (UI-SPEC locked)

```bash
npx shadcn@latest add badge separator skeleton table textarea
```

Note from UI-SPEC: check if Phase 3 already shipped any of these before re-running. The conditional is: if the component directory exists under `src/components/ui/`, skip that component.

### No new dependencies

Phase 4 requires zero new `pnpm add` calls beyond shadcn component copies. [VERIFIED: all capabilities covered by installed packages]

---

## Architecture Patterns

### System Architecture Diagram

```
Member browser
     |
     | HTTP POST (Turnstile token + form data)
     v
Next.js Server Action  ──────────────────────────────────────────
  submitProposal()                                               |
  submitProblemReport()                                         |
     |                                                          |
     | 1. assertEmailVerified (session check — users.emailVerified)
     | 2. assertNotSuspended (users.status check)
     | 3. Upstash rate-limit check (per-user, per-IP)
     | 4. Turnstile token verify (Cloudflare API)
     | 5. Zod parse (title/description/topic/level/oblast)
     | 6. db.insert(submissions) — status='pending'
     | 7. BullMQ enqueue: submission-status notification
     v
PostgreSQL (Neon)
  submissions table (kind='proposal'|'problem', status='pending')
  problem_reports extends submissions (level, oblast)
  moderation_log (append-only)
  users (role text, status text)
     ^
     |  Drizzle queries
     |
Editorial Server Actions (editor/super_editor only)
  approveSubmission() → UPDATE submissions SET status='approved' + INSERT moderation_log
  rejectSubmission()  → UPDATE submissions SET status='rejected' + INSERT moderation_log
  suspendUser()       → UPDATE users SET status='suspended'    + INSERT moderation_log
     ^
     |
Payload Admin custom view
  /admin/views/moderation-queue
  (DefaultTemplate + Gutter RSC, role-gated, reads via Drizzle)
     |
     | public
     v
/предложения RSC page ← Drizzle query: submissions WHERE status='approved' AND kind='proposal'
/проблеми RSC page    ← Drizzle aggregate: COUNT(*) FROM submissions WHERE status='approved' AND kind='problem' GROUP BY oblast HAVING count >= 5
```

### Recommended Project Structure (new files only)

```
src/
├── db/schema/
│   └── submissions.ts           # proposals + problem_reports + moderation_log (shared file)
├── collections/
│   └── Ideas.ts                 # EDIT-02 — Payload Ideas collection (voting fields deferred)
├── app/(frontend)/
│   ├── предложения/
│   │   └── page.tsx             # PROP-04 public proposals page (RSC)
│   ├── проблеми/
│   │   └── page.tsx             # D-D1 public heat-map page (RSC)
│   └── member/
│       ├── предложи/
│       │   └── page.tsx         # PROP-01 proposal submission form
│       ├── предложения/
│       │   └── page.tsx         # PROP-03 my proposals status list
│       ├── сигнализирай/
│       │   └── page.tsx         # PROB-01 problem report form
│       └── сигнали/
│           └── page.tsx         # PROB-05 my problem reports status list
├── app/(payload)/admin/views/
│   └── moderation-queue/
│       ├── ModerationQueueView.tsx    # RSC root; role gate; fetches queue data
│       ├── QueueTable.tsx             # Client component; shadcn table + tabs + badge + button
│       ├── ReviewDialog.tsx           # Client modal; dialog + accordion + textarea + button
│       └── ConfirmActionDialog.tsx    # Reusable nested confirm (approve/reject/suspend)
├── components/
│   ├── proposals/
│   │   └── ProposalCard.tsx           # card + badge
│   ├── submissions/
│   │   └── SubmissionStatusCard.tsx   # card + badge + rejection note
│   ├── forms/
│   │   ├── ProposalForm.tsx           # form + input + textarea + select + button + separator
│   │   └── ProblemReportForm.tsx      # form + textarea + select + radio-group + button + separator
│   └── problems/
│       ├── OblastMap.tsx              # SVG choropleth map + Tooltip
│       └── OblastBreakdownTable.tsx   # table
└── lib/submissions/
    ├── actions.ts               # submitProposal, submitProblemReport Server Actions
    ├── admin-actions.ts         # approveSubmission, rejectSubmission, suspendUser, grantEditor, revokeEditor
    └── zod.ts                   # Zod schemas for proposals and problem reports
```

### Pattern 1: Payload Custom Admin View (EDIT-04 — moderation queue)

The existing `/admin/views/attribution/` directory is the template. [VERIFIED: source code read]

```typescript
// src/app/(payload)/admin/views/moderation-queue/ModerationQueueView.tsx
// Source: verified from src/app/(payload)/admin/views/attribution/AttributionView.tsx

import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';
import bg from '../../../../../../messages/bg.json';
import { fetchModerationQueue } from './actions';
import { QueueTable } from './QueueTable';

export async function ModerationQueueView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req: { user, i18n, payload }, locale, visibleEntities } = initPageResult;

  // Role gate: editor OR super_editor (both can moderate)
  if (!user) {
    return (
      <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
        <Gutter><p>{t.loginRequired}</p></Gutter>
      </DefaultTemplate>
    );
  }
  const role = (user as { role?: string }).role ?? '';
  if (!['editor', 'super_editor', 'admin'].includes(role)) {
    return (
      <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
        <Gutter><p>{t.denied}</p></Gutter>
      </DefaultTemplate>
    );
  }

  const data = await fetchModerationQueue();
  return (
    <DefaultTemplate i18n={i18n} locale={locale} params={params} payload={payload} visibleEntities={visibleEntities}>
      <Gutter>
        <h1>{t.pageTitle}</h1>
        <p>{/* pending counts summary */}</p>
        <QueueTable initialData={data} currentUserRole={role} />
      </Gutter>
    </DefaultTemplate>
  );
}
```

Register in `payload.config.ts` (add to the `admin.components.views` object alongside `attribution`):

```typescript
// payload.config.ts — add to existing admin.components.views object
views: {
  attribution: { /* existing */ },
  moderationQueue: {
    Component: '/src/app/(payload)/admin/views/moderation-queue/ModerationQueueView#ModerationQueueView',
    path: '/views/moderation-queue',
  },
},
```

**Critical note — importMap:** Payload 3.84 uses an explicit importMap registry. Any RSC component used inside Payload admin (including `QueueTable`, `ReviewDialog`, `ConfirmActionDialog`) MUST appear in `importMap.js`. The Newsletters collection's `NewsletterComposer` component registration in `src/collections/Newsletters.ts` uses string paths (`'/src/components/payload/NewsletterComposer#NewsletterComposer'`) — same pattern applies. The `QueueTable` and `ReviewDialog` components must be explicitly registered either in `payload.config.ts` importMap or via the collection's `admin.components` registration. [VERIFIED: from Newsletters.ts source and Payload docs]

### Pattern 2: next-intl in Payload Admin (no Provider)

The admin RSC components cannot use `getTranslations()` or `useTranslations()` because there is no next-intl Provider in the Payload admin shell. Use the direct import pattern: [VERIFIED: source code — AttributionView.tsx and AttributionDashboard.tsx]

```typescript
// In RSC root (ModerationQueueView.tsx):
import bg from '../../../../../../messages/bg.json';
const t = (bg as Record<string, unknown>).admin.queue as { pageTitle: string; /* ... */ };

// In Client Components (QueueTable.tsx):
import bg from '../../../../../../messages/bg.json';
const t = (bg as Record<string, unknown>).admin.queue as QueueCopy;
```

### Pattern 3: Server Actions for Member Submissions

All member-facing write operations use Next.js `'use server'` functions. The canonical pattern from Phase 1 / Phase 2.1: [VERIFIED: rate-limit.ts and attribution/actions.ts source]

```typescript
// src/lib/submissions/actions.ts
'use server';

import { auth } from '@/lib/auth';
import { db } from '@/db';
import { submissions } from '@/db/schema/submissions';
import { submissionSchema } from './zod';
import { checkSubmissionRateLimit } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';

export async function submitProposal(formData: unknown) {
  // 1. Auth check — must be logged in AND email verified
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const user = session.user as { id: string; emailVerified?: Date | null; status?: string };
  if (!user.emailVerified) throw new Error('Email not verified');
  if (user.status === 'suspended') throw new Error('Account suspended');

  // 2. Rate limit (Upstash)
  const limitResult = await checkSubmissionRateLimit(user.id);
  if (!limitResult.success) {
    return { error: 'rateLimit', reset: limitResult.reset };
  }

  // 3. Turnstile verification
  const parsed = submissionSchema.safeParse(formData);
  if (!parsed.success) return { error: 'validation', issues: parsed.error.issues };
  const turnstileOk = await verifyTurnstile(parsed.data.turnstileToken);
  if (!turnstileOk) return { error: 'captcha' };

  // 4. Insert into DB
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

  return { success: true };
}
```

### Pattern 4: Append-Only moderation_log

The project already has the append-only pattern on `consents` (application-level: never UPDATE/DELETE from app code). For `moderation_log`, Phase 6 GDPR-07 mandates DB-level INSERT-only enforcement. The planner must decide whether to enforce this now (recommended) or defer to Phase 6. [VERIFIED: consents.ts source — uses `onDelete: 'restrict'`, app convention]

**Two enforcement options (ranked by preference):**

**Option A — DB-level REVOKE (recommended):** After creating the table with the app DB user, run:
```sql
-- After table creation (apply via Neon SQL editor alongside the DDL):
REVOKE UPDATE, DELETE ON TABLE moderation_log FROM <app_db_user>;
```
This is the cleanest enforcement — even a bug in app code cannot corrupt the audit log.

**Option B — Payload collection `beforeChange` hook returning false on update/delete:**
```typescript
// In a Payload Moderation_Log collection (if using Payload, not recommended):
hooks: {
  beforeChange: [({ operation }) => {
    if (operation === 'update' || operation === 'delete') {
      throw new Error('moderation_log is append-only');
    }
  }],
},
```
This is weaker because it only protects the Payload API path, not direct Drizzle or psql writes.

**Recommendation:** Use Option A (DB-level REVOKE). `moderation_log` should be a **Drizzle-managed table** (not a Payload collection) so it can have DB-level protection. The same applies to `submissions` and `problem_reports` — store them as Drizzle tables, query them from Server Actions and custom views.

### Pattern 5: Payload Ideas Collection (EDIT-02 — admin CRUD without voting)

```typescript
// src/collections/Ideas.ts (Phase 4 minimal — no voting fields)
// Source: mirrors Newsletters.ts pattern [VERIFIED: from source]

import type { CollectionConfig } from 'payload';
import { lexicalEditor, ParagraphFeature, HeadingFeature, /* ... */ } from '@payloadcms/richtext-lexical';

const isEditorOrSuperEditor = ({ req }: { req: { user?: unknown } }): boolean => {
  const role = ((req.user as { role?: string } | null)?.role) ?? '';
  return ['admin', 'editor', 'super_editor'].includes(role);
};

export const Ideas: CollectionConfig = {
  slug: 'ideas',
  admin: { useAsTitle: 'title' },
  access: {
    read: () => true,           // public read for published ideas
    create: isEditorOrSuperEditor,
    update: isEditorOrSuperEditor,
    delete: isEditorOrSuperEditor,
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'status', type: 'select', options: ['draft', 'published', 'archived'], defaultValue: 'draft', required: true },
    { name: 'topic', type: 'text', required: true }, // text not pgEnum per project convention
    { name: 'body', type: 'richText', editor: lexicalEditor({ features: () => [ /* same as Newsletters */ ] }) },
    // Phase 3 re-activation adds: votes_open_at, votable boolean — additive ALTER, no rebase
  ],
};
```

Register in `payload.config.ts`: add `Ideas` to the `collections` array.

### Pattern 6: Suspended-Account Auth Gate

The `member/layout.tsx` already gates on `session?.user` and `emailVerified`. [VERIFIED: source code read]

The suspended-account gate extends this layout — NOT `middleware.ts` (which is Edge-only and cannot query the DB). [VERIFIED: middleware.ts comment explicitly forbids importing from `@/lib/*` or `@/db`]

```typescript
// src/app/(frontend)/member/layout.tsx (extended)
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login?next=/member');

  const userId = (session.user as { id: string }).id;

  // Fetch live status from DB (sessions don't embed status — avoid stale cache)
  const [user] = await db.select({ emailVerified: users.emailVerified, status: users.status })
    .from(users).where(eq(users.id, userId)).limit(1);

  if (!user?.emailVerified) redirect('/auth/otp');
  if (user.status === 'suspended') redirect('/suspended'); // new page with Bulgarian copy

  return <>{children}</>;
}
```

**Session token vs DB status:** The Auth.js session JWT/cookie does NOT embed `status`. This means: after suspension, the member's active session is not immediately invalidated — they can continue in their current session tab until the next page navigation that passes through `MemberLayout`. This is acceptable for Phase 4 (immediate invalidation would require a session store query on every request, which is expensive). If stricter immediate suspension is needed, add a `users.status` check to the `auth.ts` session callback to embed status in the session token. The Phase 4 plan should document this tradeoff.

**Alt for submission Server Actions:** Server Actions also need the suspended check independently (since they can be called without navigating through layout). The `assertNotSuspended(userId)` helper should be a reusable function called at the top of each submission Server Action.

### Pattern 7: Role-Gated Super-Editor Actions

The existing `assertEditorOrAdmin` in `src/lib/auth/role-gate.ts` uses Payload auth. [VERIFIED: source] Extend the pattern:

```typescript
// Extend src/lib/auth/role-gate.ts:
export async function assertSuperEditor(): Promise<void> {
  const payload = await getPayload({ config });
  const h = await headers();
  const { user } = await payload.auth({ headers: h });
  const role = (user as { role?: string } | null)?.role ?? '';
  if (role !== 'super_editor' && role !== 'admin') {
    throw new Error('Forbidden — super_editor role required');
  }
}

// "Last super_editor" guard (for revokeEditor action):
export async function assertLastSuperEditorGuard(targetUserId: string): Promise<void> {
  const superEditorCount = await db.select({ count: sql<number>`count(*)::int` })
    .from(users).where(eq(users.role, 'super_editor'));
  const count = superEditorCount[0]?.count ?? 0;
  if (count <= 1) throw new Error('Cannot demote the last super_editor');
}
```

### Pattern 8: Heat-map Aggregate Query with N<5 Suppression (D-D2)

```sql
-- Run via Drizzle sql`` template or raw SQL:
SELECT oblast, COUNT(*) as count
FROM submissions
WHERE kind = 'problem' AND status = 'approved' AND level = 'local' AND oblast IS NOT NULL
GROUP BY oblast
HAVING COUNT(*) >= 5
ORDER BY count DESC;
```

The `HAVING COUNT(*) >= 5` clause implements D-D2 suppression at the DB layer. The query result is safe to return — oblasts with N<5 are absent, preventing inference. For the topic breakdown per oblast (also N≥5 suppressed per D-D2), run a separate query filtered by oblast.

Cache strategy (planner's discretion per CONTEXT.md): `unstable_cache` with 30-minute revalidate is the simplest approach for the heat-map aggregate — the data is non-sensitive (aggregated, N≥5 suppressed) and changes infrequently.

### Anti-Patterns to Avoid

- **Do not use `payload migrate` CLI** — blocked by tsx/Node 22 ESM incompatibility. All DDL goes through Neon SQL editor as raw SQL. [VERIFIED: project MEMORY constraint]
- **Do not put moderation_log in Payload admin as a collection** — makes UPDATE/DELETE impossible to revoke at DB layer; editors would see it in the admin nav creating confusion.
- **Do not put auth checks in `middleware.ts`** — middleware is Edge-only; it cannot import `@/lib/auth`, `@/db`, or `@/lib/geoip.ts`. Suspended-account checks belong in RSC layouts and Server Actions. [VERIFIED: middleware.ts source code and comments]
- **Do not expose raw submitter identity on public surfaces** — D-C1 is locked. The `full_name` and `email` columns must never appear in JSX that renders without a role check.
- **Do not use `pgEnum` for status/kind/action columns** — project convention is `text` columns with Zod-enforced enum at the API boundary (same as `sector`, `role`, `self_reported_source` in `auth.ts`). [VERIFIED: consents.ts, auth.ts sources]
- **Do not add new CSS custom properties** — UI-SPEC locks "Phase 4 introduces zero new CSS custom properties." Use only existing `@theme` tokens.
- **Do not skip Wave 0 bg.json string lock** — All Phase 4 strings must enter `messages/bg.json` before any JSX or Server Action references them. The D-25 pattern (Phase 3 plan 03-01 precedent) is mandatory.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Anti-bot on submission forms | Custom challenge logic | Cloudflare Turnstile (already wired in `src/lib/turnstile.ts`) | Invisible, GDPR-friendly, already deployed |
| Rate limiting submissions | Token-bucket in memory | Upstash `@upstash/ratelimit` sliding window (already in `src/lib/rate-limit.ts`) | Serverless-safe, persistent across instances |
| Bulgarian oblast picker | New lookup table | `src/lib/oblast-names.ts` + `OBLAST_NAMES` constant (already exists) | Phase 2.1 shipped the canonical list (28 oblasts, ISO 3166-2:BG) |
| Oblast auto-suggestion for PROB-03 | Client-side geolocation | `src/lib/geoip.ts` + MaxMind GeoLite2 (Phase 2.1, already installed) | Server-side only; raw IP never reaches client |
| Email on status change | SMTP connection from Server Action | BullMQ queue (`src/jobs/blast-worker.tsx`) with new `submission-status` job kind | Async; non-blocking; React Email Bulgarian templates already established |
| Admin role check | Session cookie parse | `assertEditorOrAdmin()` in `src/lib/auth/role-gate.ts` (already implemented) | Pattern locked from Phase 5; tests coverage already exists |
| Cyrillic slug generation | `encodeURIComponent` | No slug on submissions in Phase 4 (submissions identified by UUID, not slug); ideas use the Phase 3 slugify pattern | Avoid premature work |
| SVG Bulgaria choropleth | New SVG asset | Reuse the SVG map asset from Phase 2.1 attribution dashboard — check `src/app/(payload)/admin/views/attribution/` for existing SVG | Phase 2.1 ships the same visual; different fill logic, same map |

**Key insight:** The submission + moderation domain is 80% plumbing for a pattern already proven in Phase 1 (rate-limit + Turnstile + Server Action) and Phase 2.1 (custom Payload admin view + Drizzle aggregates). The genuinely new work is the `moderation_log` append-only table and the two-tier role system.

---

## Common Pitfalls

### Pitfall 1: moderation_log Mutability Leak

**What goes wrong:** `moderation_log` rows get UPDATEd by mistake (e.g., an editor edits a rejection note) because there is no DB-level protection.
**Why it happens:** Application-level "never UPDATE" conventions break under pressure or bugs. Payload admin UI for a collection always shows Edit buttons.
**How to avoid:** Store `moderation_log` as a Drizzle table (not a Payload collection). Apply `REVOKE UPDATE, DELETE ON TABLE moderation_log FROM <app_db_user>` via Neon SQL immediately after the CREATE TABLE DDL. Include a schema invariant test (mirror `attribution-schema.test.ts` pattern) asserting no UPDATE/DELETE SQL is possible.
**Warning signs:** Any Server Action with `db.update(moderation_log...)` or `db.delete(moderation_log...)`.

### Pitfall 2: Edge Middleware Cannot Gate Suspended Accounts in Real-Time

**What goes wrong:** Developer adds `users.status === 'suspended'` check to `middleware.ts` → build fails or silent runtime error because middleware cannot import `@/db`.
**Why it happens:** `middleware.ts` is Edge-only; DB drivers require Node.js runtime.
**How to avoid:** Gate suspension in RSC `member/layout.tsx` (Node.js runtime) and in each Server Action (`assertNotSuspended`). Document that the current session remains valid until next navigation. If immediate invalidation is needed, encode `status` in the Auth.js session token via the `session` callback.
**Warning signs:** Any `import { db }` or `import { auth }` in `middleware.ts`.

### Pitfall 3: Payload importMap Registration Omission

**What goes wrong:** Custom Client Component inside Payload admin (e.g., `QueueTable.tsx`) renders as blank or throws "Component not found" because it is not in the importMap.
**Why it happens:** Payload 3.84 requires explicit component path registration. The auto-importMap only covers components passed as strings in config (via `#ComponentName` suffix notation).
**How to avoid:** Every Client Component rendered inside Payload admin must be registered in `payload.config.ts` importMap or referenced via the `#ComponentName` pattern in collection config strings. Follow the Newsletters pattern in `src/collections/Newsletters.ts` exactly.
**Warning signs:** Blank panels in Payload admin after deploying new admin components.

### Pitfall 4: next-intl `getTranslations()` in Payload Admin RSC

**What goes wrong:** `getTranslations('admin.queue')` throws or returns undefined inside Payload admin view because there is no next-intl Provider.
**Why it happens:** The Payload admin shell (`DefaultTemplate`) does not wrap children in a next-intl Provider.
**How to avoid:** Import `messages/bg.json` directly and type-assert the needed keys. Pattern established and working in `AttributionView.tsx` and `AttributionDashboard.tsx`.
**Warning signs:** Any `getTranslations()` call inside a file under `(payload)/admin/views/`.

### Pitfall 5: Public Surface Leaking Submitter Identity (GDPR Art.9 + D-C1)

**What goes wrong:** A template literal accidentally renders `submission.submitter.full_name` on the public `/предложения` page.
**Why it happens:** The Drizzle query JOIN returns `submitter` fields; a refactor or copy-paste introduces the field into a public component.
**How to avoid:** The public-page query must SELECT only: `id, title, body, topic, approved_at`. Write a unit test that parses the RSC page component and asserts no `full_name`, `email`, `sector`, or `role` prop is referenced in the render path. Reference D-C1 locked strings: "Член на коалицията" and "Анонимен сигнал" only.
**Warning signs:** Any field other than title/body/topic/date in the ProposalCard or public OblastBreakdownTable.

### Pitfall 6: Small-N Inference (D-D2)

**What goes wrong:** The heat-map renders "1 сигнал" for an oblast with a single report, exposing de-facto identifying information in small communities.
**Why it happens:** Missing `HAVING COUNT(*) >= 5` clause or applying it only to the map but not the breakdown table.
**How to avoid:** Apply N≥5 suppression at the database query layer (not in the presentation layer). The table and map must use the SAME query result so they are consistent. A unit test asserting the suppression function returns `null` for counts < 5.
**Warning signs:** Any oblast row in the breakdown table with a count < 5.

### Pitfall 7: `text` Column for status Allows Arbitrary Values

**What goes wrong:** A typo (`'aproved'` instead of `'approved'`) produces a silently-wrong submission status.
**Why it happens:** `text` columns per project convention have no DB-level constraint (by design — forward compatibility).
**How to avoid:** Enforce the enum at the Zod layer. The `submissionStatusEnum` Zod schema (`z.enum(['pending', 'approved', 'rejected', 'hidden'])`) must be used for all reads and writes. Write a unit test checking that only valid enum values can be INSERT-ed (mock the Zod parse and verify rejection).
**Warning signs:** Any `db.insert(submissions).values({ status: someRawString })` without a prior Zod parse.

### Pitfall 8: Super-Editor Demotion Removes Last Super-Editor

**What goes wrong:** Operator demotes the only `super_editor`, locking themselves out of role management.
**Why it happens:** The `revokeEditor` Server Action does not check remaining super_editor count.
**How to avoid:** The `assertLastSuperEditorGuard` function runs before any `revokeEditor` or `user_unsuspend` action that would reduce the `super_editor` count to zero. This is enforced server-side, not just UI-side.
**Warning signs:** `revokeEditor` Server Action without a COUNT check.

---

## Schema Design

### DDL for New Tables (apply via Neon SQL Editor — NOT via `payload migrate`)

All DDL is raw SQL. Run each statement in Neon SQL Editor console. After running, add a corresponding Drizzle schema file so the ORM has TypeScript types.

```sql
-- 1. Add status and role columns to users table (if not already present)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';
  -- Note: existing 'role' column in auth.ts is already used for sector/role;
  -- CONFIRM the column name does not conflict. auth.ts has 'role' for member role (owner/manager/employee/other).
  -- D-A2 says users.role stores editor/super_editor — this is a DIFFERENT field from the existing 'role'.
  -- Name the new column 'app_role' to avoid conflict, OR confirm Phase 3/4 use a separate column.
  -- SEE OPEN QUESTION #1 below.

-- 2. submissions table (covers both proposals and problem_reports)
CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,               -- 'proposal' | 'problem'
  submitter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected' | 'hidden'
  title text,                       -- proposals only (nullable for problems)
  body text NOT NULL,
  topic text NOT NULL,
  level text,                       -- problems only: 'local' | 'national'
  oblast text,                      -- problems only (ISO 3166-2:BG code when level='local')
  moderator_note text,              -- populated on reject/approve
  created_at timestamptz NOT NULL DEFAULT NOW(),
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS submissions_submitter_idx ON submissions(submitter_id);
CREATE INDEX IF NOT EXISTS submissions_status_kind_idx ON submissions(status, kind);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions(created_at DESC);

-- 3. moderation_log table (append-only — see REVOKE below)
CREATE TABLE IF NOT EXISTS moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,             -- 'submission_approve'|'submission_reject'|'user_suspend'|
                                    -- 'user_unsuspend'|'editor_grant'|'editor_revoke'|
                                    -- 'super_editor_override'|'idea_display_freeze'|'idea_display_unfreeze'|
                                    -- 'vote_exclude' (Phase 3 re-activation)
  actor_user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
  target_kind text NOT NULL,        -- 'submission'|'user'|'votes'|'idea'
  target_id uuid,
  target_ids uuid[],
  note text,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS moderation_log_actor_idx ON moderation_log(actor_user_id);
CREATE INDEX IF NOT EXISTS moderation_log_target_idx ON moderation_log(target_id);
CREATE INDEX IF NOT EXISTS moderation_log_created_at_idx ON moderation_log(created_at DESC);

-- 4. Enforce append-only at DB level (MUST run as a DB superuser, not the app user)
REVOKE UPDATE, DELETE ON TABLE moderation_log FROM <app_db_user_name>;
-- Also for audit consistency, consider:
-- REVOKE UPDATE ON TABLE submissions FROM <app_db_user_name>;
-- (UPDATE is needed for status transitions, so only DELETE is revoked for submissions)
REVOKE DELETE ON TABLE submissions FROM <app_db_user_name>;
```

### Drizzle Schema (TypeScript types for the above)

```typescript
// src/db/schema/submissions.ts
import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './auth';

export const submissions = pgTable('submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: text('kind').notNull(),
  submitter_id: uuid('submitter_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('pending'),
  title: text('title'),
  body: text('body').notNull(),
  topic: text('topic').notNull(),
  level: text('level'),
  oblast: text('oblast'),
  moderator_note: text('moderator_note'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  reviewed_at: timestamp('reviewed_at', { withTimezone: true }),
  reviewer_id: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
});

export const moderation_log = pgTable('moderation_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: text('action').notNull(),
  actor_user_id: uuid('actor_user_id').references(() => users.id, { onDelete: 'restrict' }),
  target_kind: text('target_kind').notNull(),
  target_id: uuid('target_id'),
  target_ids: text('target_ids').array(), // Drizzle array type
  note: text('note'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Note on role storage: the `users` table schema (`src/db/schema/auth.ts`) currently has a `role` column as `text` used for member roles ('owner', 'manager', 'employee', 'other' from D-10). D-A2 says Phase 4 stores `editor` / `super_editor` in `users.role`. **See Open Question #1 below** — the column name conflict must be resolved before DDL is finalized.

---

## Oblast Picker (PROB-03)

The 28-oblast canonical list already exists at `src/lib/oblast-names.ts` as `OBLAST_NAMES: Record<string, string>` (ISO codes → Bulgarian display names). [VERIFIED: source code read]

**GeoIP auto-suggestion flow:**
1. Server Component for `/member/сигнализирай/page.tsx` calls `src/lib/geoip.ts` (Phase 2.1) with the request IP.
2. GeoLite2 returns an ISO code (e.g., `'BG-16'`).
3. The RSC passes `defaultOblast={oblastDisplayName(isoCode)}` as a prop to the `ProblemReportForm` Client Component.
4. Client pre-populates the `<Select>` initial value — no client-side fetch.
5. Member confirms or overrides.

The `level` RadioGroup defaults to "local" (most common case). When "national" is selected, the oblast Select unmounts (`aria-hidden + disabled`) with CSS transition.

```typescript
// In /member/сигнализирай/page.tsx (RSC):
import { headers } from 'next/headers';
import { lookupIp } from '@/lib/geoip';

export default async function SignaliziraiPage() {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const geoResult = await lookupIp(ip);
  const suggestedOblast = geoResult?.isoCode ?? null; // ISO code or null

  return <ProblemReportForm defaultOblastCode={suggestedOblast} />;
}
```

The Select options are generated from `Object.entries(OBLAST_NAMES)` filtering out `'unknown'`. Labels are the Bulgarian display names; values are ISO codes (what gets stored in the DB).

---

## DSA Article 16 — Minimum Compliance

**Applicability:** Article 16 applies to ALL providers of hosting services regardless of size. There is no small-platform exemption. [VERIFIED: WebFetch of DSA Art.16 text]

**What Art.16 requires for this platform:**

| Requirement | Minimum Implementation |
|-------------|------------------------|
| Notice mechanism (electronic, easy to access) | "Сигнализирай за неподходящо съдържание" button/link on public pages + `/report` form route |
| Substantiated notice (content URL + reason) | Form fields: content location (URL or description) + category of violation + good-faith statement checkbox |
| Acknowledgement of receipt | Email or on-screen confirmation after submission |
| Decision notification | When editor acts on a report, send status-change email to reporter |
| Non-arbitrary processing | Editorial decision is documented in `moderation_log` with `action='dsa_report_review'` |

**Minimum-viable implementation for Phase 4:**

A `<ReportContentButton>` component on the `/предложения` page and each ProposalCard that opens a small Dialog with a textarea ("Опиши причината за сигнализиране") + a dropdown of violation categories + a checkbox "Потвърждавам, че докладвам добросъвестно". On submit, a Server Action creates a `moderation_log` row with `action='dsa_report'` and `target_kind='submission'` + `target_id=submissionId` and also creates a `submissions` row with `kind='dsa_report'` (or a dedicated `dsa_reports` table — planner's discretion). The reporter receives an on-screen confirmation ("Сигналът ти беше получен. Ще те уведомим за решението.") and an email. The editor sees DSA reports in the moderation queue filtered as a separate tab.

**CONTEXT.md defers the scope decision to the planner:** If implementing the above would take more than 1-2 plans, the planner should flag this as a follow-up question. The absolute minimum (a footer email link `report-content@chastnik.eu`) is legally defensible but operationally weak — the `moderation_log` + queue approach is better.

**V2-COMPL-01 (REQUIREMENTS.md):** Transparency reports are explicitly deferred to V2. Phase 4 does not need to publish a transparency report.

---

## bg.json String Registry

All 36+ strings from UI-SPEC §Copywriting Contract plus the DSA report strings must be locked into `messages/bg.json` BEFORE any JSX or Server Action references them (D-25 / Phase 3 plan 03-01 pattern).

The following namespaces are new for Phase 4:

| Namespace | Keys | Notes |
|-----------|------|-------|
| `submission.proposals.*` | `pageTitle`, `pageDescription`, `votingSoon`, `anonymousByline`, `emptyHeading`, `emptyBody`, `emptyCta` | Public proposals page strings |
| `submission.proposal.*` | `formTitle`, `formDescription`, `submitCta`, `successToast` | Proposal submission form |
| `submission.myProposals.*` | `pageTitle`, `emptyHeading`, `emptyBody` | Member my-proposals page |
| `submission.problem.*` | `formTitle`, `formDescription`, `submitCta`, `successToast` | Problem report form |
| `submission.myProblems.*` | `pageTitle`, `emptyHeading`, `emptyBody` | Member my-signals page |
| `submission.status.*` | `pending`, `approved`, `rejected`, `rejectionNotePrefix` | Status badge labels |
| `submission.error.*` | `rateLimit` | Rate-limit error (has `{n}` interpolation) |
| `submission.gate.*` | `unverified`, `suspended` | Auth gate messages |
| `submission.topics.*` | 7 topic labels + `other` | Must match problem report topics exactly |
| `problem.heatmap.*` | `pageTitle`, `pageDescription`, `suppressed`, `emptyBody` | Heat-map page |
| `problem.anonymousByline` | `"Анонимен сигнал"` | D-C1 canonical string |
| `admin.queue.*` | `pageTitle`, `pendingSummary`, `tabProposals`, `tabProblems`, `reviewAction` | Moderation queue admin view |
| `admin.moderation.*` | `approveHeading`, `approveBody`, `approveDismiss`, `approveAction`, `rejectHeading`, `rejectBody`, `rejectDismiss`, `rejectAction`, `suspendHeading`, `suspendBody`, `suspendDismiss`, `suspendAction` | Confirmation dialogs |
| `admin.suspended.*` | Gate copy for suspended-account page | New page `/suspended` |
| `dsa.report.*` | `buttonLabel`, `heading`, `categoryLabel`, `reasonLabel`, `goodFaithLabel`, `submitCta`, `successMessage` | DSA Art.16 reporting form |

**Topic taxonomy (shared between proposals and problem reports):**

The UI-SPEC lists 7 topics as placeholders. These must be finalized during Wave 0 (bg.json lock plan). The provisional list (to be confirmed with coalition):

1. `taxes` → "Данъчна тежест"
2. `admin_barriers` → "Административни пречки"
3. `financing` → "Достъп до финансиране"
4. `labor` → "Трудов пазар"
5. `digitalization` → "Цифровизация"
6. `energy` → "Енергийни разходи"
7. `other` → "Друго"

These keys match the placeholder labels in UI-SPEC §S3/S4. They must be the same list in both forms (proposals and problem reports) per UI-SPEC note "must be aligned with the problem report topic list for cross-surface consistency."

---

## Environment Availability

Phase 4 introduces no new external dependencies. All required tools are verified present.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Neon PostgreSQL (Frankfurt) | All DB operations | Yes (operational) | PostgreSQL 16 | — |
| Upstash Redis | Rate limiting submissions | Yes (operational from Phase 1) | latest | Dev bypass exists in rate-limit.ts |
| Cloudflare Turnstile (test keys) | Anti-bot on forms | Yes (test keys configured in Phase 1) | JS snippet | Test key bypass in CI |
| MaxMind GeoLite2 (`src/lib/geoip.ts`) | PROB-03 GeoIP suggestion | Yes (operational from Phase 2.1) | mmdb in Docker image | Returns null; Select has no default |
| BullMQ + Redis worker | Status-change emails | Yes (Phase 5 shipped) | operational | Queue without worker = silent drop |
| Payload CMS admin | EDIT-04 custom view | Yes (3.84.1) | 3.84.1 [VERIFIED] | — |
| shadcn new components | UI | badge/separator/skeleton/table/textarea | Installable via npx | — |

**Missing dependencies with no fallback:** None.

---

## Validation Architecture

`workflow.nyquist_validation` is `true` in `.planning/config.json`. [VERIFIED: config.json read]

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest + Playwright |
| Config file | `vitest.config.ts` (exists from Phase 1) + `playwright.config.ts` (exists from Phase 1) |
| Quick run command | `pnpm test:unit` (unit) / `pnpm test:integration` (integration) |
| Full suite command | `pnpm test` |
| Playwright command | `pnpm test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command / File | Notes |
|--------|----------|-----------|--------------------------|-------|
| PROP-01 | Proposal submission goes to DB with status='pending' | Unit | `tests/unit/submission-schema.test.ts` | Schema invariant test (mirrors attribution-schema.test.ts) |
| PROP-01 | Turnstile verification blocks without valid token | Unit | `tests/unit/submission-actions.test.ts` | Mock Turnstile API; assert rejection |
| PROP-01 | Rate limit blocks after N submissions | Unit | `tests/unit/submission-rate-limit.test.ts` | Mock Upstash; assert limitResult.success=false triggers error |
| PROP-02 | New submissions have status='pending'; no public API returns them | Unit | `tests/unit/submission-schema.test.ts` | Assert default value in schema |
| PROP-03 | Member can only read their own submissions (not others') | Unit | `tests/unit/submission-access.test.ts` | Assert Drizzle query filter uses `where(eq(submissions.submitter_id, userId))` |
| PROP-04 | Public /предложения only shows status='approved' submissions | Unit | `tests/unit/submission-public-query.test.ts` | Assert query WHERE clause includes `status='approved'` |
| PROP-04 | Public page renders "Член на коалицията" (not real name) | E2E | `tests/e2e/proposals-public.spec.ts` | Assert no `full_name` text appears; assert "Член на коалицията" appears |
| PROB-01 | Problem report with level='local' requires non-null oblast | Unit | `tests/unit/submission-actions.test.ts` | Zod parse with level='local' and null oblast → validation error |
| PROB-02 | Level field is either 'local' or 'national' (Zod enum) | Unit | `tests/unit/submission-actions.test.ts` | Assert Zod rejects invalid values |
| PROB-03 | Oblast Select options match OBLAST_NAMES keys (28 oblasts) | Unit | `tests/unit/oblast-picker.test.ts` | Assert array length = 28; assert values match OBLAST_NAMES keys |
| PROB-04 | Problem reports go to moderation queue with status='pending' | Unit | `tests/unit/submission-schema.test.ts` | kind='problem' default status='pending' |
| PROB-05 | Member status page only shows their own submissions | Unit | `tests/unit/submission-access.test.ts` | Same as PROP-03 |
| EDIT-03 | Payload Ideas collection CRUD accessible to editor/super_editor | Unit | `tests/unit/ideas-collection.test.ts` | Assert isEditorOrSuperEditor returns true for correct roles |
| EDIT-04 | Moderation queue view gate blocks non-editors | Unit | `tests/unit/moderation-queue-role-gate.test.ts` | Assert role check in ModerationQueueView |
| EDIT-05 | Approve action sets status='approved' + inserts moderation_log | Integration | `tests/integration/moderation-actions.test.ts` | Mock DB; assert two writes (UPDATE submissions + INSERT moderation_log) |
| EDIT-05 | Reject action requires non-empty moderator_note | Unit | `tests/unit/moderation-actions.test.ts` | Zod parse with empty note → validation error |
| EDIT-06 | Suspend action sets users.status='suspended' + inserts moderation_log | Integration | `tests/integration/moderation-actions.test.ts` | Mock DB; assert two writes |
| EDIT-06 | Suspended member is redirected at member/layout | Unit | `tests/unit/suspended-gate.test.ts` | Mock auth() returning user with status='suspended'; assert redirect('/suspended') |
| EDIT-07 | Attribution view role gate still accepts 'editor' and 'super_editor' | Unit | `tests/unit/role-gate.test.ts` (existing — extend) | Add 'super_editor' to expected-pass list |
| D-A2 | Last super_editor cannot be demoted | Unit | `tests/unit/super-editor-guard.test.ts` | Mock DB count=1; assert revokeEditor throws |
| D-D2 | Heat-map query suppresses oblasts with N<5 | Unit | `tests/unit/heatmap-suppression.test.ts` | Assert HAVING COUNT >= 5 in query (string match on SQL or mock DB result) |
| D-C1 | moderation_log rows are INSERT-only (no UPDATE/DELETE) | Unit | `tests/unit/moderation-log-schema.test.ts` | Mirror attribution-schema.test.ts; assert no UPDATE/DELETE in moderation-actions.ts |

### Wave 0 Gaps (must exist before implementation plans)

- [ ] `tests/unit/submission-schema.test.ts` — schema invariants for submissions table (no raw PII in wrong places, correct defaults)
- [ ] `tests/unit/submission-actions.test.ts` — Zod validation for submitProposal / submitProblemReport
- [ ] `tests/unit/submission-access.test.ts` — submitter_id filter isolation
- [ ] `tests/unit/moderation-actions.test.ts` — Zod validation for approveSubmission / rejectSubmission (non-empty note)
- [ ] `tests/unit/moderation-queue-role-gate.test.ts` — role check in ModerationQueueView
- [ ] `tests/unit/super-editor-guard.test.ts` — last super_editor guard
- [ ] `tests/unit/heatmap-suppression.test.ts` — N<5 suppression logic
- [ ] `tests/unit/suspended-gate.test.ts` — member layout suspended-account redirect
- [ ] `tests/e2e/proposals-public.spec.ts` — public /предложения page (no PII, correct copy)
- [ ] `tests/e2e/submission-forms.spec.ts` — proposal form + problem report form E2E flows (auth required, success redirect)
- [ ] `tests/integration/moderation-actions.test.ts` — approve/reject/suspend double-write (submissions + moderation_log)

### Sampling Rate

- **Per task commit:** `pnpm test:unit` (< 30 seconds)
- **Per wave merge:** `pnpm test` (unit + integration)
- **Phase gate:** `pnpm test && pnpm test:e2e` before `/gsd-verify-work`

---

## Security Domain

`security_enforcement` is not explicitly `false` in config.json — treated as enabled. ASVS Level 1.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Auth.js v5 session check in member/layout.tsx + Server Actions |
| V3 Session Management | Yes | Suspended-account gate in member/layout.tsx (session token does not embed status — documented tradeoff) |
| V4 Access Control | Yes | `assertEditorOrAdmin` / `assertSuperEditor` in all editorial Server Actions; Drizzle query filter by `submitter_id` for member reads |
| V5 Input Validation | Yes | Zod schemas for all Server Action inputs (proposal title/body/topic, problem body/topic/level/oblast, moderator note) |
| V6 Cryptography | No new requirements | No new secrets introduced; Turnstile secret already in env |
| V7 Error Handling | Yes | Server Actions return typed error objects (not raw exceptions) to avoid leaking stack traces |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sockpuppet submission spam | Spoofing + Denial | Upstash rate-limit per user_id (sliding window); Turnstile per submission |
| IDOR: member reads others' submissions | Information Disclosure | Drizzle query always filters `WHERE submitter_id = session.user.id`; no UUID-guessing path |
| Submitter identity leak on public surface | Information Disclosure | D-C1 enforced; public query selects only title/body/topic/approved_at; unit test asserts |
| Privilege escalation: editor grants self super_editor | Elevation of Privilege | `grantEditor` action requires `assertSuperEditor` gate; cannot self-escalate |
| Audit log tampering | Tampering | DB-level `REVOKE UPDATE, DELETE` on moderation_log |
| DSA report flood (DoS against moderation queue) | Denial | Rate-limit DSA report endpoint same as submission forms; require auth for reporting |
| Suspended account bypasses gate via direct Server Action call | Security bypass | `assertNotSuspended(userId)` called inside EACH submission Server Action independently of layout |

---

## Open Questions

1. **`users.role` column naming conflict**
   - What we know: `src/db/schema/auth.ts` has a `role: text('role')` column for member roles ('owner', 'manager', 'employee', 'other') per D-10. D-A2 says Phase 4 stores 'editor'/'super_editor' in `users.role`.
   - What's unclear: Are D-A2's 'editor'/'super_editor' values intended to REPLACE the member-role values in the same column, or is a SECOND column needed (e.g., `app_role`)? The attribution view and role-gate check `user.role` against `['admin', 'editor']` — so Phase 2.1 already overloaded this column. The Payload Users collection likely has its own `role` field used for Payload admin access.
   - Recommendation: Confirm that `users.role` is the SINGLE role field used for BOTH member-type ('owner', 'manager') and platform-role ('editor', 'super_editor', 'member'). Most members will have role='member' (default); operators have 'editor' or 'super_editor'. The current column values ('owner', 'manager', 'employee', 'other') are SEPARATE from the platform role — they describe the person's business role. Add a NEW column `users.platform_role text NOT NULL DEFAULT 'member'` to avoid confusion. **Planner must resolve this before DDL.**

2. **SVG Bulgaria Map Source**
   - What we know: UI-SPEC says "Reuses the SVG oblast outline already present in Phase 2.1 attribution dashboard (`/admin/views/attribution`)."
   - What's unclear: The attribution dashboard source code does not show an SVG map component — it shows tabular data. The SVG map may exist as an asset file not yet visible in the reviewed code.
   - Recommendation: Planner should `find src -name "*.svg"` and check if a Bulgaria choropleth SVG exists. If not, source from an open-license SVG (Wikipedia Commons ISO 3166-2:BG SVG). This is a Wave 0 task if the asset is missing.

3. **Agitation pages (EDIT-03) — Payload collection or existing pattern?**
   - What we know: EDIT-03 requires editors to create/edit/publish agitation pages (PUB content) from admin. Phase 2 built static pages; Payload doesn't yet have a Pages collection.
   - What's unclear: Should Phase 4 add a Payload Pages collection for PUB content, or is EDIT-03 satisfied by the existing Payload admin ability to edit any collection (e.g., just giving editors access to the existing content areas)?
   - Recommendation: A minimal `Pages` Payload collection with Lexical editor + status field satisfies EDIT-03. Planner can scope this conservatively: editors manage the agenda/static content via Payload CMS global fields rather than a per-page collection. Flag for planner decision.

4. **Notification cadence for status-change emails**
   - What we know: Phase 5 BullMQ worker is operational; React Email templates exist; `email.submissionStatus.*` namespace is reserved.
   - What's unclear: Should Phase 4 implement the submission-status email immediately (adding a new BullMQ job kind) or defer to Phase 5 follow-on?
   - Recommendation: Implement a minimal status-change email in Phase 4 using the existing BullMQ queue. The worker already handles multiple job kinds — adding `submission-status` follows the established pattern with zero new infrastructure.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The SVG Bulgaria choropleth map asset already exists in the codebase from Phase 2.1 (per UI-SPEC §S2 note) | Oblast Picker / OblastMap component | If absent: need to source an open-license SVG; adds ~1 plan for map asset acquisition and OblastMap component build |
| A2 | `users.role` column in auth.ts is the same column the role-gate checks against (`['admin', 'editor']`) | Schema Design, Open Question #1 | If there are TWO separate role concepts: need a new `platform_role` column with DDL migration; Open Question #1 must be resolved first |
| A3 | Phase 5 BullMQ worker `src/jobs/blast-worker.tsx` supports adding new job kinds without worker restart (hot-registration) | Status-change email pattern | If job-kind registration requires code change + deploy: the email notification plan must include a worker update plan |
| A4 | DSA Art.16 applies to this platform as a "hosting service" under EU law | DSA Compliance section | [LOW risk] — platform hosts user-submitted content (proposals, problem reports) which meets the hosting service definition |

**Verified claims require no user confirmation. Only A1 and A2 should be spot-checked before final DDL is written.**

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Payload migrate CLI for DDL | Manual Neon SQL Editor | Phase 1 (tsx/Node 22 ESM issue) | Every new table/column requires hand-written DDL |
| `pgEnum` for status/kind columns | `text` column + Zod enum at API layer | Phase 1 convention | Adding enum values never requires DDL (text columns) |
| `next-intl useTranslations()` in Payload admin | Direct `bg.json` import | Phase 2.1 (attribution dashboard) | Stable — no Provider dependency in Payload shell |
| Payload Users collection for auth roles | Auth.js session + Drizzle `users.role` | Phase 1 | Single identity source; Payload admin users are a subset of app users |

**Deprecated/outdated:**
- `import { assertEditorOrAdmin }` from `src/lib/auth/role-gate.ts` currently only checks for `['admin', 'editor']` — Phase 4 must extend this list to include `'super_editor'` or create a parallel `assertEditorOrSuperEditor()` function that accepts all three values.

---

## Sources

### Primary (HIGH confidence)
- `src/app/(payload)/admin/views/attribution/AttributionView.tsx` — Payload custom view pattern (DefaultTemplate + Gutter + role gate + bg.json direct import)
- `src/collections/Newsletters.ts` — Payload collection with Lexical editor + access control + hooks
- `src/lib/rate-limit.ts` — Upstash Ratelimit pattern for member-facing Server Actions
- `src/lib/auth/role-gate.ts` — `assertEditorOrAdmin` pattern for Server Action protection
- `src/app/(frontend)/member/layout.tsx` — Auth.js session gate pattern
- `src/db/schema/auth.ts` — Users table schema (verified role/status column state)
- `src/db/schema/consents.ts` — Append-only table pattern (application-level convention)
- `src/lib/oblast-names.ts` — Canonical 28-oblast list (ISO 3166-2:BG)
- `src/payload.config.ts` — Custom view registration pattern (`admin.components.views`)
- `src/middleware.ts` — Edge constraint (no DB imports allowed)
- Context7 `/payloadcms/payload` — AdminViewServerProps, DefaultTemplate, Gutter, custom view registration patterns [VERIFIED via npx ctx7]
- `npm view payload version` → 3.84.1 [VERIFIED]
- `npm view drizzle-orm version` → 0.45.2 [VERIFIED]
- `npm view next version` → 16.2.6 [VERIFIED]

### Secondary (MEDIUM confidence)
- EU Digital Services Act Article 16 text via `eu-digital-services-act.com` — confirmed Art.16 applies to all hosting services without size exemption [VERIFIED: WebFetch]
- `04-CONTEXT.md` decisions D-A1, D-A2, D-B1, D-C1, D-D1, D-D2 — locked planning decisions
- `04-UI-SPEC.md` (6/6 PASS approved) — locked component inventory, string table, surface specs

### Tertiary (LOW confidence — assumed)
- DSA Art.16 "statement of reasons" and "internal complaint mechanism" requirements: research confirms notice-and-action is required; whether this platform needs a formal statement of reasons for every decision is unclear from the text read (Recital 50 implies statements of reasons are required when notifier is a natural person with contact details — likely applies to this platform's user base) [ASSUMED: that a simple email confirmation satisfies the "notification of decision" requirement]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via source code; no new packages
- Architecture: HIGH — all patterns are established and running in production from prior phases
- Schema design: HIGH — DDL follows verified Drizzle + Neon SQL pattern from Phases 1, 2.1, 5
- DSA compliance: MEDIUM — Art.16 applicability verified; minimum implementation approach is planner's discretion per CONTEXT.md
- SVG map availability: LOW — UI-SPEC claims it exists from Phase 2.1; source code review did not find it explicitly

**Research date:** 2026-05-10
**Valid until:** 2026-07-10 (stack is stable; Payload 3.84.x is current)
