# Phase 4: User Submissions + Editorial Moderation - Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers (1) member submissions for political proposals and problem reports, (2) the full editorial moderation queue + workflow, (3) public surfaces for approved submissions, and (4) the foundational admin / role / moderation_log infrastructure that was originally scoped to Phase 3.

**Critical re-scoping context (2026-05-10):** Phase 3 (voting catalog) is paused under the `D-LawyerTrack` decision in STATE.md (lawyer engagement deferred until a shipping phase requires it). Three Phase-3-owned items therefore migrate into Phase 4: EDIT-01 (admin login + role gating), EDIT-02 (Payload Ideas collection CRUD without voting fields), and the `moderation_log` table schema. Phase 4 ships these as standalone — Phase 3, when re-activated, layers vote-related columns on the same `ideas` table without schema-rebase.

**14 of 14 numbered Phase 4 requirements ship under this re-scope.** The originally voting-dependent PROP-04 ("approved proposals appear in catalog and are votable") is re-scoped to a read-only public page (D-B1 below) — voting layers on later when Phase 3 unblocks.

**Out of scope (deferred, do NOT plan into Phase 4):**
- Voting on proposals or problem reports (Phase 3 / re-activation)
- Member-submitted political-opinion attribution with named byline (lawyer-track required; see D-C1)
- Phase 5 newsletter authoring UI from admin panel (already covered by existing BullMQ broadcast; admin trigger is implementation detail, not a numbered req)
- Anything that would require Art.9 special-category-data consent flow

</domain>

<decisions>
## Implementation Decisions

### A. Admin foundation + moderation_log ownership

- **D-A1:** **Phase 4 absorbs EDIT-01 (admin login + role gating), EDIT-02 (Payload Ideas collection CRUD without voting fields), and the `moderation_log` table schema** — all originally Phase 3 work. Phase 3, when reactivated, will add vote-related columns to the existing `ideas` table without rebasing the schema. Adopt the `moderation_log` schema sketch from `.planning/phases/03-idea-catalog-voting/03-CONTEXT.md` D-08 (`(id, action, actor_user_id, target_kind, target_id, target_ids[], note, created_at)` append-only) and extend the `action` enum with `submission_approve`, `submission_reject`, `user_suspend`, `user_unsuspend`, `editor_grant`, `editor_revoke`. No structural change vs Phase 3's planned schema.
- **D-A2:** **Two roles: `editor` and `super_editor`.** `editor` does moderation, publishing, suspension. `super_editor` does everything `editor` does PLUS: grant/revoke `editor` to other users, reverse suspensions, and override moderation decisions (mark a previously approved/rejected submission as the opposite, with required note). Bootstrap: first `super_editor` is created by operator via direct DB seed (documented in `.planning/phases/04-…/04-OPS-RUNBOOK.md` to be produced during execution). "Last super_editor cannot be demoted" guard at the `editor_revoke` Server Action layer. Role storage: `users.role` enum column on the application `users` table (NOT a separate Payload Users collection — keep one identity source).

### B. PROP-04 fallback (approved proposals without votable catalog)

- **D-B1:** **Approved member proposals appear on a read-only public page `/предложения` (working slug — final URL TBD by planner per UI-SPEC).** Each proposal renders as a Card with title + body + topic + submission date + (anonymous) byline per D-C1. The page header carries an explicit notice (Bulgarian copy locked in `messages/bg.json` per Phase 3 D-25 pattern) explaining that voting will be introduced in a future release. Proposals never auto-publish — every public proposal has been approved by an `editor` via the moderation queue (EDIT-05). When Phase 3 voting re-activates, the same `ideas` rows become votable with no migration: planner wires the `VoteButtons` component into this page.

### C. Member byline policy

