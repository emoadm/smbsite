---
phase: 03-idea-catalog-voting
plan: 07a
type: execute
wave: 3
depends_on: ["03-01", "03-02", "03-03"]
files_modified:
  - src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesView.tsx
  - src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesDashboard.tsx
  - src/app/(payload)/admin/views/vote-anomalies/actions.ts
  - tests/e2e/admin-vote-anomalies.spec.ts
autonomous: true
requirements: [OPS-04]
threat_ids: [T-03-07a-01, T-03-07a-02, T-03-07a-03]

must_haves:
  truths:
    - "Editor visiting /admin/views/vote-anomalies sees anomalies table sorted by recency with filter (date range, trigger type, status)"
    - "Editor clicks anomaly row → drill-in with per-vote forensic table (HMAC-truncated identifiers)"
    - "Anonymous member visiting /admin/views/vote-anomalies sees access-denied (assertEditorOrAdmin defense-in-depth)"
    - "Forensic per-vote query truncates to ±30min around the anomaly window"
    - "Filter URL state survives reload (date range, trigger, status, idea_id deep-link from sidebar)"
  artifacts:
    - path: "src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesView.tsx"
      provides: "Top-level admin view with role gate (mirrors AttributionView)"
      exports: ["VoteAnomaliesView"]
    - path: "src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesDashboard.tsx"
      provides: "Client filter bar + anomalies table + drill-in per-vote forensic"
      exports: ["VoteAnomaliesDashboard"]
    - path: "src/app/(payload)/admin/views/vote-anomalies/actions.ts"
      provides: "Read-only Server Actions: fetchVoteAnomalies, fetchVoteEventForensic"
      exports: ["fetchVoteAnomalies", "fetchVoteEventForensic", "VoteAnomalyFilter", "VoteAnomalyRow", "VoteForensicRow"]
  key_links:
    - from: "src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesView.tsx"
      to: "src/lib/auth/role-gate.ts (assertEditorOrAdmin)"
      via: "imports + run before any Drizzle query"
      pattern: "assertEditorOrAdmin"
    - from: "src/app/(payload)/admin/views/vote-anomalies/actions.ts"
      to: "src/db/schema/voting.ts (vote_anomalies, vote_events_log)"
      via: "Drizzle SELECT with LIMIT 200 / 500"
      pattern: "vote_anomalies"
  art9_lawyer_opinion_gate:
    - "GDPR Art.9 lawyer opinion on file at .planning/legal/art9-opinion.md before merge to main"

user_setup: []
---

<objective>
Read-only admin surface for OPS-04 anomaly review: `/admin/views/vote-anomalies` view + dashboard + read-only Server Actions (fetchVoteAnomalies, fetchVoteEventForensic).

Purpose: Splits the original plan 03-07 into read-only (this plan) and write/walkthrough (03-07b) per checker W-5. Delivers the admin anomaly review surface that plan 03-08's worker POPULATES; plan 03-07b adds the IdeaSidebar with write-actions (freeze/exclude/dismiss/act) and the manual editor walkthrough checkpoint.

Output:
- 1 admin view + 1 dashboard + 1 read-only actions file
- 1 e2e role-gate spec
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
@CLAUDE.md
@src/app/(payload)/admin/views/attribution/AttributionView.tsx
@src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx
@src/app/(payload)/admin/views/attribution/actions.ts
@src/lib/auth/role-gate.ts
@src/db/schema/voting.ts

<interfaces>
From src/app/(payload)/admin/views/attribution/AttributionView.tsx — direct template for VoteAnomaliesView. View component reads `bg.json` directly (Payload admin shell does not mount NextIntlClientProvider).

From src/lib/auth/role-gate.ts (Plan 05-01 export):
```typescript
async function assertEditorOrAdmin(): Promise<void> // throws on unauthorized
```

From plan 03-02 voting schema:
- vote_anomalies: { id, idea_id, trigger_type, count, first_detected_at, last_detected_at, status, resolved_at, resolved_by, resolution_note }
- vote_events_log: { id, user_id, idea_id, choice, action, occurred_at, ip_hash, subnet_hash, ua_hash, fresh_account_at_event }

From plan 03-03 src/payload.config.ts: voteAnomalies view path '/views/vote-anomalies' already declared.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: VoteAnomaliesView + VoteAnomaliesDashboard — admin view shell + filter bar + drill-in table</name>
  <files>src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesView.tsx, src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesDashboard.tsx</files>
  <read_first>
    - src/app/(payload)/admin/views/attribution/AttributionView.tsx (entire file — direct template)
    - src/app/(payload)/admin/views/attribution/AttributionDashboard.tsx (URL-state + filter shape — direct template)
    - .planning/phases/03-idea-catalog-voting/03-PATTERNS.md section "vote-anomalies/" lines 1064-1135
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S9 lines 545-607
  </read_first>
  <action>
