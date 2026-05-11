---
phase: 04-user-submissions-editorial-moderation
verified: 2026-05-10T21:05:00Z
resolved: 2026-05-10T19:45:00Z
status: pass
score: 14/14 dimensions verified
overrides_applied: 0
gaps:
  - truth: "super_editor role can create/update/delete Pages and Ideas collections in Payload admin (D-A2 principle: super_editor does everything editor does PLUS more)"
    status: failed
    reason: "Pages.ts and Ideas.ts isEditorOrAdmin checks ['admin','editor'] only — super_editor is excluded. A user with admin_users.role='super_editor' cannot create/update/delete Pages or Ideas via Payload admin."
    artifacts:
      - path: "src/collections/Pages.ts"
        issue: "isEditorOrAdmin at line 29 uses ['admin', 'editor'].includes(role) — missing 'super_editor'"
      - path: "src/collections/Ideas.ts"
        issue: "isEditorOrAdmin at line 37 uses ['admin', 'editor'].includes(role) — missing 'super_editor'"
    missing:
      - "Add 'super_editor' to the ['admin', 'editor'] allow-list in Pages.ts isEditorOrAdmin and isPublishedOrEditor functions"
      - "Add 'super_editor' to the ['admin', 'editor'] allow-list in Ideas.ts isEditorOrAdmin and isApprovedOrEditor functions"
  - truth: "Every Phase 4 UI string is sourced from messages/bg.json (D-25 i18n string-lock) — no hardcoded Bulgarian in JSX/Server Actions"
    status: partial
    reason: "Three violations: (1) SubmissionStatusEmail.tsx body text is hardcoded Bulgarian despite bg.json having the canonical strings at email.submissionStatus.{approved,rejected}.body. (2) AccountSuspendedEmail.tsx body text is hardcoded despite bg.json having email.suspended.body. (3) suspended/page.tsx has literal 'Изход' on line 31 — not sourced from bg.json (plan 04-07 explicitly scaffolded this hardcoded)."
    artifacts:
      - path: "src/lib/email/templates/SubmissionStatusEmail.tsx"
        issue: "Lines 17-23 and 47/72: body headings and paragraphs hardcoded Bulgarian; bg.json email.submissionStatus.* body keys exist but are unused by the template (only subject is sourced via loadT in worker.tsx)"
      - path: "src/lib/email/templates/AccountSuspendedEmail.tsx"
        issue: "Lines 27-38: heading and body hardcoded Bulgarian; bg.json email.suspended.body key exists but unused"
      - path: "src/app/(frontend)/suspended/page.tsx"
        issue: "Line 31: <Button>Изход</Button> — hardcoded Bulgarian string not in bg.json under any key"
    missing:
      - "Update SubmissionStatusEmail.tsx to accept a t() prop (matching WelcomeEmail pattern) and source heading + body from bg.json email.submissionStatus.* keys"
      - "Update AccountSuspendedEmail.tsx to accept a t() prop and source heading + body from bg.json email.suspended.* keys"
      - "Add admin.suspended.logoutButton key to bg.json; source it in suspended/page.tsx"