- **D-C1:** **Anonymous on every public surface; full identity preserved internally.** All public renders of member-submitted content (proposals on `/предложения`, problem-report aggregates on the heat-map page) attribute as "Член на коалицията" or "Анонимен сигнал" — no name, sector, oblast, or initials are exposed publicly. Internally (admin moderation queue, moderation_log) the editor sees full member identity: full_name, email, sector, role, registration_source. **Rationale:** keeps Phase 4 OUT of GDPR Art.9 trigger territory under the `D-LawyerTrack` deferral — public surface processes only de-identified content, so the existing Art.6(1)(f) coalition-member legitimate-interest basis (used since Phase 1) covers it. Re-activation path: when the lawyer engagement resumes and an opinion confirms Art.9(2)(a) consent text, an optional `display_name` column can be added (follow the Phase 1 D-11 deferred-column pattern noted in `03-CONTEXT.md` D-01) without schema rebase.

### D. PROB surface (problem-report public visibility)

- **D-D1:** **Aggregated heat map per oblast; no individual records on public surface.** New page `/проблеми` (working slug — final URL TBD): map of Bulgaria with per-oblast counts (highest density highlighted), plus a topic breakdown table showing top topics within each oblast. Member's PROB-05 self-status page (private to the submitter) is unchanged in scope.
- **D-D2:** **Small-N suppression: oblast+topic buckets with N<5 are hidden entirely** (no count, no row in the breakdown). National-level reports are exempt from oblast-level small-N (they aggregate into a single national bucket and use the same N≥5 rule for topic breakdown). Aggregation cache strategy (real-time vs daily) and topic taxonomy (free-text vs predefined) are HOW questions for the planner.

### Claude's Discretion

The user explicitly opted out of these threads to avoid premature implementation lock-in. Planner has full discretion within stated decisions:
- Bootstrap mechanism for first super-editor (DB seed vs env-var-injected vs OAuth-domain restriction)
- Payload roles vs application-roles storage details (D-A2 names the column; storage details flexible)
- Audit-log policy for super-editor override actions (must log; format TBD)
- moderation_log additional fields beyond Phase 3's D-08 sketch
- PROP-04 page placement in nav (top-level, sub-section under /agenda, footer-only)
- PROB heat-map update cadence (real-time vs daily aggregate cache vs hybrid)
- PROB topic taxonomy (free-text vs admin-curated list vs hybrid)
- Section heading copy on public pages (per D-25 string-lock contract — final BG strings during planning)
- Internal admin "open submitter identity" privacy gradient (full-default vs explicit-action-with-audit-log)
- DSA Art.16 reporting mechanism scope (the phase goal mentions it; no numbered req covers it — planner judges minimum compliance)
- Notification cadence when submission status changes (immediate / batched / respect Phase 5 channel preferences)
- Suspended-account submission handling (preserve / hide / anonymize; default = preserve + show as "[suspended]" in admin)

### Folded Todos
None — todo matcher returned 5 low-confidence (score 0.6) results, all on other concerns (cloudflare WAF, GitHub prod env, payload patches, Phase 02.3 follow-up). Reviewed in `cross_reference_todos`; none were Phase 4 scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project state and lawyer-deferral context
- `.planning/STATE.md` — `D-LawyerTrack` row in Deferred Items table (committed `5d0453f` 2026-05-10) is the load-bearing decision for this entire phase's re-scoping
- `.planning/PROJECT.md` — coalition mission, MSP-sector advocacy framing, language constraints (Bulgarian UI, English code/internal docs)
- `.planning/REQUIREMENTS.md` lines 59–80 — full PROP-01..04, PROB-01..05, EDIT-03..07 acceptance criteria (Bulgarian)
- `.planning/ROADMAP.md` lines 204–222 — Phase 4 goal + 5 success criteria + dependencies declaration
- `CLAUDE.md` — stack (Next.js 15 + Payload 3.84 + Drizzle 0.45 + Auth.js v5 + Tailwind 4 + shadcn/ui), GDPR component map, "Защита от злоупотреба" constraints

### Phase 3 inheritance (decisions that constrain Phase 4)
- `.planning/phases/03-idea-catalog-voting/03-CONTEXT.md` — full Phase 3 decision set; especially:
  - D-01 (anonymous public votes) sets precedent for D-C1
  - D-08 (`moderation_log` schema sketch) is canonical schema for D-A1
  - "Phase 4 EDIT-06 extends with `user_suspend` / `submission_reject` action enum values (no schema change)" — locked in D-A1
  - D-25 (Bulgarian string lock-in pattern via `messages/bg.json`) applies identically to Phase 4 strings
