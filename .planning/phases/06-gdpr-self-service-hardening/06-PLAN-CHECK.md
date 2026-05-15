# Phase 06 — Plan Check Report

**Phase:** 06 — GDPR Self-Service + Hardening
**Plans checked:** 15 (06-01..06-15)
**Date:** 2026-05-15
**Verdict:** ISSUES FOUND

---

## Summary

The plan set is structurally excellent — dependency DAG is clean, wave assignments match `depends_on` exactly, every plan carries a `must_haves` block with truths + artifacts + key_links, every plan has a `threat_model` (security tier appropriate for a GDPR-heavy phase), task counts are within 2-4 per plan (06-09 is 1-task / minimal-surface; 06-10 is 4-task / UX-heavy but justified), and i18n namespaces partition cleanly across 06-05/06-06/06-08/06-10/06-11 with zero collisions. Threat models cover ASVS L1 with no unmitigated HIGH-severity threats. CONTEXT.md decisions D-01..D-16 are all addressed in the planning surface.

**However**, three BLOCKER findings prevent execution from succeeding as planned: (1) Plan 06-02 §3 SQL JOIN references `consents.attr_sid` which does not exist in the live schema — apply will throw at the operator's Neon SQL Editor; (2) Plans 06-05 + 06-06 + CONTEXT D-02/D-07 reference a `newsletter_preferences` TABLE that does not exist (Phase 5 D-08 stores newsletter prefs as `consents.kind='newsletter_*'` rows instead) — export builder will not compile, cascade step 5 will throw on import; (3) Plan 06-10 plans to add `session.user.status === 'pending_deletion'` check to `src/middleware.ts`, but the existing middleware is Edge-runtime and explicitly forbids importing `auth()` or `@/db` per the in-file security comment (commit history shows the previous Phase 1 middleware was deleted for exactly this reason).

Six WARNINGs flag user-facing-copy / schema-drift / planning-credibility issues that should be fixed but do not block execution.

---

## ISSUES FOUND

### Dimension 2 (CONTEXT compliance) + Dimension 10 (plan-author drift)

