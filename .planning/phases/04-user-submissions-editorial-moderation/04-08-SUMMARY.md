---
phase: 04-user-submissions-editorial-moderation
plan: 08
subsystem: dsa-compliance
tags: [phase-4, wave-4, dsa-art-16, notice-and-action, transparency, authentication]
dependency_graph:
  requires:
    - "04-01 (submissions schema — kind='dsa_report' + target_submission_id column)"
    - "04-02 (messages/bg.json dsa.report.* locked strings)"
    - "04-03 (zod.ts + actions.ts patterns; rate-limit helpers)"
    - "04-06 (moderation queue 'DSA сигнали' tab — receives dsa_report rows)"
  provides:
    - "DSA Art.16 minimum notice-and-action mechanism for /predlozheniya"
    - "submitDsaReport Server Action (kind='dsa_report' write path)"
    - "ReportContentDialog + ReportContentButton components"
    - "ProposalCard isLoggedIn prop (members see report button; anonymous visitors do not)"
  affects:
    - "src/lib/submissions/zod.ts (DsaCategoryEnum + dsaReportSchema appended)"
    - "src/components/proposals/ProposalCard.tsx (isLoggedIn prop wired)"
    - "src/app/(frontend)/predlozheniya/page.tsx (isLoggedIn threaded into ProposalCard)"
tech_stack:
  added: []
  patterns:
    - "submitDsaReport mirrors the 6-step auth+rate-limit+Zod+Turnstile+INSERT pipeline from Plan 04-03"
    - "Dialog pattern: useActionState drives state.ok toggle to success view"
    - "DSA report UI rendered only when isLoggedIn=true — anonymous visitors see no report button"
key_files:
  created:
    - src/lib/submissions/dsa-actions.ts
    - src/components/dsa/ReportContentDialog.tsx
    - src/components/dsa/ReportContentButton.tsx
    - tests/unit/dsa-report-actions.test.ts
    - tests/e2e/dsa-notice-and-action.spec.ts
  modified:
    - src/lib/submissions/zod.ts
    - src/components/proposals/ProposalCard.tsx
    - src/app/(frontend)/predlozheniya/page.tsx
decisions:
  - "DSA reports authenticated members only — DSA Art.16 allows but does not require anonymous reports; v1 scopes to authenticated reporters to satisfy substantiated-notice requirement"
  - "category stored in submissions.topic column — reuses existing text column rather than adding a new column; editor sees violation category in moderation queue topic field"
  - "goodFaith checkbox value='on' validated server-side as z.literal('on') — FormData sends the string 'on' when checked; server rejects if absent"
  - "Status-change email for DSA reports: reuses Plan 04-07 worker pattern (reporter is the submission's submitter_id; standard status-change email fires on approve/reject) — see follow-up note below"
metrics:
  duration: "~35 minutes"
  completed: "2026-05-10"
  tasks_completed: 3
  files_changed: 8
---

# Phase 4 Plan 8: DSA Article 16 Notice-and-Action Mechanism Summary

DSA Art.16 minimum compliance: authenticated members file substantiated reports against approved proposals via a dialog with violation category, reason text, and good-faith checkbox; reports land in the moderation queue as `kind='dsa_report'` rows with `target_submission_id`; acknowledgement renders on success using locked Bulgarian copy.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Zod schema + submitDsaReport Server Action | 5c29a36 | zod.ts (DsaCategoryEnum + dsaReportSchema), dsa-actions.ts, tests/unit/dsa-report-actions.test.ts |
| 2 | ReportContentDialog + ReportContentButton + ProposalCard wire-in | 830eb30 | ReportContentDialog.tsx, ReportContentButton.tsx, ProposalCard.tsx, predlozheniya/page.tsx |
| 3 | E2E spec — DSA notice-and-action flow | 74965b7 | tests/e2e/dsa-notice-and-action.spec.ts |

## Must-Have Truths Verification

1. **Every approved proposal card carries 'Сигнализирай за съдържание' button for logged-in members:** `isLoggedIn` prop gates `<ReportContentButton>` render in ProposalCard; anonymous visitors receive `isLoggedIn={false}` (default) from the page's `session?.user` check. SATISFIED.

2. **DSA report writes submissions row with kind='dsa_report':** `submitDsaReport` hardcodes `kind: 'dsa_report'`, `target_submission_id: parsed.data.targetSubmissionId`, `body: parsed.data.reason`, `topic: parsed.data.category`. SATISFIED.

3. **Acknowledgement copy:** on `state.ok === true`, dialog swaps to success state showing `t('successHeading')` = "Сигналът ти беше получен." and `t('successBody')` = "Ще те уведомим за решението на редакционния екип на твоя имейл." — verbatim from locked dsa.report.* keys. SATISFIED.

4. **Same anti-abuse stack as PROP-01/PROB-01:** auth + emailVerified + assertNotSuspended + checkSubmissionPerUser (5/24h) + checkSubmissionPerIp (10/24h) + Turnstile + dsaReportSchema. SATISFIED.

## Violation Categories (5 final Bulgarian labels)

| Key | Bulgarian label |
|-----|-----------------|
| illegal | Незаконно съдържание |
| harassment | Тормоз или заплахи |
| misinformation | Дезинформация |
| spam | Спам или измама |
| other | Друго |

## DSA Scope Notes

- **Reportable surface:** only public ProposalCards on /predlozheniya. Problem heat-map shows aggregates without identifiable content — no per-DSA "content" reporting applicable.
- **Anonymous reporting:** omitted in v1 (Art.16 allows but does not require it for platforms that don't otherwise serve anonymous users with user-generated content).
- **Acknowledgement:** on-screen success state (this plan). Email acknowledgement deferred as follow-up (see below).

## Follow-Up Notes

### Status-change email for DSA reports
The Plan 04-07 email worker handles submission status changes. When an editor approves or rejects a DSA report row in the moderation queue, the reporter (who is `submitter_id`) receives a status-change email through the existing Plan 04-07 path — **provided** Plan 04-07's worker handles `kind='dsa_report'`. 

Plan 04-07 was not yet committed when this plan was executed (no SUMMARY.md found in .planning/phases/04-user-submissions-editorial-moderation/04-07-SUMMARY.md). The worker's coverage of `dsa_report` kind should be verified when Plan 04-07 lands. If it doesn't cover `dsa_report`, a follow-up plan should add the handler.

### Auth fixture for E2E logged-in flow
`tests/e2e/dsa-notice-and-action.spec.ts` has the logged-in member test marked as `test.skip` pending the project's auth fixture. When Phase 1 Plan 01-09 E2E fixtures land, un-skip and wire `loginAsMember()` before navigation.

## Deviations from Plan

None — plan executed exactly as written. The only adaptation was using `type CategoryKey` and narrowing the `t()` call in ReportContentDialog to avoid TypeScript's template-literal inference issue with dynamic keys — a minor implementation detail with no behavioral difference.

## Self-Check: PASSED

All 5 created files confirmed present on disk. All 3 task commits (5c29a36, 830eb30, 74965b7) confirmed in git log. TypeScript `--noEmit` exits 0.