- `.planning/phases/03-idea-catalog-voting/03-RESEARCH.md` — anti-abuse research (rate-limit, cooling, Turnstile) is reusable for member submissions even without voting
- `.planning/phases/03-idea-catalog-voting/03-PATTERNS.md` — admin views (`/admin/views/vote-anomalies`) and Payload collection patterns reusable for moderation queue UI

### Earlier-phase patterns to reuse
- `.planning/phases/02.1-attribution-source-dashboard/02.1-CONTEXT.md` — D-01 / D-25 MaxMind GeoLite2 self-hosted IP geolocation (server-side only; never raw IP to client). Reuse for PROB-03 oblast picker if member oblast needs auto-prefill from registration source. Note: per `consents.region` stays Phase 6 per `D-ConsentsRegionPopulation`.
- `.planning/phases/02.1-attribution-source-dashboard/02.1-CONTEXT.md` — admin dashboard pattern (`/admin/views/attribution`) is the template for moderation queue UI
- `.planning/phases/01-foundation/01-CONTEXT.md` — Auth.js v5 session-cookie + Drizzle adapter pattern; member registration data model
- `.planning/phases/05-notifications/05-CONTEXT.md` — BullMQ broadcast queue + React Email templates; reuse for "submission status changed" emails (D-A1 implementation note)

### Legal context (for the planner's awareness, not for implementation)
- `.planning/legal/art9-brief-to-counsel.md` — explains why anonymous-public is the only safe default under defer-lawyer; section 1 explicitly identifies submitting + recording political-opinion-revealing content as the Art.9 surface
- `.planning/legal/art9-attachment-ropa-draft.md` — the existing ROPA already lists "user submissions to moderation queue" as a Phase 4 processing activity with internal-only data flow

### External
- EU Digital Services Act Art.16 (notice-and-action mechanism) — referenced in Phase 4 goal; planner must implement at minimum compliance level (likely a "report content" form for any user). Not a separate doc in `.planning/`.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Auth.js v5 session + middleware** (Phase 1): role-gate the `/admin/*` routes via session check; add `users.role` enum to existing schema.
- **Payload CMS Globals/Collections pattern** (Phase 02.x): admin UI for editor moderation queue layers on top of an existing Payload Collection (e.g., new `Submissions` collection with `status: pending|approved|rejected|hidden`); the Lexical editor is already wired for the agenda content; reuse for proposal body editing in admin.
- **next-intl `messages/bg.json` + `loadT` pattern** (Phase 5 BullMQ worker): same pattern for any Phase 4 server-side strings (notification email subjects/bodies, admin queue empty states).
- **MaxMind GeoLite2 server-side IP geolocation** (Phase 02.1, `src/lib/ip.ts`): reusable for auto-suggesting member's oblast on PROB-03 selector (server-side only; member confirms or overrides).
- **BullMQ broadcast queue** (Phase 5, `src/jobs/blast-worker.tsx`): reuse for "your proposal was approved/rejected" notifications. Brevo as transport; Bulgarian email subjects via `email.*` next-intl namespace.
- **Cloudflare Turnstile + Upstash rate-limit** (Phase 1 + Phase 02.x): apply to PROP-01 and PROB-01 submission endpoints — same anti-abuse pattern as registration.
- **Bulgarian-oblast canonical list** (Phase 02.1 attribution): exists in `messages/bg.json` under `oblast.*`; reuse for PROB-03 picker labels and PROB heat-map labels.

