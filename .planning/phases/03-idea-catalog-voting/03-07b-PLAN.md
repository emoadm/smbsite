---
phase: 03-idea-catalog-voting
plan: 07b
type: execute
wave: 3
depends_on: ["03-01", "03-02", "03-03", "03-04", "03-07a"]
files_modified:
  - src/app/(payload)/admin/views/vote-anomalies/ExcludeVotesDialog.tsx
  - src/app/(payload)/admin/views/vote-anomalies/write-actions.ts
  - src/components/payload/IdeaSidebar.tsx
  - src/components/payload/FreezeToggleClient.tsx
  - src/components/payload/ViewOnSiteButton.tsx
  - src/components/payload/AnomalyBadge.tsx
  - src/app/actions/freeze-idea.ts
  - src/app/actions/exclude-votes.ts
  - src/lib/voting/cache.ts
  - tests/integration/admin-vote-exclude.test.ts
  - tests/e2e/admin-ideas-collection.spec.ts
autonomous: false
requirements: [EDIT-01, EDIT-02, OPS-04]
threat_ids: [T-03-07b-01, T-03-07b-02, T-03-07b-03, T-03-07b-04]

must_haves:
  truths:
    - "Editor logging into Payload admin sees Ideas collection with sidebar showing live stats + freeze toggle + last 5 events"
    - "Editor clicks 'Виж как изглежда на сайта' to open /idei/{slug}?preview=draft in new tab (published → /idei/{slug})"
    - "Editor selects votes (in 03-07a dashboard) + clicks 'Изключи избраните гласове' → confirmation dialog → DELETE from votes + INSERT moderation_log action='vote_exclude'"
    - "Editor toggles freeze/unfreeze → idea.display_frozen flips + INSERT moderation_log row + cache.ts gates display_frozen so public reads `revealed: false` (silent — D-23)"
    - "Editor dismisses or acts on anomaly → vote_anomalies.status flips + moderation_log row written"
    - "Inline anomaly count badge appears on the Payload Ideas list rows for ideas with unresolved anomalies"
    - "Manual editor walkthrough completes: create + publish idea, freeze, dismiss anomaly, bulk-exclude votes — all 11 steps"
  artifacts:
    - path: "src/app/(payload)/admin/views/vote-anomalies/write-actions.ts"
      provides: "Write Server Actions: dismissAnomaly, actAnomaly (writes vote_anomalies.status + moderation_log)"
      exports: ["dismissAnomaly", "actAnomaly"]
    - path: "src/app/actions/freeze-idea.ts"
      provides: "freezeIdea / unfreezeIdea Server Actions writing moderation_log + flipping idea.display_frozen"
      exports: ["freezeIdea", "unfreezeIdea"]
    - path: "src/app/actions/exclude-votes.ts"
      provides: "excludeVotes bulk action (DELETE votes rows + INSERT moderation_log with target_ids[])"
      exports: ["excludeVotes"]
    - path: "src/components/payload/IdeaSidebar.tsx"
      provides: "Server-rendered admin sidebar with live stats + freeze toggle + recent events"
      exports: ["IdeaSidebar"]
    - path: "src/components/payload/FreezeToggleClient.tsx"
      provides: "Client island for the freeze toggle (calls freezeIdea/unfreezeIdea)"
      exports: ["FreezeToggleClient"]
    - path: "src/components/payload/ViewOnSiteButton.tsx"
      provides: "Open-on-site button (preview=draft for unpublished, /idei/{slug} for published)"
      exports: ["ViewOnSiteButton"]
    - path: "src/components/payload/AnomalyBadge.tsx"
      provides: "Inline list-cell badge showing unresolved anomaly count per idea"
      exports: ["AnomalyBadge"]
    - path: "src/lib/voting/cache.ts"
      provides: "Cross-plan modification: extend getCachedDisplayCounts to gate on display_frozen → revealed=false (silent freeze)"
      contains: "display_frozen"
  key_links:
    - from: "src/app/actions/exclude-votes.ts"
      to: "src/db/schema/moderation.ts (moderation_log)"
      via: "INSERT moderation_log action='vote_exclude' target_ids=[...]"
      pattern: "moderation_log"
    - from: "src/app/actions/freeze-idea.ts"
      to: "ideas.display_frozen + moderation_log"
      via: "UPDATE ideas + INSERT moderation_log"
      pattern: "display_frozen"
    - from: "src/lib/voting/cache.ts (modified)"
      to: "ideas.display_frozen"
      via: "SELECT display_frozen WHERE id = ${ideaId} → if frozen, return revealed: false"
      pattern: "display_frozen"
  art9_lawyer_opinion_gate:
    - "GDPR Art.9 lawyer opinion on file at .planning/legal/art9-opinion.md before merge to main"

user_setup:
  - service: payload-admin
    why: "After this plan ships, the operator should manually walk through editor-side flows once: create + publish an idea, freeze, dismiss anomaly, bulk-exclude votes."
    dashboard_config:
      - task: "Walk through Ideas authoring + freeze + bulk-exclude + anomaly review (EDIT-02 / OPS-04 sign-off)"
        location: "https://app.smbsite.eu/admin (production) or staging admin URL"
---