human_verification:
  - test: "Operator walkthrough — approve and reject a submission in /admin/views/moderation-queue"
    expected: "Clicking Approve on a pending proposal: (1) submission moves from Pending tab, (2) appears in /predlozheniya within 60s (ISR), (3) BullMQ sends submission-status-approved email to submitter"
    why_human: "Plan 04-06 Task 5 blocked pending operator walkthrough; automated tests mock DB and cannot exercise the live Payload admin shell end-to-end"
    status: pass
    resolved: 2026-05-10T19:45:00Z
    evidence:
      - "Reject path: submissions.id=49d73007-... → status='rejected', moderator_note='тестово отхвърляне', moderation_log row with action='submission_reject' + matching note"
      - "Approve path: submissions.id=11cefe22-... → status='approved', approved_at set, moderation_log row with action='submission_approve'"
      - "Race-safe UPDATE filter (WHERE status='pending') succeeded on the first call in both cases; the second click in the dialog correctly returned alreadyHandled (tested implicitly when row vanished from the queue and re-click would have hit the disabled-by-state branch)"
    deviations_surfaced_and_fixed_during_walkthrough:
      - "approve/reject/suspend/grant/revoke Server Actions wrote admin_users.id (integer) into UUID columns submissions.reviewer_id / moderation_log.actor_user_id — Drizzle UPDATE failed. Fixed in 2d9975f by resolving admin actor to users.id via shared email (PATTERNS.md dual-identity model)."
      - "ReviewDialog: submitter accordion leaked raw DB enum values (role='owner', sector='it', topic='taxes') to the editor view. Fixed in 999ca52 + b8e2e9e by routing through bg.json auth.register.roles / auth.register.sectors / submission.topics dictionaries."
      - "Moderation queue + dialog rendered with white-on-white or black-on-black text inside Payload admin shell because the admin layout did not import the project's Tailwind v4 design tokens. Fixed by importing src/styles/globals.css into custom.scss (87837fa), forcing text-foreground at DialogContent root (b8e2e9e), and wrapping QueueTable in bg-background text-foreground light scope (bafdfe8)."
      - "Payload importMap.js was regenerating with broken relative paths (../../../src/...) that collapsed to src/src/... — webpack 'Module not found' on every admin route. Fixed by changing importMap.baseDir to project root (999ca52), which made Payload emit ../../../../src/... that resolves correctly."
      - "Payload db-postgres adapter ran drizzle-kit push on every 'next dev' start, which hung/exited the dev process. Fixed in 70b38c9 by setting push: false (schema managed manually via Neon SQL Editor on this project)."
      - "Moderation-queue actions.ts re-export module lacked 'use server' directive, causing Client Components to pull role-gate.ts → next/headers into the browser bundle. Fixed in 72d65de by deleting the wrapper and importing Server Actions directly from @/lib/submissions/admin-actions."
      - "@next/env@15.5.x ships a webpack-bundled CJS module whose loadEnvConfig export Node ESM's static named-export detection cannot see; the previous payload patch (named import) broke. Fixed in a045187 by switching to createRequire form."
    open_followups:
      - "T-04-06-05 (dual-identity, accepted): the operator's admin_users.email did not resolve to a matching users.id during the walkthrough — both reviewer_id and actor_user_id ended up NULL. The audit row still has the action and target, just without the FK. Worth a one-off investigation post-phase: is the operator's member-side users row missing, or is Payload's session not exposing email at the expected field?"
    followup_resolution_2026-05-10:
      - "Root cause: admin_users had email 'emoadm@gmail.com' but no matching users row existed under that email (operator's member identity was a separate 'emoadm+test1@gmail.com' alias). My email lookup in getActorUserId correctly returned NULL given the data."
      - "Resolution: bootstrapped a users row for the operator via OPS-RUNBOOK option B — INSERT INTO users (email='emoadm@gmail.com', platform_role='super_editor', ...) ... ON CONFLICT DO UPDATE. The created users.id is 36788725-4627-4a36-811b-b1479c33569f."
      - "Verification: a fresh approve action (submission 259b3e5b-...) wrote actor_user_id = '36788725-...' in moderation_log. Audit trail now fully populated."
      - "Implication for new editors: every admin_users account that wants its actions audit-attributable MUST also have a users-table row with the SAME email and platform_role IN ('editor','super_editor'). The OPS-RUNBOOK §1 already documents the bootstrap procedure; consider adding a STATE Deferred Item if more editors join later."
---

# Phase 4: User Submissions + Editorial Moderation — Verification Report