### Established Patterns
- **Server Actions for member-facing mutations** (Phase 1, Phase 02.x): all PROP-01, PROB-01 submissions go through Server Actions with Zod validation and Turnstile verification.
- **Append-only audit tables** (Phase 1 `consents`, Phase 5 `email_events`): same pattern for `moderation_log` — `INSERT-only` at DB permission level (per Phase 6 GDPR-driven hardening; planner can enforce now or defer).
- **Manual Neon DDL migration via SQL editor** (Phase 1+, project memory `project_payload_schema_constraint.md`): every new collection/global/field for Phase 4 (Submissions, ProblemReports, moderation_log) needs hand-written DDL applied via Neon SQL — `payload migrate` blocked by tsx/Node 22 ESM incompat.
- **D-25 Bulgarian copy lock-in BEFORE source files** (Phase 3 plan 03-01 pattern): all Phase 4 user-facing strings must enter `messages/bg.json` under stable `submission.*`, `problem.*`, `admin.queue.*`, `admin.suspended.*`, `email.submissionStatus.*` namespaces during the first plan, before any JSX/Server Action references them.
- **Phase 02.x test-first scaffold** (Phase 3 plan 03-01 pattern): Wave 0 / Plan 1 = unit-test scaffolds + bg.json string lock; Wave 1+ implements source files against those failing tests.

### Integration Points
- **Phase 5 notification channels**: status-change emails route through existing `notifications/` infrastructure; respect `users.preferred_channel` (email | whatsapp | telegram | none).
- **Phase 3 re-activation**: future Phase 3 plans must add `votes`, `vote_events_log`, `vote_anomalies` tables AND add `votable: boolean` + `votes_open_at: timestamptz` columns to the `ideas` table; the existing Phase 4 `ideas` rows become retroactively votable when the column flips. Phase 4 should NOT block votability columns from being added later (avoid `STRICT TABLE` constraints that would prevent additive ALTER).
- **Phase 02.1 attribution registration_source**: surfaced on submitter detail in admin moderation queue (helps editor judge submission credibility — e.g., QR-mail-drop registrants vs. organic-search registrants).

</code_context>

<specifics>
## Specific Ideas

- **Heat-map of Bulgaria** (D-D1) — visual reference: existing Phase 02.1 attribution dashboard's per-oblast view is the closest analog. The planner can reuse the same SVG oblast outline + color-density pattern; the data source is `(SELECT oblast, count(*) FROM problem_reports WHERE status='approved' GROUP BY oblast HAVING count(*) >= 5)` rather than attribution events.
- **"Гласуването скоро" notice on `/предложения`** (D-B1) — exact Bulgarian copy is the planner's discretion under the D-25 string-lock contract; the message should commit to the eventual return of voting without giving a date (dates expire badly).
- **"Член на коалицията" / "Анонимен сигнал" attribution labels** (D-C1) — these two strings are canonical; do not introduce variants like "Анонимен член" or "Гражданин" elsewhere on public surfaces.

</specifics>

<deferred>
## Deferred Ideas

These came up but belong in other phases or future work:

- **Voting on member-submitted proposals** — Phase 3 re-activation (D-LawyerTrack must clear first; Art.9 opinion required).
- **Optional `display_name` byline** (D-C1 re-activation path) — Phase 4 follow-up after Art.9(2)(a) consent text is lawyer-confirmed.
- **DSA Art.16 reporting mechanism scope decision** — flagged as planner's discretion; if planner finds the minimum-compliance bar requires more than a footer link + email, escalate as a follow-up question during planning.
- **Proposal reactions (interesting / save) without voting** — out of scope for this phase; if community signal value emerges before Phase 3 reactivates, capture as a separate phase.
- **Per-signal detail pages for problem reports** (rejected option D-D1.c during discussion) — not planned; would only make sense if PROB-* evolves into a per-issue advocacy surface (would need its own discuss-phase cycle).
- **Editor "compare with prior policy" view** for proposal moderation — planner discretion if needed for moderation UX.
- **Notification preferences edit from member dashboard** — Phase 6 GDPR self-service surface (already in roadmap).

### Reviewed Todos (not folded)
None — see Folded Todos note above; all 5 matches were on other concerns and not Phase 4 scope.

</deferred>

---

*Phase: 4-User Submissions + Editorial Moderation*
*Context gathered: 2026-05-10*