<objective>
Editor write-side surfaces: Ideas edit-screen sidebar (live stats + freeze toggle + recent events) + ViewOnSiteButton + inline AnomalyBadge on Ideas list + ExcludeVotesDialog + freezeIdea / excludeVotes / dismissAnomaly / actAnomaly Server Actions + cache.ts cross-modification for silent freeze + manual editor walkthrough.

Purpose: Splits the original plan 03-07 into read-only (03-07a) and write/walkthrough (this plan) per checker W-5. Delivers D-22 (Ideas sidebar), D-19 (preview button), D-23 (silent freeze via cache.ts gate), D-20 (bulk exclude), D-21 (moderation_log writes), D-12 (display_frozen flip on freeze).

Wave 3 strictly after 03-07a so the dashboard's bulk-select toolbar can wire into ExcludeVotesDialog. Both 03-07a and 03-07b live in Wave 3 — they touch DIFFERENT files (03-07a: View, Dashboard, actions.ts read-only; 03-07b: write-actions.ts, IdeaSidebar, freeze-idea, exclude-votes, ExcludeVotesDialog, cache.ts) so there is no file overlap.

Output:
- 1 admin dialog file (ExcludeVotesDialog)
- 1 admin write-actions file (dismissAnomaly, actAnomaly)
- 4 components/payload/* files (IdeaSidebar, FreezeToggleClient, ViewOnSiteButton, AnomalyBadge)
- 2 Server Actions (freezeIdea/unfreezeIdea, excludeVotes)
- 1 cross-plan cache.ts modification (display_frozen gate)
- 1 integration test + 1 e2e spec + 1 manual walkthrough checkpoint
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/03-idea-catalog-voting/03-CONTEXT.md
@.planning/phases/03-idea-catalog-voting/03-RESEARCH.md
@.planning/phases/03-idea-catalog-voting/03-PATTERNS.md
@.planning/phases/03-idea-catalog-voting/03-UI-SPEC.md
@.planning/phases/03-idea-catalog-voting/03-02-PLAN.md
@.planning/phases/03-idea-catalog-voting/03-03-PLAN.md
@.planning/phases/03-idea-catalog-voting/03-04-PLAN.md
@.planning/phases/03-idea-catalog-voting/03-07a-PLAN.md
@CLAUDE.md
@src/app/(payload)/admin/views/attribution/actions.ts
@src/lib/auth/role-gate.ts
@src/db/schema/voting.ts
@src/db/schema/moderation.ts
@src/lib/voting/cache.ts

<interfaces>
From plan 03-07a `src/app/(payload)/admin/views/vote-anomalies/`:
- VoteAnomaliesView, VoteAnomaliesDashboard (read-only) — consume the new ExcludeVotesDialog via callback prop
- actions.ts exports fetchVoteAnomalies, fetchVoteEventForensic

From src/lib/auth/role-gate.ts (Plan 05-01 export):
```typescript
async function assertEditorOrAdmin(): Promise<void> // throws on unauthorized
```

From plan 03-02 voting + moderation schema:
- vote_anomalies, vote_events_log, votes
- moderation_log: { id, action, actor_user_id, target_kind, target_id, target_ids[], note, created_at }

From plan 03-02 src/lib/voting/cache.ts (existing — modified by this plan):
```typescript
type DisplayCounts = { revealed: false; total: number; remaining: number } | { revealed: true; approve: number; reject: number; total: number; approvePct: number };
export async function getCachedDisplayCounts(ideaId: string): Promise<DisplayCounts>;
// MODIFIED HERE: prepend a SELECT display_frozen and short-circuit to revealed:false when frozen.
```

From src/components/payload/NewsletterComposer.tsx (existing — direct analog for IdeaSidebar mount style).
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: freezeIdea / unfreezeIdea + cache.ts cross-modification (silent freeze D-23)</name>
  <files>src/app/actions/freeze-idea.ts, src/lib/voting/cache.ts</files>
  <read_first>
    - src/app/(payload)/admin/views/attribution/actions.ts (admin Server Action shape)
    - .planning/phases/03-idea-catalog-voting/03-PATTERNS.md section "freeze-idea.ts" lines 718-767
    - .planning/phases/03-idea-catalog-voting/03-CONTEXT.md D-12 (freeze sets display_frozen) + D-21 (moderation_log schema) + D-23 (silent freeze)
    - src/lib/voting/cache.ts (existing — to be extended)
  </read_first>
  <action>
**File 1: src/app/actions/freeze-idea.ts**

```typescript
'use server';

import { z } from '@/lib/zod-i18n';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { moderation_log } from '@/db/schema/moderation';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { logger } from '@/lib/logger';

const FreezeInput = z.object({ ideaId: z.string().uuid(), note: z.string().optional() });

export async function freezeIdea(input: { ideaId: string; note?: string }) {
  await assertEditorOrAdmin();
  const session = await auth();
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  if (!actorId) return { ok: false as const, reason: 'forbidden' as const };
  const parsed = FreezeInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' as const };

  await db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE ideas SET display_frozen = true, updated_at = NOW() WHERE id = ${parsed.data.ideaId}`);
    await tx.insert(moderation_log).values({
      action: 'idea_display_freeze',
      actor_user_id: actorId,
      target_kind: 'idea',
      target_id: parsed.data.ideaId,
      note: parsed.data.note ?? null,
    });
  });
  logger.info({ event: 'idea_display_freeze', actor_user_id: actorId, idea_id: parsed.data.ideaId }, 'idea frozen');
  return { ok: true as const };
}

export async function unfreezeIdea(input: { ideaId: string; note?: string }) {
  await assertEditorOrAdmin();
  const session = await auth();
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  if (!actorId) return { ok: false as const, reason: 'forbidden' as const };
  const parsed = FreezeInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' as const };

  await db.transaction(async (tx) => {
    await tx.execute(sql`UPDATE ideas SET display_frozen = false, updated_at = NOW() WHERE id = ${parsed.data.ideaId}`);
    await tx.insert(moderation_log).values({
      action: 'idea_display_unfreeze',
      actor_user_id: actorId,
      target_kind: 'idea',
      target_id: parsed.data.ideaId,
      note: parsed.data.note ?? null,
    });
  });
  logger.info({ event: 'idea_display_unfreeze', actor_user_id: actorId, idea_id: parsed.data.ideaId }, 'idea unfrozen');
  return { ok: true as const };
}
```

**File 2: src/lib/voting/cache.ts** — CROSS-PLAN MODIFICATION (file owned by plan 03-02; this plan extends).

Read the existing `getCachedDisplayCounts` implementation. Prepend a `SELECT display_frozen` lookup and short-circuit to `revealed: false` when frozen. The cache key should NOT include `display_frozen` — the freeze flip simply means subsequent cache fills will short-circuit.

Reading D-23 + D-12 together: `display_frozen=true` causes the public surface to RENDER as if below threshold (silent — no banner). After the 5-min cache TTL expires, the next cache fill checks `display_frozen` and returns `revealed: false` if frozen. Within the TTL window, the cached count line continues to render — this is acceptable per D-23 (the catalog never lies about a count it already showed; it just stops revealing fresh updates).

```typescript
// Inside getCachedDisplayCounts, BEFORE the existing approve/reject COUNT(*) aggregate:
const ideaRow = await db.execute(sql`SELECT display_frozen FROM ideas WHERE id = ${ideaId}`);
const frozen = Boolean((ideaRow.rows[0] as { display_frozen?: boolean })?.display_frozen);
if (frozen) {
  // D-23 silent freeze: render as if below threshold.
  return { revealed: false, total: 0, remaining: REVEAL_THRESHOLD };
}
// ... existing aggregate query continues here
```

Note: REVEAL_THRESHOLD constant already exported from cache.ts (plan 03-02). Re-use it.

Update plan 03-02's existing tests if any pin the cache shape — confirm D-23 silent freeze is now covered by an integration test. If `tests/unit/idea-cache-no-bust.test.ts` (plan 03-05b) doesn't yet cover the freeze branch, add a new test in this plan's Task 4 covering the freeze gate.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "src/app/actions/freeze-idea\.ts|src/lib/voting/cache\.ts" | head -5; grep -c "display_frozen" src/lib/voting/cache.ts; grep -c "moderation_log" src/app/actions/freeze-idea.ts</automated>
  </verify>
  <acceptance_criteria>
    - freeze-idea.ts exists + type-checks
    - freezeIdea / unfreezeIdea both call assertEditorOrAdmin first
    - Both write moderation_log within a transaction
    - cache.ts modified to gate on `display_frozen` → return revealed:false (D-23 silent freeze)
    - Cross-plan modification documented in 03-07b-SUMMARY.md
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: excludeVotes Server Action + ExcludeVotesDialog + write-actions.ts (dismissAnomaly, actAnomaly)</name>
  <files>src/app/actions/exclude-votes.ts, src/app/(payload)/admin/views/vote-anomalies/ExcludeVotesDialog.tsx, src/app/(payload)/admin/views/vote-anomalies/write-actions.ts</files>
  <read_first>
    - src/app/(payload)/admin/views/attribution/actions.ts (admin Server Action shape)
    - .planning/phases/03-idea-catalog-voting/03-PATTERNS.md section "exclude-votes.ts" lines 718-767
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S10 ExcludeVotesDialog lines 610-644
    - .planning/phases/03-idea-catalog-voting/03-CONTEXT.md D-20 (bulk exclude) + D-21 (moderation_log schema)
  </read_first>
  <action>
**File 1: src/app/actions/exclude-votes.ts**

```typescript
'use server';

import { z } from '@/lib/zod-i18n';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { and, eq, inArray } from 'drizzle-orm';
import { votes, vote_events_log } from '@/db/schema/voting';
import { moderation_log } from '@/db/schema/moderation';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { logger } from '@/lib/logger';

const ExcludeInput = z.object({
  voteEventLogIds: z.array(z.string().uuid()).min(1).max(500),
  note: z.string().optional(),
});

export async function excludeVotes(input: { voteEventLogIds: string[]; note?: string }) {
  await assertEditorOrAdmin();
  const session = await auth();
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  if (!actorId) return { ok: false as const, reason: 'forbidden' as const };
  const parsed = ExcludeInput.safeParse(input);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' as const };

  await db.transaction(async (tx) => {
    // Look up the vote_events_log rows to get their (user_id, idea_id) pairs
    const events = await tx.select({
      id: vote_events_log.id,
      user_id: vote_events_log.user_id,
      idea_id: vote_events_log.idea_id,
    }).from(vote_events_log).where(inArray(vote_events_log.id, parsed.data.voteEventLogIds));

    // DELETE corresponding votes rows (vote_events_log untouched — audit preserved)
    for (const e of events) {
      if (e.user_id) {
        await tx.delete(votes).where(and(eq(votes.user_id, e.user_id), eq(votes.idea_id, e.idea_id)));
      }
    }

    // INSERT moderation_log row with action='vote_exclude', target_kind='votes', target_ids=[...]
    await tx.insert(moderation_log).values({
      action: 'vote_exclude',
      actor_user_id: actorId,
      target_kind: 'votes',
      target_ids: parsed.data.voteEventLogIds,
      note: parsed.data.note ?? null,
    });
  });
  logger.info({ event: 'vote_exclude', actor_user_id: actorId, n: parsed.data.voteEventLogIds.length }, 'votes excluded');
  return { ok: true as const, n: parsed.data.voteEventLogIds.length };
}
```

**File 2: src/app/(payload)/admin/views/vote-anomalies/ExcludeVotesDialog.tsx**

Per UI-SPEC §S10 lines 610-644. Use shadcn Dialog + Textarea + Buttons (variant outline + variant destructive). Read bg.json directly via `getAdminT('admin.votes')` per Phase 5 i18n-direct.ts pattern. Confirm button label includes the count via ICU `{n}` placeholder substitution.

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { excludeVotes } from '@/app/actions/exclude-votes';
import { getAdminT } from '@/lib/email/i18n-direct';

const t = getAdminT('admin.votes');

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  voteEventLogIds: string[];
  ideaTitle: string;
  onCompleted: () => void;
};

export function ExcludeVotesDialog({ open, onOpenChange, voteEventLogIds, ideaTitle, onCompleted }: Props) {
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const n = voteEventLogIds.length;
  const onConfirm = () => {
    startTransition(async () => {
      const result = await excludeVotes({ voteEventLogIds, note: note || undefined });
      if (result.ok) onCompleted();
      onOpenChange(false);
    });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <AlertTriangle className="text-warning size-5" />
            {t('confirmTitle')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('confirmBody', { n: String(n), title: ideaTitle })}
          </DialogDescription>
        </DialogHeader>
        <p className="text-base text-foreground font-semibold">{t('confirmWarning')}</p>
        <label className="block text-sm font-semibold">{t('confirmNoteLabel')}</label>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <DialogFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>{t('confirmCancel')}</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={pending}>
            {t('confirmConfirm', { n: String(n) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

NOTE: bg.json strings already shipped by plan 03-01; the Phase 5 i18n-direct `getAdminT` factory (note: ICU `{n}` placeholders, not `%{n}`) handles the variable substitution. Plan 03-01 task 1 used `{n}` placeholders in `admin.votes.confirmConfirm` etc. — confirm and align.

**File 3: src/app/(payload)/admin/views/vote-anomalies/write-actions.ts** — dismissAnomaly + actAnomaly.

```typescript
'use server';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { vote_anomalies } from '@/db/schema/voting';
import { moderation_log } from '@/db/schema/moderation';
import { logger } from '@/lib/logger';

export async function dismissAnomaly(input: { anomalyId: string; note?: string }): Promise<{ ok: boolean }> {
  await assertEditorOrAdmin();
  const session = await auth();
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  if (!actorId) return { ok: false };
  await db.transaction(async (tx) => {
    await tx.update(vote_anomalies).set({ status: 'dismissed', resolved_at: new Date(), resolved_by: actorId, resolution_note: input.note ?? null }).where(eq(vote_anomalies.id, input.anomalyId));
    await tx.insert(moderation_log).values({
      action: 'vote_anomaly_dismiss',
      actor_user_id: actorId,
      target_kind: 'anomaly',
      target_id: input.anomalyId,
      note: input.note ?? null,
    });
  });
  logger.info({ event: 'vote_anomaly_dismiss', actor_user_id: actorId, anomaly_id: input.anomalyId }, 'anomaly dismissed');
  return { ok: true };
}

export async function actAnomaly(input: { anomalyId: string; note?: string }): Promise<{ ok: boolean }> {
  // Marks anomaly as 'acted' — typically called after editor performed freeze + exclude
  await assertEditorOrAdmin();
  const session = await auth();
  const actorId = (session?.user as { id?: string } | undefined)?.id;
  if (!actorId) return { ok: false };
  await db.transaction(async (tx) => {
    await tx.update(vote_anomalies).set({ status: 'acted', resolved_at: new Date(), resolved_by: actorId, resolution_note: input.note ?? null }).where(eq(vote_anomalies.id, input.anomalyId));
    await tx.insert(moderation_log).values({
      action: 'vote_anomaly_act',
      actor_user_id: actorId,
      target_kind: 'anomaly',
      target_id: input.anomalyId,
      note: input.note ?? null,
    });
  });
  logger.info({ event: 'vote_anomaly_act', actor_user_id: actorId, anomaly_id: input.anomalyId }, 'anomaly acted');
  return { ok: true };
}
```

**No PII in logs:** `actor_user_id` is pseudonymous; the anomaly_id / idea_id are uuids; no idea title or note content in the log line.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "src/app/actions/exclude-votes\.ts|ExcludeVotesDialog\.tsx|admin/views/vote-anomalies/write-actions\.ts" | head -5; grep -c "assertEditorOrAdmin" src/app/actions/exclude-votes.ts src/app/\(payload\)/admin/views/vote-anomalies/write-actions.ts; grep -nE '"[А-Яа-я]+' src/app/\(payload\)/admin/views/vote-anomalies/ExcludeVotesDialog.tsx | head -5 || echo "no inline Cyrillic"</automated>
  </verify>
  <acceptance_criteria>
    - 3 files exist + type-check
    - excludeVotes calls assertEditorOrAdmin first; deletes votes; vote_events_log untouched (audit preserved)
    - excludeVotes writes moderation_log with target_ids[] (D-21)
    - dismissAnomaly + actAnomaly both write status flip + moderation_log atomically
    - ExcludeVotesDialog renders Bulgarian via getAdminT — no inline Cyrillic
    - Final grep gate: `grep -nE '"[А-Яа-я]+' src/app/(payload)/admin/views/vote-anomalies/ExcludeVotesDialog.tsx` returns zero matches
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: IdeaSidebar + FreezeToggleClient + ViewOnSiteButton + AnomalyBadge — Payload edit-screen mountables</name>
  <files>src/components/payload/IdeaSidebar.tsx, src/components/payload/FreezeToggleClient.tsx, src/components/payload/ViewOnSiteButton.tsx, src/components/payload/AnomalyBadge.tsx</files>
  <read_first>
    - src/components/payload/NewsletterComposer.tsx (existing Payload custom-component shape — direct analog for IdeaSidebar mount style)
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S8 lines 476-542
    - .planning/phases/03-idea-catalog-voting/03-PATTERNS.md (section on Payload mounted components)
    - src/db/schema/voting.ts + moderation.ts (just-built)
    - src/lib/email/i18n-direct.ts (getAdminT pattern for Payload admin contexts)
  </read_first>
  <action>
**File 1: src/components/payload/IdeaSidebar.tsx** (server component)

Per UI-SPEC §S8 sidebar layout. Reads idea-level stats from Drizzle directly (NOT through unstable_cache — D-22 explicit: editor view does NOT hit the 5-min cache; refresh = page reload).

Use `getAdminT('admin.idea.sidebar')` for Bulgarian copy (Phase 5 i18n-direct pattern; bg.json keys already shipped by plan 03-01).

```tsx
import { getAdminT } from '@/lib/email/i18n-direct';
import { db } from '@/db';
import { sql, eq, desc } from 'drizzle-orm';
import { vote_events_log } from '@/db/schema/voting';
import Link from 'next/link';
import { FreezeToggleClient } from './FreezeToggleClient';

const t = getAdminT('admin.idea.sidebar');

export async function IdeaSidebar({ data }: { data?: { id?: string; display_frozen?: boolean } }) {
  if (!data?.id) return null;
  const ideaId = data.id;

  // Editor sees raw counts (D-02 / D-22 explicit)
  const counts = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM votes WHERE idea_id = ${ideaId})::int AS total,
      (SELECT COUNT(*) FROM votes WHERE idea_id = ${ideaId} AND choice = 'approve')::int AS approve,
      (SELECT COUNT(*) FROM votes WHERE idea_id = ${ideaId} AND choice = 'reject')::int AS reject
  `).then((r) => r.rows as Array<{ total: number; approve: number; reject: number }>);
  const total = counts[0]?.total ?? 0;
  const approve = counts[0]?.approve ?? 0;
  const reject = counts[0]?.reject ?? 0;
  const pct = total > 0 ? Math.round((approve / total) * 100) : 0;

  const recentEvents = await db.select({
    id: vote_events_log.id,
    action: vote_events_log.action,
    occurred_at: vote_events_log.occurred_at,
    fresh_account_at_event: vote_events_log.fresh_account_at_event,
  }).from(vote_events_log).where(eq(vote_events_log.idea_id, ideaId)).orderBy(desc(vote_events_log.occurred_at)).limit(5);

  const anomaliesCount = await db.execute(sql`
    SELECT COUNT(*)::int AS n FROM vote_anomalies WHERE idea_id = ${ideaId} AND status = 'unresolved'
  `).then((r) => (r.rows[0] as { n: number }).n);

  return (
    <aside className="w-[320px] sticky top-24 space-y-6 p-4 border-l">
      <div>
        <h3 className="font-display text-xl">{t('stats')}</h3>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between"><dt>{t('totalVotes')}</dt><dd className="[font-feature-settings:'tnum']">{total}</dd></div>
          <div className="flex justify-between"><dt>{t('approveLine')}</dt><dd className="[font-feature-settings:'tnum']">{approve} · {pct}%</dd></div>
          <div className="flex justify-between"><dt>{t('rejectLine')}</dt><dd className="[font-feature-settings:'tnum']">{reject}</dd></div>
          <div className="flex justify-between">
            <dt>{t('anomaliesLine')}</dt>
            <dd>
              {anomaliesCount > 0 ? (
                <Link href={`/admin/views/vote-anomalies?idea_id=${ideaId}`} className="inline-flex items-center rounded-md border border-warning/30 bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                  ⚠ {anomaliesCount}
                </Link>
              ) : '—'}
            </dd>
          </div>
        </dl>
      </div>

      <hr />

      <div>
        <h3 className="font-display text-xl">{t('freezeSection')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('freezeBlurb')}</p>
        <div className="mt-3">
          <FreezeToggleClient ideaId={ideaId} initialFrozen={Boolean(data.display_frozen)} />
        </div>
      </div>

      <hr />

      <div>
        <h3 className="font-display text-xl">{t('events')}</h3>
        <ul className="mt-3 space-y-1 text-sm">
          {recentEvents.map((e) => (
            <li key={e.id} className="flex items-center gap-2">
              <span className="font-mono text-xs">{e.action}</span>
              <span className="text-muted-foreground">{new Date(e.occurred_at).toLocaleTimeString('bg-BG')}</span>
              {e.fresh_account_at_event && <span className="text-warning">⚠</span>}
            </li>
          ))}
        </ul>
      </div>

      <hr />

      <Link href={`/admin/views/vote-anomalies?idea_id=${ideaId}`} className="text-sm text-primary underline-offset-4 hover:underline">
        {t('allAnomalies')} →
      </Link>
    </aside>
  );
}
```

**File 2: src/components/payload/FreezeToggleClient.tsx** — small client island for the toggle.

```tsx
'use client';
import { useState, useTransition } from 'react';
import { Toggle } from '@/components/ui/toggle';
import { freezeIdea, unfreezeIdea } from '@/app/actions/freeze-idea';
import { getAdminT } from '@/lib/email/i18n-direct';

const t = getAdminT('admin.idea');

export function FreezeToggleClient({ ideaId, initialFrozen }: { ideaId: string; initialFrozen: boolean }) {
  const [frozen, setFrozen] = useState(initialFrozen);
  const [pending, startTransition] = useTransition();
  const onPressedChange = (next: boolean) => {
    const prev = frozen;
    setFrozen(next);
    startTransition(async () => {
      const result = next ? await freezeIdea({ ideaId }) : await unfreezeIdea({ ideaId });
      if (!result.ok) setFrozen(prev);
      else window.location.reload(); // refresh sidebar stats
    });
  };
  return (
    <Toggle pressed={frozen} onPressedChange={onPressedChange} disabled={pending} variant="default">
      {frozen ? t('unfreeze') : t('freeze')}
    </Toggle>
  );
}
```

**File 3: src/components/payload/ViewOnSiteButton.tsx** (client component)

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { getAdminT } from '@/lib/email/i18n-direct';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const t = getAdminT('admin.idea');

export function ViewOnSiteButton({ data }: { data?: { slug?: string; status?: string } }) {
  if (!data?.slug) return null;
  const url = data.status === 'published' ? `/idei/${data.slug}` : `/idei/${data.slug}?preview=draft`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4 mr-2" />
            {t('viewOnSite')}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t('viewOnSiteTooltip')}</TooltipContent>
    </Tooltip>
  );
}
```

**File 4: src/components/payload/AnomalyBadge.tsx** (server component for Ideas list inline cell)

```tsx
import Link from 'next/link';
import { db } from '@/db';
import { sql } from 'drizzle-orm';

export async function AnomalyBadge({ ideaId }: { ideaId: string }) {
  const r = await db.execute(sql`SELECT COUNT(*)::int AS n FROM vote_anomalies WHERE idea_id = ${ideaId} AND status = 'unresolved'`);
  const n = (r.rows[0] as { n: number }).n;
  if (n === 0) return null;
  return (
    <Link href={`/admin/views/vote-anomalies?idea_id=${ideaId}`} className="inline-flex items-center rounded-md border border-warning/30 bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
      ⚠ {n}
    </Link>
  );
}
```

The Ideas collection edit screen mounts IdeaSidebar via `Description` slot (admin.components.edit.Description) per Payload conventions. Plan 03-03 already declared this slot string. Restart Payload after deploy so importMap re-resolves the path.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "src/components/payload/(IdeaSidebar|FreezeToggleClient|ViewOnSiteButton|AnomalyBadge)\.tsx" | head -5; grep -nE '"[А-Яа-я]+' src/components/payload/IdeaSidebar.tsx src/components/payload/FreezeToggleClient.tsx src/components/payload/ViewOnSiteButton.tsx src/components/payload/AnomalyBadge.tsx | head -5 || echo "no inline Cyrillic"</automated>
  </verify>
  <acceptance_criteria>
    - 4 files exist + type-check
    - IdeaSidebar reads stats DIRECTLY from Drizzle (not unstable_cache — D-22)
    - FreezeToggleClient calls freezeIdea / unfreezeIdea + reloads on success
    - ViewOnSiteButton opens preview=draft for unpublished, /idei/{slug} for published
    - AnomalyBadge renders only when unresolved anomalies > 0
    - All Bulgarian via getAdminT — no inline Cyrillic
    - Final grep gate: `grep -nE '"[А-Яа-я]+' src/components/payload/IdeaSidebar.tsx src/components/payload/FreezeToggleClient.tsx src/components/payload/ViewOnSiteButton.tsx src/components/payload/AnomalyBadge.tsx` returns zero matches
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: Integration + E2E tests for admin write actions</name>
  <files>tests/integration/admin-vote-exclude.test.ts, tests/e2e/admin-ideas-collection.spec.ts</files>
  <read_first>
    - tests/integration/ existing files (Phase 02.1 attribution integration patterns)
    - tests/e2e existing helpers (loginAsEditor pattern from Phase 5)
    - .planning/phases/03-idea-catalog-voting/03-RESEARCH.md section "Phase Requirements → Test Map" lines 1294-1298
  </read_first>
  <action>
**File 1: tests/integration/admin-vote-exclude.test.ts** — proves bulk vote-exclude writes moderation_log + DELETEs votes.

Pattern: fixture user + fixture idea + 5 cast votes; call `excludeVotes` Server Action with 3 of the 5 voteEventLogIds; assert votes table has 2 rows; assert moderation_log has one row with action='vote_exclude' + target_ids array of 3.

```typescript
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { db } from '@/db';
import { votes, vote_events_log } from '@/db/schema/voting';
import { moderation_log } from '@/db/schema/moderation';
import { eq, desc } from 'drizzle-orm';
import { excludeVotes } from '@/app/actions/exclude-votes';

vi.mock('@/lib/auth', () => ({ auth: () => ({ user: { id: 'fixture-admin', role: 'admin' } }) }));
vi.mock('@/lib/auth/role-gate', () => ({ assertEditorOrAdmin: async () => {} }));

describe('OPS-04 + D-21 — bulk vote-exclude writes moderation_log + DELETEs votes', () => {
  let userIds: string[];
  let ideaId: string;
  let logIds: string[];

  beforeAll(async () => {
    // Insert 5 fixture users + 1 idea + 5 votes + 5 vote_events_log
    // ... (same pattern as plan 03-04 integration test — DB cleanup in afterAll)
  });

  afterAll(async () => { /* cleanup */ });

  it.skipIf(!process.env.INTEGRATION_TEST_DSN)('excludeVotes deletes 3 votes + writes moderation_log target_ids[]', async () => {
    const toExclude = logIds.slice(0, 3);
    const result = await excludeVotes({ voteEventLogIds: toExclude, note: 'Test exclude' });
    expect(result.ok).toBe(true);

    // Only 2 votes remaining
    const remaining = await db.select().from(votes).where(eq(votes.idea_id, ideaId));
    expect(remaining).toHaveLength(2);

    // moderation_log row exists
    const logs = await db.select().from(moderation_log).where(eq(moderation_log.action, 'vote_exclude')).orderBy(desc(moderation_log.created_at)).limit(1);
    expect(logs[0].target_ids).toEqual(toExclude);
    expect(logs[0].note).toBe('Test exclude');

    // vote_events_log untouched (5 rows for the idea)
    const events = await db.select().from(vote_events_log).where(eq(vote_events_log.idea_id, ideaId));
    expect(events).toHaveLength(5);
  });
});
```

**File 2: tests/e2e/admin-ideas-collection.spec.ts** — EDIT-02 Ideas authoring + Lexical allowed-blocks.

```typescript
import { test, expect } from '@playwright/test';
import { loginAsEditor } from './helpers/auth-helpers';