**File 1: src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesView.tsx**

Mirror `AttributionView.tsx` shape exactly. Key differences:
- import `bg from '../../../../../../messages/bg.json'`; resolve `t = bg.admin.voteAnomalies`
- role gate at top (`if (!user) return loginRequired; if (!['admin','editor'].includes(role)) return denied`); BOTH cases render simple message Card (text from bg.admin.voteAnomalies.loginRequired / denied) per attribution view template
- After role gate: parse searchParams `dateFrom`, `dateTo`, `triggerType?`, `status?`, `ideaId?` → `VoteAnomalyFilter`
- `const data = await fetchVoteAnomalies(filter);`
- Render `<DefaultTemplate ...><Gutter><h1>{t.title}</h1><p style={{ color: 'var(--theme-elevation-500)' }}>{t.warning}</p><VoteAnomaliesDashboard initialFilter={filter} initialData={data} /></Gutter></DefaultTemplate>`

**File 2: src/app/(payload)/admin/views/vote-anomalies/VoteAnomaliesDashboard.tsx** (client component)

Direct mirror of `AttributionDashboard.tsx` shape (URL state via useRouter + useSearchParams). Replace inline-styled tables with shadcn `<Table>` per UI-SPEC §S9 component inventory.

Top-level filter bar:
- Date-range picker (mirror Attribution's input pair: `<input type="date" />` × 2)
- Trigger filter `<Select>` — All / per_idea_velocity / subnet_cluster / fresh_account_share
- Status filter `<Select>` — All / unresolved / dismissed / acted
- CSV export `<Button variant="outline">` (mirrors Attribution; Server Action `fetchVoteAnomaliesCsv` — declared as a follow-up in 03-07a-SUMMARY if not implemented this plan)

Anomalies table columns per UI-SPEC §S9 lines 565-573: Idea title | Trigger (Badge) | # events | First | Last | Status (Badge). Row hover `bg-muted/40 cursor-pointer`. Click row → drill-in panel.

Drill-in per-vote forensic panel:
- Heading: idea title + summary line "Тригер: {triggerLabel} · {count} събития" (read from bg.json `admin.voteAnomalies.trigger.*` + `admin.voteAnomalies` fields)
- Editor warning Alert (mandatory per RESEARCH Anti-pattern #2) — `<Alert className="border-warning bg-warning/10">` with `t.warning` body + collapsible help (`<Collapsible>` or `<details>`) showing `t.helpExpand` button → `t.helpBody` paragraph.
- Per-vote table columns: Time, Choice (Badge), ip_hash (truncated `${hash.slice(0, 8)}…`), subnet_hash (`${hash.slice(0, 4)}…`), fresh_account_at_event (✓/—), action (Badge cast/change/retract).
- **Bulk-select / write actions are deferred to plan 03-07b** — this plan ships read-only forensic only. The dashboard exposes a callback prop (`onBulkExclude?: (logIds: string[]) => void`) that 03-07b wires to its `<ExcludeVotesDialog>`. In this plan, leave the prop unused (dashboard renders without bulk-select toolbar).

**Bulgarian strings:** all admin text comes from `bg.admin.voteAnomalies.*` directly imported (no useTranslations — Payload admin shell does not mount NextIntlClientProvider). Strings already shipped by plan 03-01.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "src/app/\(payload\)/admin/views/vote-anomalies/(VoteAnomaliesView|VoteAnomaliesDashboard)\.tsx" | head -5; grep -nE '"[А-Яа-я]+' src/app/\(payload\)/admin/views/vote-anomalies/VoteAnomaliesView.tsx src/app/\(payload\)/admin/views/vote-anomalies/VoteAnomaliesDashboard.tsx | head -5 || echo "no inline Cyrillic"</automated>
  </verify>
  <acceptance_criteria>
    - VoteAnomaliesView.tsx + VoteAnomaliesDashboard.tsx exist + type-check
    - Role gate runs at top of view (member denied, editor allowed)
    - URL-state persistence works in Dashboard (filter survives reload)
    - All Bulgarian copy comes from `bg.admin.voteAnomalies.*` direct import — no inline Cyrillic
    - Drill-in forensic table shows truncated identifiers (ip_hash 8 chars, subnet_hash 4 chars)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: actions.ts — read-only Server Actions (fetchVoteAnomalies, fetchVoteEventForensic)</name>
  <files>src/app/(payload)/admin/views/vote-anomalies/actions.ts</files>
  <read_first>
    - src/app/(payload)/admin/views/attribution/actions.ts (admin Server Action role gate + Drizzle aggregate shape)
    - src/lib/auth/role-gate.ts (assertEditorOrAdmin pattern)
    - src/db/schema/voting.ts (vote_anomalies + vote_events_log)
  </read_first>
  <action>
**File: src/app/(payload)/admin/views/vote-anomalies/actions.ts**

```typescript
'use server';
import { assertEditorOrAdmin } from '@/lib/auth/role-gate';
import { db } from '@/db';
import { sql, eq, and, gte, lte, desc } from 'drizzle-orm';
import { vote_anomalies, vote_events_log } from '@/db/schema/voting';

export interface VoteAnomalyFilter {
  dateFrom: string;
  dateTo: string;
  triggerType?: 'per_idea_velocity' | 'subnet_cluster' | 'fresh_account_share';
  status?: 'unresolved' | 'dismissed' | 'acted';
  ideaId?: string; // for ?idea_id= deep-link from IdeaSidebar
}

export interface VoteAnomalyRow {
  id: string;
  idea_id: string;
  idea_title: string;
  trigger_type: string;
  count: number;
  first_detected_at: string;
  last_detected_at: string;
  status: string;
}

export async function fetchVoteAnomalies(filter: VoteAnomalyFilter): Promise<VoteAnomalyRow[]> {
  await assertEditorOrAdmin();
  const conditions = [
    gte(vote_anomalies.last_detected_at, new Date(filter.dateFrom)),
    lte(vote_anomalies.last_detected_at, new Date(filter.dateTo)),
  ];
  if (filter.triggerType) conditions.push(eq(vote_anomalies.trigger_type, filter.triggerType));
  if (filter.status) conditions.push(eq(vote_anomalies.status, filter.status));
  if (filter.ideaId) conditions.push(eq(vote_anomalies.idea_id, filter.ideaId));

  const rows = await db.execute(sql`
    SELECT a.id, a.idea_id, i.title AS idea_title, a.trigger_type, a.count,
           a.first_detected_at, a.last_detected_at, a.status
    FROM vote_anomalies a
    INNER JOIN ideas i ON i.id = a.idea_id
    WHERE ${and(...conditions)}
    ORDER BY a.last_detected_at DESC
    LIMIT 200
  `);
  return rows.rows as VoteAnomalyRow[];
}

export interface VoteForensicRow {
  id: string;
  occurred_at: string;
  choice: 'approve' | 'reject' | null;
  action: 'cast' | 'change' | 'retract';
  ip_hash: string;
  subnet_hash: string;
  ua_hash: string;
  fresh_account_at_event: boolean;
}

export async function fetchVoteEventForensic(anomalyId: string): Promise<VoteForensicRow[]> {
  await assertEditorOrAdmin();
  // Resolve the anomaly's idea_id + trigger window
  const a = await db.select().from(vote_anomalies).where(eq(vote_anomalies.id, anomalyId)).limit(1);
  if (a.length === 0) return [];
  const anomaly = a[0];
  // Window: from first_detected_at - 30min to last_detected_at + 30min (forensic window)
  const fromTs = new Date(anomaly.first_detected_at.getTime() - 30 * 60_000);
  const toTs = new Date(anomaly.last_detected_at.getTime() + 30 * 60_000);
  const events = await db.select({
    id: vote_events_log.id,
    occurred_at: vote_events_log.occurred_at,
    choice: vote_events_log.choice,
    action: vote_events_log.action,
    ip_hash: vote_events_log.ip_hash,
    subnet_hash: vote_events_log.subnet_hash,
    ua_hash: vote_events_log.ua_hash,
    fresh_account_at_event: vote_events_log.fresh_account_at_event,
  }).from(vote_events_log)
    .where(and(eq(vote_events_log.idea_id, anomaly.idea_id), gte(vote_events_log.occurred_at, fromTs), lte(vote_events_log.occurred_at, toTs)))
    .orderBy(desc(vote_events_log.occurred_at))
    .limit(500);
  return events.map((e) => ({
    ...e,
    occurred_at: e.occurred_at.toISOString(),
    choice: e.choice as 'approve' | 'reject' | null,
    action: e.action as 'cast' | 'change' | 'retract',
  }));
}
```

**Defense-in-depth note (Pitfall 7 + Plan 05-01 pattern):** every Server Action calls `assertEditorOrAdmin()` BEFORE any DB read. This is INDEPENDENT of Payload's collection-level access control. The combination is "belt + braces."

**No PII in logs:** this plan ships read-only actions; no logger calls add user-identifying info. Plan 03-07b adds the write actions (freezeIdea, excludeVotes, dismissAnomaly, actAnomaly) with explicit no-PII logger guidance.

**Forensic window 30min:** small enough to keep the result <500 rows in adversary brigades; large enough to give editor surrounding context.
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "src/app/\(payload\)/admin/views/vote-anomalies/actions\.ts" | head -5; grep -c "assertEditorOrAdmin" src/app/\(payload\)/admin/views/vote-anomalies/actions.ts</automated>
  </verify>
  <acceptance_criteria>
    - actions.ts exists + type-checks
    - Both exported actions call `assertEditorOrAdmin()` BEFORE any Drizzle query (count ≥ 2)
    - Forensic per-vote query truncates time window to ±30min around the anomaly
    - LIMIT 200 on anomalies / 500 on forensic events
    - Exports: fetchVoteAnomalies, fetchVoteEventForensic, VoteAnomalyFilter, VoteAnomalyRow, VoteForensicRow
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: E2E spec — admin role gate (member denied, editor allowed)</name>
  <files>tests/e2e/admin-vote-anomalies.spec.ts</files>
  <read_first>
    - tests/e2e/ existing helpers (loginAsVerifiedMember + loginAsEditor pattern from Phase 1 / 5)
    - .planning/phases/03-idea-catalog-voting/03-RESEARCH.md section "Phase Requirements → Test Map" lines 1294-1298
  </read_first>
  <action>
**File: tests/e2e/admin-vote-anomalies.spec.ts** — OPS-04 admin role gate.

```typescript
import { test, expect } from '@playwright/test';
import { loginAsVerifiedMember, loginAsEditor } from './helpers/auth-helpers';

test('member cannot access /admin/views/vote-anomalies', async ({ page }) => {
  await loginAsVerifiedMember(page);
  await page.goto('/admin/views/vote-anomalies');
  // Either redirected or shown access denied — both acceptable
  const denied = await page.getByText('Достъпът отказан').isVisible().catch(() => false);
  const onLogin = page.url().includes('/login') || page.url().includes('/admin/login');
  expect(denied || onLogin).toBe(true);
});

test('editor can access /admin/views/vote-anomalies', async ({ page }) => {
  await loginAsEditor(page);
  await page.goto('/admin/views/vote-anomalies');
  await expect(page.getByRole('heading', { name: 'Аномалии при гласуване' })).toBeVisible();
  await expect(page.getByText('Замразяването е ръчно решение')).toBeVisible();
});
```

If `loginAsEditor` helper doesn't exist (Phase 5 should have it), document a TODO in 03-07a-SUMMARY.md and use `test.skip()` for the editor test.
  </action>
  <verify>
    <automated>pnpm test:e2e tests/e2e/admin-vote-anomalies.spec.ts --reporter=list 2>&1 | tail -15</automated>
  </verify>
  <acceptance_criteria>
    - admin-vote-anomalies.spec.ts exists
    - Role gate proven (member denied; editor allowed) — GREEN or SKIP with documented helper gap
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Editor browser → Payload admin → admin Server Actions | Auth.js session + Payload role check + assertEditorOrAdmin re-check (defense-in-depth) |
| Forensic per-vote read → vote_events_log | Read-only; HMAC-hashed identifiers only (no raw IP) |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-03-07a-01 | EoP | Non-editor invokes fetchVoteAnomalies / fetchVoteEventForensic via direct fetch | HIGH | mitigate | assertEditorOrAdmin throws; both layers checked (Payload collection + role-gate) |
| T-03-07a-02 | Information Disclosure | Anomaly forensic table exposes raw IP/UA | HIGH | mitigate | All identifiers HMAC-hashed (D-15); admin sees ip_hash truncated to 8 chars; subnet_hash to 4 chars; raw fields never persisted |
| T-03-07a-03 | DoS | Forensic table query returns 100k rows | MEDIUM | mitigate | LIMIT 500 in forensic query + ±30min window narrowing |

All HIGH+ threats mitigated within this plan.
</threat_model>

<verification>
- VoteAnomaliesView role gate works (member denied; editor allowed) — proven by e2e
- Forensic per-vote query truncates to ±30min around the anomaly window
- pnpm tsc --noEmit emits zero new errors
- e2e spec GREEN (or documented skip)
</verification>

<success_criteria>
- OPS-04 read-only admin surface ("editor can view real-time vote anomaly alerts") demonstrable via admin-vote-anomalies.spec.ts
- D-20 (anomaly review surface) read-only portion implemented; D-21 (moderation_log writes), D-22 (sidebar), D-19 (preview), D-23 (silent freeze) all deferred to plan 03-07b
</success_criteria>

<output>
After completion, create `.planning/phases/03-idea-catalog-voting/03-07a-SUMMARY.md` documenting:
- Final 3 files (View, Dashboard, actions) + their roles
- Read-only action shape (no writes — write actions deferred to 03-07b)
- E2E test status (GREEN / SKIP)
- Any deviation from UI-SPEC §S9 forensic table layout
- Pointer to plan 03-07b which adds IdeaSidebar + ViewOnSiteButton + AnomalyBadge + write Server Actions + manual editor walkthrough
- Pointer to plan 03-08 which lands the worker that POPULATES vote_anomalies
</output>
</content>
</invoke>