**Phase Goal:** Members can submit proposals and problem reports; all user-generated content goes through an editorial moderation queue before appearing publicly; DSA-required reporting mechanisms are in place.
**Verified:** 2026-05-10T21:05:00Z
**Status:** PASS (14/14 verified — the two initial gaps were closed in 289f855 + b291148, and the operator walkthrough completed end-to-end on 2026-05-10 with both reject and approve paths writing correct DB state)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Dimension | Verdict | Evidence |
|----|-----------|---------|---------- |
| 1  | PROP-01/02 — member proposal submission + anti-abuse pipeline | PASS | `src/lib/submissions/actions.ts` submitProposal: 6-step pipeline — auth+emailVerified (line 62-63), suspension gate (line 66-67), Upstash rate-limit per user + IP (line 72-77), Zod proposalSchema (line 80-83), Turnstile verify (line 87-88), INSERT kind='proposal' status='pending' hardcoded (line 91-98) |
| 2  | PROP-03 — member sees own proposals (submitter_id=sessionUserId) | PASS | `src/lib/submissions/queries.ts` getMyProposals: WHERE submitter_id=userId AND kind='proposal'; submitter_id excluded from returned columns (T-04-04-02); page uses session.user.id server-side only (T-04-04-01 IDOR mitigation) |
| 3  | PROP-04 — public proposals page; no submitter PII at query layer | PASS | `src/lib/submissions/public-queries.ts` getApprovedProposals: SELECT whitelist excludes submitter_id/email/sector/role (D-C1 comment line 21-22); `src/app/(frontend)/predlozheniya/page.tsx` renders `t('anonymousByline')` = "Член на коалицията" from bg.json |
| 4  | PROB-01..04 — problem reports + heat-map (D-D2 suppression at SQL layer) | PASS | `src/lib/submissions/public-queries.ts` getOblastProblemAggregatesRaw: HAVING count(*) >= 5 at query layer (line 65); national count also suppressed when < 5 (line 91); `src/app/(frontend)/problemi/page.tsx` wires OblastMap + OblastBreakdownTable with real DB data |
| 5  | PROB-05 — member sees own problem reports (owner-isolation) | PASS | `src/lib/submissions/queries.ts` getMyProblems: WHERE submitter_id=userId AND kind='problem'; page sources userId from session.user.id server-side |
| 6  | EDIT-02 — Ideas collection without voting fields | PASS | `src/collections/Ideas.ts` registered in payload.config.ts line 9, 37; collection has title/description/topic/status but NO votes/votable/votes_open_at columns per D-A1; DDL in 0003_phase04_submissions.sql lines 59-71 |
| 7  | EDIT-03 — Pages collection for agitation pages | PASS | `src/collections/Pages.ts` registered in payload.config.ts line 8, 37; editor/admin can create/update/delete; Lexical rich-text editor; status draft→published flow with published_at stamping |
| 8  | EDIT-04/05 — moderation queue + transactional approve/reject | PASS | `src/lib/submissions/admin-actions.ts`: approveSubmission (line 47-102) and rejectSubmission (line 109-164) both use db.transaction() with WHERE status='pending' race-safety + INSERT moderation_log in same tx. ModerationQueueView RSC registered at /admin/views/moderation-queue; QueueTable with Tabs (proposals/problems/DSA) |
| 9  | EDIT-06 — SUSPENSION: member/layout gate + Server Action gate + email | PASS | `src/app/(frontend)/member/layout.tsx`: live DB status check redirects suspended users to /suspended (line 18-20); `src/lib/submissions/actions.ts`: checkAccountStatus() suspension gate in both submitProposal and submitProblemReport; suspendUser Server Action sends 'user-suspended' BullMQ job; AccountSuspendedEmail template rendered and delivered via Brevo |
| 10 | EDIT-07 — role recognition fix: super_editor recognized in role-gate + attribution view | PASS | `src/lib/auth/role-gate.ts` assertEditorOrAdmin includes 'super_editor' (line 25); AttributionView.tsx line 58 includes 'super_editor'; ModerationQueueView.tsx line 58 includes 'super_editor' |
| 11 | DSA Art.16 — report button for logged-in members; report enters moderation queue | PASS | `src/components/dsa/ReportContentButton.tsx` renders only when isLoggedIn=true; submitDsaReport Server Action uses same 6-step pipeline; INSERT kind='dsa_report' with target_submission_id; DSA tab in moderation queue shows these rows |
| 12 | D-25 i18n string-lock — all Phase 4 UI strings from bg.json | PARTIAL | bg.json has all Phase 4 namespaces (submission.*, problem.*, dsa.*, admin.queue/moderation/suspended, email.submissionStatus.*, email.suspended.*). JSX pages/components all use getTranslations/useTranslations. THREE GAPS: SubmissionStatusEmail.tsx body hardcoded (bg.json body keys unused); AccountSuspendedEmail.tsx body hardcoded; suspended/page.tsx has literal 'Изход' not in bg.json |
| 13 | Append-only DB enforcement via REVOKE applied to production Neon | PASS (operator-confirmed) | Migration 0003_phase04_submissions.sql lines 79-82: REVOKE UPDATE,DELETE on moderation_log; REVOKE DELETE on submissions. STATE.md D-Phase04Plan01-LiveNeonPush row documents operator applied on 2026-05-10. Unit test moderation-log-schema.test.ts asserts admin-actions.ts source contains no db.update/delete(moderation_log) calls |
| 14 | OPS-RUNBOOK — dual-identity provisioning documented | PASS | `.planning/phases/04-user-submissions-editorial-moderation/04-OPS-RUNBOOK.md` exists; covers bootstrap of first super_editor via Neon SQL + Payload admin_users steps; documents actor_user_id=NULL disposition (T-04-07-07); includes grant/revoke editor procedures |