test('editor creates Idea draft → slug auto-fills → publish → archived', async ({ page }) => {
  await loginAsEditor(page);
  await page.goto('/admin/collections/ideas/create');
  await page.getByLabel('title').fill('Тестова идея за E2E');
  // Confirm slug field auto-fills
  await expect(page.getByLabel('slug')).toHaveValue(/testova-idea-za-e2e/);
  // Topic select
  await page.getByLabel('topic').selectOption('taxes');
  // Body Lexical — confirm presence of toolbar buttons (h2, h3, link, ul, ol, bold, italic)
  await expect(page.getByRole('button', { name: /h2/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /h3/i })).toBeVisible();
  // Confirm absence of code / blockquote
  await expect(page.getByRole('button', { name: /code/i })).not.toBeVisible();
  // Save as draft, publish, archive — assert each transition succeeds
});
```

Mark e2e tests `test.skipIf` if the editor fixture isn't wired (Phase 5 should have it). Document fixture status in 03-07b-SUMMARY.md.
  </action>
  <verify>
    <automated>pnpm test:e2e tests/e2e/admin-ideas-collection.spec.ts --reporter=list 2>&1 | tail -25; pnpm test:unit -- tests/integration/admin-vote-exclude.test.ts --run 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - 2 test files exist
    - admin-ideas-collection.spec.ts proves Ideas authoring works end-to-end (or skip)
    - admin-vote-exclude.test.ts proves OPS-04 + D-21 bulk action (or skips with documented gap)
  </acceptance_criteria>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 5: Manual editor walkthrough — Ideas authoring + freeze + bulk-exclude + anomaly review</name>
  <what-built>
The full editor write-side admin surface for Phase 3:
- Ideas Payload collection edit screen with sidebar, freeze toggle, view-on-site button
- /admin/views/vote-anomalies dashboard (from 03-07a) wired to ExcludeVotesDialog (from this plan)
- All Server Actions (freezeIdea, unfreezeIdea, excludeVotes, dismissAnomaly, actAnomaly)
- cache.ts cross-modification (display_frozen → revealed:false silent freeze)

Plan 03-08 will land the worker that POPULATES vote_anomalies; for this checkpoint, you can manually INSERT a fixture anomaly via Neon SQL Editor to walk through the dashboard.
  </what-built>
  <how-to-verify>
1. Log into Payload admin (staging URL): https://staging.smbsite.eu/admin
2. Open Ideas collection; create a new idea "Тестова идея за Phase 3" (topic Данъци, draft); save.
3. Verify the edit screen now shows:
   - "Виж как изглежда на сайта" button (top — opens /idei/тестова-идея-за-phase-3?preview=draft in new tab)
   - Right-rail IdeaSidebar with Статистика block (0 votes), Замрази публичното отображаване block, Последни 5 събития (empty), "Виж всички аномалии →" link
4. Click "Виж как изглежда на сайта" — confirm new tab opens the draft preview successfully
5. Toggle "Замрази отображаването" — sidebar updates; visit /idei/тестова-идея-за-phase-3 (after publishing the idea); confirm public surface renders the same as it would for an idea below the threshold (silent — D-23)
6. Toggle off; confirm display_frozen=false in DB
7. (Fixture step — can be skipped if plan 03-08 has run): in Neon SQL Editor, INSERT a fixture row:
   ```sql
   INSERT INTO vote_anomalies (idea_id, trigger_type, count, status)
   VALUES ('<idea-uuid>', 'subnet_cluster', 25, 'unresolved');
   ```
8. Visit /admin/views/vote-anomalies — confirm:
   - H1 "Аномалии при гласуване"
   - Editor warning banner
   - Filter bar (date / trigger / status)
   - Anomalies table with the fixture row
9. Click the row — drill-in opens the per-vote forensic table (will be empty without real vote events; that's OK for this manual check)
10. Visit Ideas collection list — confirm the test idea row shows the AnomalyBadge cell with "⚠ 1" — clicking it deep-links to the anomaly dashboard filtered by idea_id
11. CLEANUP: dismiss the anomaly via the dashboard; verify moderation_log row written; verify status flipped to "Отхвърлен" (dismissed); verify anomaly badge disappears from Ideas list

Operator records in `.planning/phases/03-idea-catalog-voting/03-EDITOR-WALKTHROUGH.md`: timestamps, screenshots (or pasted observations), confirmation that all 11 steps succeeded.
  </how-to-verify>
  <resume-signal>Operator types "approved" or describes any failures with screenshot/error text. If a screen renders incorrectly, plan 03-07b ships fixes via a follow-up `gsd-quick` task.</resume-signal>
  <verify>
    <automated>echo "manual checkpoint — operator-only"</automated>
  </verify>
  <acceptance_criteria>
    - All 11 manual steps executed without error
    - 03-EDITOR-WALKTHROUGH.md committed with operator's observations
    - Any mid-walkthrough fixes shipped via gsd-quick
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Editor browser → Payload admin → admin Server Actions | Auth.js session + Payload role check + assertEditorOrAdmin re-check (defense-in-depth) |
| Bulk-exclude action → votes table DELETE | Editor-controlled vote IDs; Zod-validated UUIDs; max 500/batch |
| display_frozen flip → public cache | display_frozen state must propagate to cached count read; cache.ts updated to gate on display_frozen |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-03-07b-01 | EoP | Non-editor invokes freezeIdea / excludeVotes / dismissAnomaly via direct fetch | HIGH | mitigate | assertEditorOrAdmin throws; Payload collection access also blocks; both layers checked |
| T-03-07b-02 | Repudiation | Editor denies bulk vote-exclude action | MEDIUM | mitigate | moderation_log append-only with actor_user_id + target_ids[] + note + created_at |
| T-03-07b-03 | Tampering | Editor freeze used to silence opposition | MEDIUM | accept | Manual review only (D-12 explicit no auto-freeze); moderation_log audit chain visible to admin; Phase 6 transparency report can extract action='idea_display_freeze' rows |
| T-03-07b-04 | DoS | Bulk-exclude with 10000 ids overruns transaction time | MEDIUM | mitigate | Zod max 500 per batch; admin must paginate larger excludes |

T-03-07b-03 disposition = accept (manual moderation tool always carries this risk; the audit trail is the mitigation).
All other HIGH+ threats mitigated within this plan.
</threat_model>

<verification>
- IdeaSidebar renders live stats (raw counts, NOT cached)
- FreezeToggleClient calls Server Action; idea.display_frozen flips
- excludeVotes deletes votes + writes moderation_log target_ids
- dismissAnomaly + actAnomaly write status flip + moderation_log
- cache.ts updated to suppress public count when display_frozen=true (silent freeze D-23)
- Manual editor walkthrough completes without errors (Task 5 checkpoint)
- pnpm tsc --noEmit emits zero new errors
- Integration test + e2e specs GREEN (or documented skip)
- All Bulgarian copy via getAdminT — zero inline Cyrillic in any new file
</verification>

<success_criteria>
- EDIT-01 ("editor can log into admin panel") verified (Phase 1 already shipped)
- EDIT-02 ("editor creates / publishes / edits ideas") demonstrable via admin-ideas-collection.spec.ts + manual walkthrough
- OPS-04 admin write surface (freeze + exclude + dismiss/act + manual walkthrough)
- D-19 (preview), D-20 (bulk exclude), D-21 (moderation_log writes), D-22 (sidebar), D-23 (silent freeze via cache gate) all implemented
</success_criteria>

<output>
After completion, create `.planning/phases/03-idea-catalog-voting/03-07b-SUMMARY.md` documenting:
- Final files + their roles
- Manual walkthrough timestamps + observations (link to 03-EDITOR-WALKTHROUGH.md)
- E2E + integration test status (GREEN / SKIP)
- The cache.ts cross-plan modification (display_frozen gate added; describe the change)
- Notes on any deviation from UI-SPEC §S8/S10
- Pointer to plan 03-08 which lands the anomaly worker that POPULATES vote_anomalies
</output>
</content>
</invoke>