- **Plan 06-02:** D-10 `consents.region` backfill JOIN structurally broken (severity: **BLOCKER**)
  - Found: §3 SQL `UPDATE consents AS c SET region = ae.first_oblast FROM attribution_events AS ae WHERE c.attr_sid = ae.attr_sid AND c.region IS NULL` — but `consents.attr_sid` column does NOT exist in `src/db/schema/consents.ts` (only `id, user_id, kind, granted, version, granted_at, region`). Planner included a "NOTE: confirm `consents.attr_sid` column name" hedge but did not verify against the actual schema before committing the SQL.
  - Expected: Either (a) add `attr_sid` column to `consents` first via this same migration and accept that historical rows have NULL `attr_sid` (no useful backfill possible), or (b) rewrite the JOIN via `consents.user_id = attribution_events.user_id` (only backfills for consents that already have user_id linkage; pre-OTP-linkage rows stay NULL — acceptable for D-10's "best-effort" intent).
  - Fix: Replace the JOIN in Section 3 with `WHERE c.user_id = ae.user_id AND ae.user_id IS NOT NULL AND c.region IS NULL AND ae.first_oblast IS NOT NULL` and update the corresponding test stub in `06-01-PLAN.md` line 239.

### Dimension 3 (RESEARCH compliance) + Dimension 10 (plan-author drift)

- **Plan 06-05 + 06-06 + CONTEXT D-02/D-07:** `newsletter_preferences` table does not exist (severity: **BLOCKER**)
  - Found: Plan 06-05 imports `newsletter_preferences` and includes it as bundle key #6 (D-02 item 6). Plan 06-06 cascade step 5 says `await tx.delete(newsletter_preferences).where(eq(newsletter_preferences.user_id, userId))`. No such table exists in the codebase. `src/db/schema/` contains only `attribution.ts`, `auth.ts`, `consents.ts`, `submissions.ts`, `index.ts`. Phase 5 D-08 stores newsletter preferences as new rows in the `consents` table with `kind IN ('newsletter_general','newsletter_voting','newsletter_reports','newsletter_events')`.
  - Expected: Either (a) remove `newsletter_preferences` from the export bundle keys (consents already covers them) and remove cascade step 5 entirely, or (b) document explicitly that Phase 5 ships a separate `newsletter_preferences` table (it does not — verified `src/db/schema/consents.ts` is the storage path).
  - Fix: Plan 06-05 drops the `newsletter_preferences` import + bundle key; the consent rows are already exported under bundle key `consents`. Plan 06-06 deletes cascade step 5 (consent kind rows stay as audit per D-13 consents-append-only contract; their `region` is already nulled by step 3). Update CONTEXT.md D-02 #6 + D-07 step 5 accordingly OR mark this as a CONTEXT correction in Plan 06-15 closeout.

### Dimension 10 (plan-author drift) + project conventions

- **Plan 06-10 Task 3:** Middleware redirect plan violates existing Edge-runtime constraint (severity: **BLOCKER**)
  - Found: Plan 06-10 must_have at line ~750 declares "src/middleware.ts adds pending_deletion status check → redirects authenticated users to /account-pending-deletion". Task 3 (lines 525-583) writes code that reads `session.user.status === 'pending_deletion'` inside middleware. But `src/middleware.ts` lines 12-22 explicitly forbid this: "The previous Phase 1 middleware was DELETED because it imported auth() -> DrizzleAdapter -> node:crypto + pg, none of which run on Edge." The current middleware is a cf-ray gate only — no auth, no DB, no `@/lib/auth` import. There is no existing "suspended-status check" in the middleware for Phase 4 D-A1; that check lives in `member/layout.tsx` only.
  - Expected: Either (a) move the pending_deletion redirect into `member/layout.tsx` + every authenticated route's layout (mirrors Phase 4 D-A1 pattern), or (b) augment the Auth.js session callback to put `status` on the JWT (which IS Edge-readable) and read from JWT cookies in middleware. The plan must pick one and rewrite Task 3.
  - Fix: Rewrite Task 3 to use layout-level checks (canonical pattern from `member/layout.tsx`). Update Plan 06-10 `files_modified` to include the relevant layout files instead of `src/middleware.ts`. Update threat model T-06-10-02 mitigation to reference layout enforcement, not middleware.

### Dimension 4 (UI-SPEC compliance) — User-facing copy contradiction with schema

- **Plan 06-10 bg.json bullet 2:** Deletion bullets promise deletion of fields that don't exist (severity: WARNING)
  - Found: `member.deleteAccount.bullets.2` reads "След 30 дни личните ви данни (име, имейл, телефон, област) се изтриват необратимо." UI-SPEC §S2 (line 245-246) also reads "(име, имейл, телефон, област)". But `src/db/schema/auth.ts` users columns are `{name, email, full_name, sector, role, self_reported_source, self_reported_other, status, platform_role, preferred_channel, ...}` — NO `phone`, NO `oblast`. Plan 06-06 cascade tombstone correctly comments out `phone` and `oblast` with "verify column exists". The user-facing copy will mislead members about what data is held.
  - Expected: Copy must reflect actual data minimization — list only fields actually stored. The Phase 1 D-08 minimal-PII contract is `(име, имейл, сектор, роля)` — not phone or oblast.
  - Fix: Either (a) update bullet 2 + UI-SPEC §S2 + accountPendingDeletion.consequences copy to "(име, имейл, сектор)", or (b) wait for a future phase that adds phone/oblast and update copy then. Recommend (a) for Phase 6 ship.

### Dimension 9 (project conventions / schema cleanup)

- **Plan 06-02 §3:** `email_at_consent` column added but never populated (severity: WARNING)
  - Found: §3 adds `ALTER TABLE consents ADD COLUMN IF NOT EXISTS email_at_consent text NULL`. Plan 06-06 cascade step 3 strips it via SET NULL. No plan in Phase 6 or prior phases populates this column. Pure schema bloat.
  - Expected: Add a column only when a writer exists. Either (a) drop the column add (cascade step 3 also drops the email_at_consent strip) since stripping a never-populated column is a no-op, or (b) add a Phase 6 writer that populates it on every consent INSERT (Plan 06-09 or a new step).
  - Fix: Recommend (a) — drop `email_at_consent` from §3 ADD COLUMN list, drop from CONTEXT D-07 step 3 and Plan 06-06 cascade step 3, update VALIDATION map test stub `email_at_consent: null` regex (06-06-PLAN.md:724) to remove that line.

### Dimension 3 (RESEARCH compliance) + plan-author drift

- **Plan 06-09:** GeoIP module path drift (severity: WARNING)
  - Found: Plan references `src/lib/attribution/geoip.ts` (inherited from CONTEXT.md + RESEARCH.md). Actual location is `src/lib/geoip.ts`. CONTEXT/RESEARCH are wrong upstream, but the planner should have verified during `read_first` and corrected. Plan 06-09 lines 87, 94, 142, 161 all reference the wrong path.
  - Expected: Import path `@/lib/geoip` not `@/lib/attribution/geoip`. The `read_first` block does say "confirm export name + signature" but doesn't catch the path itself.
  - Fix: Replace all `src/lib/attribution/geoip.ts` → `src/lib/geoip.ts` in Plan 06-09. Cosmetic fix to CONTEXT.md + RESEARCH.md noted but not blocking (those are upstream artifacts).

### Dimension 7 (security threat model)

- **Plan 06-06 + 06-02:** cookie_consents.user_id not nulled on tombstone (severity: WARNING)
  - Found: `cookie_consents.user_id` has `ON DELETE SET NULL`, but the deletion cascade UPDATEs `users` (tombstone) instead of DELETEing. The FK trigger does not fire on UPDATE. The cookie_consents row retains `user_id` pointing to a deleted-status user. Cascade has no step to null this out.
  - Expected: Either cascade step adds `UPDATE cookie_consents SET user_id = NULL WHERE user_id = <id>`, or this is documented as intentional (consent record retains anonymous-linkage hash for audit).
  - Fix: Add a step to cascade (between step 5 and 6.5): `await tx.update(cookie_consents).set({ user_id: null }).where(eq(cookie_consents.user_id, userId))`. Add a test stub for this in 06-06 test file.

### Dimension 12 (manual-gate sequencing) + Dimension 6 (Wave 0 dependencies)

- **Plan 06-02 vs Plan 06-03/04/05/06:** DDL apply gate sequencing (severity: WARNING)
  - Found: Plan 06-02 declares `manual: true` (operator applies SQL via Neon) and is `depends_on: [06-01]` only. Plans 06-03 (schema mirror), 06-04 (Bunny), 06-05 (export worker), 06-06 (cascade) all `depends_on: 06-03` but not directly on 06-02. The DDL apply gate document (06-DDL-APPLY.md) is the operator sign-off that must precede 06-03's Drizzle schema authoring — but the DAG allows 06-03 to run when 06-02's code is committed even before operator applies SQL. Plan 06-03 doesn't import or run against the live DB, so this won't break at typecheck time, but Plan 06-06's boot-time assertion (scripts/start-worker.ts) and any subsequent integration test will fail until 06-02 SQL is applied to staging+prod.
  - Expected: Plan 06-03's `depends_on: [06-01, 06-02]` (already correct). But subsequent waves should explicitly note "06-02 DDL-APPLY signed off" as a deployment precondition. Plan 06-15 closeout already gates on 06-DDL-APPLY.md; this is acceptable but should be flagged in the OPS-RUNBOOK.
  - Fix: Add a line to 06-OPS-RUNBOOK.md (authored in Plan 06-13) that explicitly states "06-DDL-APPLY.md MUST show APPLIED for both staging and prod before any Wave 3 or Wave 4 plan's code can deploy". Add the same gate to Plan 06-15 closeout checklist.

---

## Aggregate

- Total BLOCKERs: **3**
- Total WARNINGs: **6**
- Total NITs: 0

### Recommendation

3 blockers require revision before execution. Re-spin planner with this report; the issues are scoped (one SQL JOIN fix, one phantom-table removal, one middleware rearchitecture) and revision should take one cycle.

After blocker fixes, the 6 warnings (copy/schema-bloat/path-drift/cascade-completeness/manual-gate-doc) can be folded into the same revision pass since they touch the same plans (06-02, 06-06, 06-09, 06-10, 06-13).

Once blockers + warnings cleared, the phase is in excellent shape across dimensions 1, 4, 5, 6, 7, 8, 11, 12, 13 (requirement coverage, UI-SPEC compliance, wave/dependency structure, task completeness, threat models, sampling continuity, i18n key partitioning, manual-gate sequencing, scope hygiene). The phase boundary holds — no scope creep into Phase 999.3/999.4/999.21 deferred items, no contradiction of CONTEXT.md locked decisions (D-01..D-16 all addressed), no proactive D-CookieVaryCacheRule implementation (per D-16).