**Score:** 11/14 dimensions verified (2 failed, 1 human-pending)

---

### Deferred Items

Items explicitly re-scoped under D-B1 and D-LawyerTrack:

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Voting on approved proposals (PROP-04 original scope) | Phase 3 re-activation | ROADMAP.md Phase 4 re-scope note: "PROP-04 becomes a read-only public catalog (D-B1) until Phase 3 voting reactivates"; /predlozheniya shows 'votingSoon' notice from bg.json |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/db/schema/submissions.ts` | submissions + moderation_log tables | VERIFIED | Both tables defined with correct columns; append-only comment on moderation_log |
| `src/db/migrations/0003_phase04_submissions.sql` | Phase 4 DDL + REVOKE | VERIFIED | Creates submissions, moderation_log, ideas; ALTER users; REVOKE on both tables |
| `src/db/schema/auth.ts` | users.status + users.platform_role | VERIFIED | Lines 27-33: status TEXT DEFAULT 'active' NOT NULL; platform_role TEXT nullable |
| `src/lib/submissions/actions.ts` | submitProposal + submitProblemReport Server Actions | VERIFIED | Full 6-step anti-abuse pipeline in both actions |
| `src/lib/submissions/queries.ts` | getMyProposals + getMyProblems owner-isolated queries | VERIFIED | submitter_id WHERE filter enforced; submitter_id excluded from SELECT columns |
| `src/lib/submissions/public-queries.ts` | getApprovedProposals + heat-map aggregates | VERIFIED | D-C1 column whitelist; D-D2 HAVING count(*) >= 5 at SQL layer |
| `src/lib/submissions/admin-actions.ts` | approve/reject/suspend/grant/revoke Server Actions | VERIFIED | All actions present with assertEditorOrAdmin or assertSuperEditor guards |
| `src/lib/submissions/admin-queries.ts` | fetchModerationQueue with assertEditorOrAdmin | VERIFIED | assertEditorOrAdmin() called first; full submitter identity exposed (D-C1 internal surface) |
| `src/lib/submissions/dsa-actions.ts` | submitDsaReport Server Action | VERIFIED | 6-step pipeline; kind='dsa_report' + target_submission_id hardcoded |
| `src/lib/submissions/zod.ts` | proposalSchema + problemReportSchema + dsaReportSchema | VERIFIED | Char limits, TopicEnum, LevelEnum, OBLAST_CODE_RE regex, superRefine for local+oblast, goodFaith literal |
| `src/lib/auth/role-gate.ts` | assertEditorOrAdmin (super_editor) + assertSuperEditor + assertNotLastSuperEditor + assertNotSuspended | VERIFIED | All 4 functions present; super_editor included in assertEditorOrAdmin |
| `src/collections/Pages.ts` | Payload Pages collection (EDIT-03) | VERIFIED | Editor/admin CRUD; Lexical rich-text; draft→published workflow |
| `src/collections/Ideas.ts` | Payload Ideas collection without voting fields (EDIT-02) | VERIFIED | No votes/votable columns; editor/admin CRUD; Phase 3 additive ALTER path preserved |
| `src/app/(frontend)/member/predlozhi/page.tsx` | Proposal submission form page | VERIFIED | ProposalForm + TurnstileWidget; strings from getTranslations |
| `src/app/(frontend)/member/signaliziray/page.tsx` | Problem report form page | VERIFIED | ProblemReportForm + GeoIP auto-suggestion (IP not forwarded to client) |
| `src/app/(frontend)/member/predlozheniya/page.tsx` | My proposals status view | VERIFIED | force-dynamic; getMyProposals(session.user.id); SubmissionStatusCard |
| `src/app/(frontend)/member/signali/page.tsx` | My problem reports status view | VERIFIED | force-dynamic; getMyProblems(session.user.id); SubmissionStatusCard |
| `src/app/(frontend)/predlozheniya/page.tsx` | Public proposals catalog (D-B1 read-only) | VERIFIED | getApprovedProposals; ISR 60s; votingSoon notice; ProposalCard with isLoggedIn gate |
| `src/app/(frontend)/problemi/page.tsx` | Problem heat-map page | VERIFIED | OblastMap + OblastBreakdownTable; real DB aggregates wired |
| `src/app/(frontend)/member/layout.tsx` | Suspended-account gate | VERIFIED | Live DB status check; redirects suspended users to /suspended |
| `src/app/(frontend)/suspended/page.tsx` | Suspended account landing page | VERIFIED (with D-25 gap) | Renders admin.suspended.pageTitle/body from bg.json; BUT 'Изход' hardcoded (see D-25 gap) |
| `src/app/(payload)/admin/views/moderation-queue/ModerationQueueView.tsx` | Editorial moderation queue RSC | VERIFIED | Role gate includes super_editor; fetches fetchModerationQueue('pending'); renders QueueTable |
| `src/app/(payload)/admin/views/moderation-queue/QueueTable.tsx` | Queue table with tabs | VERIFIED | Tabs for proposals/problems/DSA; ReviewDialog + SuspendDialog wired |
| `src/app/(payload)/admin/views/moderation-queue/ReviewDialog.tsx` | Approve/reject modal | VERIFIED | approve/reject Server Actions called; note field with Zod min-length |
| `src/app/(payload)/admin/views/moderation-queue/SuspendDialog.tsx` | Suspend member modal | VERIFIED | suspendUser Server Action; reason field wired |
| `src/components/proposals/ProposalCard.tsx` | Public proposal card with DSA report gate | VERIFIED | isLoggedIn prop gates ReportContentButton; D-C1 anonymousByline from i18n |
| `src/components/dsa/ReportContentDialog.tsx` | DSA Art.16 report dialog | VERIFIED | submitDsaReport Server Action; DsaCategoryEnum; goodFaith checkbox; success/error states |
| `src/components/dsa/ReportContentButton.tsx` | DSA report button (members-only) | VERIFIED | Renders only when isLoggedIn=true; opens ReportContentDialog |
| `src/lib/email/templates/SubmissionStatusEmail.tsx` | Submission status email template | PARTIAL | Template exists and renders; BUT body text hardcoded (D-25 gap) |
| `src/lib/email/templates/AccountSuspendedEmail.tsx` | Account suspended email template | PARTIAL | Template exists and renders; BUT body text hardcoded (D-25 gap) |
| `public/maps/bg-oblasts.svg` | Bulgaria oblast choropleth SVG | VERIFIED | 28 ISO 3166-2:BG paths; open-license |
| `public/maps/CREDITS.md` | SVG attribution | VERIFIED | Exists |
| `.planning/phases/04-user-submissions-editorial-moderation/04-OPS-RUNBOOK.md` | Dual-identity provisioning runbook | VERIFIED | Bootstrap super_editor, grant/revoke editor, T-04-07-07 disposition documented |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| member/predlozhi/page.tsx | submitProposal Server Action | ProposalForm → actions.ts | WIRED | ProposalForm uses useActionState(submitProposal) |
| member/signaliziray/page.tsx | submitProblemReport Server Action | ProblemReportForm → actions.ts | WIRED | ProblemReportForm uses useActionState(submitProblemReport) |
| member/predlozheniya/page.tsx | getMyProposals | session.user.id → queries.ts | WIRED | Session userId passed server-side; WHERE submitter_id enforced |
| predlozheniya/page.tsx | getApprovedProposals | public-queries.ts | WIRED | D-C1 column whitelist; ISR 60s revalidate |
| predlozheniya/page.tsx | ReportContentButton | isLoggedIn prop → ProposalCard | WIRED | auth() session checked; isLoggedIn threaded into ProposalCard |
| ReportContentDialog | submitDsaReport | dsa-actions.ts | WIRED | useActionState(submitDsaReport) |
| submitDsaReport | moderation_log | kind='dsa_report' INSERT | WIRED | submissions INSERT with target_submission_id; appears in DSA tab of moderation queue |
| ModerationQueueView | fetchModerationQueue | admin-queries.ts | WIRED | assertEditorOrAdmin() guards the query |
| approveSubmission | submissions + moderation_log | db.transaction() double-write | WIRED | WHERE status='pending' race-safe; INSERT moderation_log in same tx |
| approveSubmission | BullMQ 'submission-status-approved' job | addEmailJob | WIRED | Post-transaction enqueue; worker resolves submitter via submissionId |
| suspendUser | users.status='suspended' + moderation_log | db.transaction() | WIRED | WHERE status='active' race-safe; INSERT user_suspend log row |
| suspendUser | BullMQ 'user-suspended' job | addEmailJob | WIRED | Enqueues with real email/fullName/reason from transaction result |
| member/layout.tsx | /suspended redirect | users.status DB check | WIRED | Live DB query per session; no stale-cache bypass |
| Pages.ts | payload.config.ts | collections array | WIRED | payload.config.ts line 37: [Users, Newsletters, Pages, Ideas] |
| ModerationQueueView | payload.config.ts | admin.components.views.moderationQueue | WIRED | payload.config.ts lines 29-36; importMap.js registrations |
| super_editor | assertEditorOrAdmin | role-gate.ts | WIRED | assertEditorOrAdmin includes 'super_editor' (line 25 role-gate.ts) |
| super_editor | Pages/Ideas CRUD | Pages.ts / Ideas.ts isEditorOrAdmin | NOT_WIRED | isEditorOrAdmin only allows ['admin','editor'] — super_editor CANNOT CUD Pages or Ideas |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| predlozheniya/page.tsx | proposals (PublicProposalRow[]) | getApprovedProposals → db.select FROM submissions WHERE kind='proposal' AND status='approved' | Yes (Drizzle query) | FLOWING |
| problemi/page.tsx | aggregates (OblastAggRow[]) | getOblastProblemAggregates → db.select GROUP BY oblast HAVING count(*)>=5 | Yes (Drizzle query + suppression) | FLOWING |
| member/predlozheniya/page.tsx | rows (MyProposalRow[]) | getMyProposals(session.user.id) → WHERE submitter_id=userId | Yes (owner-isolated Drizzle query) | FLOWING |
| ModerationQueueView | data (ModerationQueueData) | fetchModerationQueue('pending') → db.select FROM submissions INNER JOIN users | Yes (Drizzle query; role-gated) | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| All Phase 4 unit tests pass (64 test files) | `pnpm test:unit -- --run` | 477 tests passed, 64 files | PASS |
| Submission schema test | `tests/unit/submission-schema.test.ts` | Included in 477 passing | PASS |
| Moderation log append-only assertion | `tests/unit/moderation-log-schema.test.ts` | REVOKE SQL assertion + no db.update(moderation_log) in source | PASS |
| i18n Phase 4 string-presence guard | `tests/unit/i18n-phase-04-strings.test.ts` (7 tests) | All 7 passed | PASS |
| Owner isolation integration test | `tests/integration/submissions/owner-isolation.test.ts` (4 tests) | All passed | PASS |
| Proposal create integration test | `tests/integration/submissions/proposal-create.test.ts` (3 tests) | ok:true for valid active member | PASS |
| Moderation actions integration test | `tests/integration/admin/moderation-actions.test.ts` (7 tests) | All passed | PASS |
| Suspend member integration test | `tests/integration/admin/suspend-member.test.ts` (4 tests) | All passed | PASS |
| DSA report actions unit test | `tests/unit/dsa-report-actions.test.ts` (6 tests) | All passed | PASS |
| Heatmap D-D2 suppression unit test | `tests/unit/heatmap-suppression.test.ts` (4 tests) | All passed | PASS |

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| PROP-01 | Member can submit proposal (title, description, topic) | SATISFIED | submitProposal Server Action; ProposalForm + ProposalPage |
| PROP-02 | Submissions go to moderation queue, NOT published automatically | SATISFIED | status='pending' hardcoded on INSERT; not in getApprovedProposals until approved |
| PROP-03 | Member sees status of own proposals (awaiting/approved/rejected + note) | SATISFIED | getMyProposals owner-isolated; SubmissionStatusCard renders status badges + moderator_note |
| PROP-04 | Approved proposals appear in public catalog (re-scoped D-B1 read-only) | SATISFIED (re-scoped) | /predlozheniya public catalog; votingSoon notice; voting deferred to Phase 3 |
| PROB-01 | Member can submit problem report | SATISFIED | submitProblemReport Server Action; ProblemReportForm |
| PROB-02 | Problem report has mandatory local/national level tag | SATISFIED | LevelEnum in Zod; level field required in schema; problemReportSchema.level |
| PROB-03 | For local problem, member selects municipality/oblast | SATISFIED | oblastSelector in ProblemReportForm; OBLAST_CODE_RE Zod validation; GeoIP auto-suggest |
| PROB-04 | Problem reports go through moderation queue | SATISFIED | status='pending' hardcoded; kind='problem' appears in moderation queue |
| PROB-05 | Member sees status of own problem reports | SATISFIED | getMyProblems owner-isolated; /member/signali page |
| EDIT-03 | Editor can create/edit/publish agitation pages | SATISFIED | Pages.ts Payload collection; Lexical editor; draft→published workflow |
| EDIT-04 | Editor sees moderation queue | SATISFIED | ModerationQueueView at /admin/views/moderation-queue; Tabs for proposals/problems/DSA |
| EDIT-05 | Editor can approve/reject with note | SATISFIED | approveSubmission + rejectSubmission Server Actions; transactional double-write |
| EDIT-06 | Editor can suspend account with moderation_log entry | SATISFIED | suspendUser Server Action; transaction; log row with user_suspend action |
| EDIT-07 | Editor can view attribution statistics | SATISFIED | AttributionView.tsx includes super_editor in role gate (Phase 4 D-A2 fix) |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|---------- |--------|
| `src/lib/email/templates/SubmissionStatusEmail.tsx` | 17-23, 46, 72 | Hardcoded Bulgarian body text; bg.json email.submissionStatus body keys exist but unused | WARNING | D-25 inconsistency; divergence risk between template and bg.json strings if either is updated |
| `src/lib/email/templates/AccountSuspendedEmail.tsx` | 27-31, 35 | Hardcoded Bulgarian body text; bg.json email.suspended.body key exists but unused | WARNING | Same D-25 inconsistency |
| `src/app/(frontend)/suspended/page.tsx` | 31 | `<Button>Изход</Button>` — literal Bulgarian string not sourced from bg.json | WARNING | D-25 violation; needs bg.json key and t() call |
| `src/collections/Pages.ts` | 29, 34 | isEditorOrAdmin uses ['admin','editor'] — excludes super_editor | BLOCKER | D-A2 principle violation: super_editor cannot CUD Pages in Payload admin |
| `src/collections/Ideas.ts` | 37, 42 | isEditorOrAdmin uses ['admin','editor'] — excludes super_editor | BLOCKER | Same: super_editor cannot CUD Ideas in Payload admin |
| `src/db/migrations/0003_phase04_submissions.sql` | 79, 82 | REVOKE uses placeholder `app_db_user` (not the real Neon role) | WARNING | The operator's STATE.md records this was applied — but if the actual Neon role is not `app_db_user`, the REVOKE was a no-op. Operator should verify with `SELECT has_table_privilege(current_user, 'moderation_log', 'UPDATE');` |

---

### Human Verification Required

#### 1. Operator walkthrough — approve and reject in /admin/views/moderation-queue

**Test:** Log in to Payload admin as an editor or super_editor. Navigate to /admin/views/moderation-queue. Submit a test proposal as a member, then in admin: (a) approve it, (b) verify it appears in /predlozheniya within 60s, (c) check BullMQ for a submission-status-approved job. Then reject a second submission with a note, verify the submitter's /member/predlozheniya shows 'rejected' status with the moderator's note.

**Expected:** (a) Approved proposal visible on /predlozheniya with "Член на коалицията" byline. (b) Rejected proposal NOT visible publicly; visible to submitter with rejection note. (c) Status-change emails delivered to submitter.

**Why human:** Plan 04-06 Task 5 blocked pending operator walkthrough. Integration tests mock the DB and cannot exercise the live Payload admin shell, BullMQ job delivery, or ISR revalidation end-to-end.

---

### Gaps Summary

**Gap 1 (BLOCKER): super_editor excluded from Pages and Ideas collection CRUD.**

Both `src/collections/Pages.ts` and `src/collections/Ideas.ts` define `isEditorOrAdmin` as `['admin', 'editor'].includes(role)`. This excludes `super_editor`. Per D-A2 (04-CONTEXT.md): "super_editor does everything editor does PLUS." A user with admin_users.role='super_editor' can access the moderation queue and attribution view, but CANNOT create/update/delete Pages or Ideas — breaking the D-A2 principle. Fix: add 'super_editor' to both isEditorOrAdmin allow-lists.

**Gap 2 (WARNING): D-25 string-lock partially violated in email templates and /suspended page.**

Three hardcoded Bulgarian strings that bypass bg.json:
1. `SubmissionStatusEmail.tsx` body text — bg.json has `email.submissionStatus.{approved,rejected}.body` but the template ignores them and uses hardcoded Bulgarian. The worker only sources the subject line via `loadT`.
2. `AccountSuspendedEmail.tsx` body text — same issue; bg.json has `email.suspended.body` but template hardcodes.
3. `/suspended/page.tsx` line 31: `Изход` is hardcoded; no corresponding bg.json key exists.

The strings in bg.json and in the templates are functionally equivalent today, but the divergence risk makes future copy changes error-prone. The WelcomeEmail and NewsletterEmail templates in Phase 5 use the correct `t()` prop pattern.

**Known pending (not a code gap): Operator walkthrough of approve+reject in production admin panel.** Automated tests cover the Server Action layer (integration tests pass). The end-to-end live admin walkthrough is blocked on operator time per plan 04-06 SUMMARY.

---

_Verified: 2026-05-10T21:05:00Z_
_Verifier: Claude (gsd-verifier)_
