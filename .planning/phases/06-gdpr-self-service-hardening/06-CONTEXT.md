# Phase 6: GDPR Self-Service + Hardening - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Members can exercise their GDPR data rights (export and deletion); the full deletion cascade reaches the ESP and all downstream processors; audit tables (`deletion_log`, `moderation_log`) are INSERT-only at DB permission level (no raw IP ever in persistent tables — verification only, already enforced by Phase 02.1 D-19); the platform meets WCAG 2.1 AA on core flows and passes a 2x load test before large-scale campaign expansion.

**Requirements covered:** GDPR-04, GDPR-05, GDPR-06, GDPR-07, GDPR-08, GDPR-09, BRAND-04, BRAND-05.

Out of scope (belong elsewhere): editor admin nav links (`D-EditorNavLinks` follow-on todo); CI test suite rot (theme.test.ts 13 failures — separate quick task when prioritised); Phase 3 idea-catalog + voting (paused on `D-LawyerTrack`).

</domain>

<decisions>
## Implementation Decisions

### Data Export (GDPR-04)

- **D-01:** Export delivery = **async via BullMQ → Bunny.net signed URL → transactional email**. User clicks "Заявка за извличане на данни" in `/member/preferences` (or new `/member/data-rights` page) → Server Action enqueues a `data-export` job → worker builds JSON bundle, uploads to Bunny.net with a 7-day signed URL, fires email kind `data-export-ready` (Pattern P6 from Phase 5 transactional templates). Scales for any account size; avoids Fly request-timeout (~30s) and worker-side OOM; audit-friendly (the `export_requested_at` timestamp on `users` + a `deletion_log` (or `data_rights_log`) row captures the event). Reuses Phase 1 BullMQ infrastructure + Phase 5 React Email + Bunny.net (already in stack per CLAUDE.md).

- **D-02:** Export bundle scope = **all PII-bearing rows linked to the user**, in a single JSON file:
  1. `users` profile (email, full_name, sector, role, status, self_reported_source, self_reported_other)
  2. `votes` (all rows where `voter_id = user.id`) — empty until Phase 3 ships
  3. `submissions` (all rows where `submitter_id = user.id`, all kinds: proposal / problem / DSA)
  4. `consents` (audit trail of consent grants/withdrawals + region after D-10 backfill — INCLUDES all newsletter-preference rows where `kind LIKE 'newsletter_%'`, since Phase 5 D-08 stores newsletter prefs as rows in this table, NOT a separate `newsletter_preferences` table)
  5. `attribution_events` (rows where `user_id = user.id` post-linkage per Phase 02.1 D-07)
  6. `moderation_log` actions where this user is the `actor_user_id` (editorial users only)

  Each table = a top-level key in the JSON; emit empty arrays `[]` for tables with no rows so the structure is stable across users. Include a `metadata` block with `exported_at`, `format_version: 1`, `user_id_hash` (for support).

  **Schema correction (Phase 6 revision):** Earlier drafts listed `newsletter_preferences` as a separate bundle key (#6). That table never existed — Phase 5 D-08 stores newsletter preferences as rows in the existing `consents` table with `kind IN ('newsletter_general', 'newsletter_voting', 'newsletter_reports', 'newsletter_events')`. Those rows are already covered by bundle key `consents`. No separate key needed.

- **D-03:** Export bundle format = **single JSON file** (UTF-8, indent 2). NOT CSV-per-table — JSON keeps the relational structure intact (one user could otherwise grep multiple files). NOT ZIP (one file is simpler; signed URL goes direct to the JSON). If the future regulator asks for CSV, add `?format=csv` flag then.

### Account Deletion (GDPR-05, GDPR-06, GDPR-07)

- **D-04:** Deletion initiation UX = **typed-text confirmation `ИЗТРИЙТЕ` + immediate email notification**. Settings page → "Изтриване на акаунт" destructive button → modal asks user to type exactly `ИЗТРИЙТЕ` to enable the confirm button (case-sensitive Cyrillic). Confirm → `users.status` flips to `pending_deletion`, `users.deletion_requested_at = now()`, an email-kind `account-deletion-pending` fires immediately with grace-period date + cancel link. High-friction enough to prevent misclick; no email round-trip blocking the action; matches GitHub/Stripe destructive-action UX pattern.

- **D-05:** Grace period = **30 days; account locked during grace**. Login during grace → user routed to a Bulgarian "Acccount scheduled for deletion on YYYY-MM-DD" page with a "Отказване на изтриването" OTP-protected cancel CTA. Cancel → flips `status` back to `active`, clears `deletion_requested_at`, sends `account-deletion-cancelled` confirmation email. Mirror the existing `/suspended/page.tsx` pattern (Phase 4 D-EDIT-suspension).

- **D-06:** Content fate on deletion (purge job runs on day 30) = **anonymize-and-preserve**. The user's row stays as a tombstone — `email`, `full_name`, `self_reported_source`, `self_reported_other` set to NULL; `status` set to `deleted`; `email_hash` retained for de-dup. (No `phone` or `oblast` columns exist on the users table — those were referenced in earlier draft copy but have never been part of the Phase 1 D-08 minimal-PII set, which is `{name, email, full_name, sector, role}`.) Linked submissions/votes/problem-reports KEEP `submitter_id = <tombstone user.id>` so aggregates (vote counts, oblast heat-map, /predlozheniya catalog) stay intact. Per GDPR Art. 17(3) carve-outs (freedom of expression / public interest), this needs lawyer sign-off on the rationale text — captured as deferred under `D-LawyerTrack`. The deletion_log row records `target_user_id_hash` (SHA-256 of original user.id) + `deleted_at` + `deletion_reason` ("user_request") — NO PII, no original user_id.

- **D-07:** Deletion cascade order (worker job, run on day 30 after a final cancellation check):
  1. UPDATE `users` SET email=NULL, full_name=NULL, self_reported_source=NULL, self_reported_other=NULL, status='deleted' (the `users` table has no `phone` or `oblast` columns — earlier drafts mentioned them in error; only NULL columns that exist on the schema)
  2. UPDATE `attribution_events` SET user_id=NULL WHERE user_id=<id> (unlink, preserve aggregate counts)
  3. UPDATE `consents` SET region=NULL WHERE user_id=<id> (keep the append-only audit trail of consent events including all newsletter-preference rows but strip the region PII). No `email_at_consent` column ever shipped on the consents table; earlier drafts referenced it in error.
  4. DELETE FROM `sessions` WHERE userId=<id> (Auth.js)
  5. UPDATE `cookie_consents` SET user_id=NULL WHERE user_id=<id> (the FK has `ON DELETE SET NULL`, but the cascade UPDATEs the users row instead of DELETEing it — the FK trigger does not fire on UPDATE, so explicit NULL here is required to fully detach anonymous cookie-consent history from the tombstoned user). Newsletter-preference rows are NOT separately deleted — they are stored in `consents` (kind LIKE 'newsletter_%'), which is append-only per D-13, and step 3 already strips their region PII.
  6. Cancel any in-flight BullMQ jobs targeting this user (best-effort; idempotency makes failure safe). Also DELETE FROM `data_export_jobs` WHERE user_id=<id> (after fetching paths so the worker can DELETE the Bunny blobs).
  7. Brevo: call `DELETE /contacts/{email}` to remove from ESP contact list AND add `email_hash` to local suppression list
  8. INSERT INTO `deletion_log` (target_user_id_hash, deleted_at, deletion_reason='user_request')
  9. The `submissions` / `votes` / `problem_reports` rows are NOT touched — anonymization is via the tombstone `users` row (D-06).

  Whole cascade wrapped in a Drizzle transaction; the Brevo API call lives outside the tx (idempotent + retried in the worker if it fails).

### Audit Table Hardening (GDPR-08)

- **D-08:** Audit-table INSERT-only enforcement = **REVOKE UPDATE, DELETE at DB level + assertion test**. Reuse the Phase 4 pattern from `src/db/migrations/0003_phase04_submissions.sql:87` (`REVOKE UPDATE, DELETE ON TABLE moderation_log FROM <app_db_user>`). New `deletion_log` table created in this phase gets the same REVOKE. Unit test asserts `has_table_privilege(current_user, 'deletion_log', 'UPDATE')` returns false in staging + prod via boot-time check (similar to Phase 5 G4 Redis policy assertion in `scripts/start-worker.ts`).

### Cookie Consent Schema (N-1 carry-forward from Phase 1)

- **D-09:** Anonymous cookie-consent persistence schema = **new `cookie_consents` table** with `(anon_id UUID, choices JSONB, consent_at timestamp, withdrawn_at timestamp NULL, ip_hash TEXT)`. CookieYes posts consent events to a new Server Action endpoint; row INSERTed with `attr_sid` cookie (Phase 02.1 D-05) as `anon_id` when present, else a fresh UUID. NOT linked to `users` until the user later registers (then a follow-on UPDATE sets `user_id` via the verifyOtp linkage path, mirroring Phase 02.1 D-07). This closes Phase 1 plan-check N-1 (`.planning/phases/01-foundation/01-PLAN-CHECK.md` §2).

### Consents Region Backfill (D-ConsentsRegionPopulation carry-forward)

- **D-10:** `consents.region` backfill = **Server Action + one-time migration** writing the GeoIP-resolved oblast into `consents.region`. New consents always populate region at INSERT time (via the existing Phase 02.1 GeoIP worker — `src/lib/geoip.ts`). Existing consents rows backfilled via a Drizzle migration step joining `consents JOIN attribution_events ON consents.user_id = attribution_events.user_id` and copying `first_oblast` into `consents.region` (the `consents` table has NO `attr_sid` column — earlier drafts that joined on `consents.attr_sid = attribution_events.attr_sid` were wrong against the live schema; the join is via `user_id`, which both tables already share post-Phase-02.1 D-07 OTP linkage). Rows for anonymous consents recorded before any user registration have `user_id IS NULL` and stay unmatched — region remains NULL for those rows, which is acceptable for D-10's best-effort intent. Depends on `D-MaxMindLicenseKey` being live in prod env (already operational per Phase 02.1 deploy).

### WCAG 2.1 AA Compliance (BRAND-04)

- **D-11:** WCAG audit tool combo = **axe-core (component + integration) + Lighthouse (page-level) + manual keyboard pass**. axe-core integrated into a new Playwright spec set (`tests/e2e/a11y/*.spec.ts`) running against core flows; Lighthouse run in CI on the prod URL with the existing Lighthouse CI integration from Phase 02.1 D-* (verify presence).

- **D-12:** WCAG scope = **6 core flows**: `/` landing, `/register`, `/login` + OTP, `/member` dashboard + `/member/predlozhi` submit, `/predlozheniya` + `/problemi` catalog, `/agenda` long-form. NOT every page (admin views, legal pages, suspended pages get a single smoke pass each). Surface mode = audit-document + fix-critical-only in Phase 6:
  - **Phase 6 ships fixes for**: severity = critical + serious findings (e.g., missing labels, focus traps, ARIA mismatches, contrast ratios < 4.5:1 / 3:1 large, keyboard-unreachable interactive elements).
  - **Deferred to follow-on quick tasks**: moderate + minor (e.g., redundant ARIA, suboptimal heading order, near-miss contrast).
  - Audit document: `.planning/phases/06-gdpr-self-service-hardening/06-A11Y-AUDIT.md` with findings table + remediation status per item.

### Video Subtitles (BRAND-05)

- **D-13:** Bulgarian video subtitles = **conditional on coalition delivering videos**. Phase 6 ships the infrastructure (HTML5 `<track>` element pattern + `.vtt` file slot in Bunny Stream) and a placeholder demo VTT. Actual subtitle files = a new `D-CoalitionVideoSubtitles` external dependency. If no coalition videos exist yet (likely true based on current STATE.md — there are no D-* items referencing existing videos), the deliverable is "infrastructure ready, content owner identified, blocked on coalition." Not a Phase 6 ship blocker; flagged as deferred.

### Load Test (Hardening)

- **D-14:** 2x load test = **reuse Phase 02.1 D-15 k6 setup**. New scenario file at `.planning/phases/06-gdpr-self-service-hardening/06-LOAD-TEST.md` capturing: target RPS (planner derives from coalition mail-drop volume × scan rate × conversion window; user has authority on the number), pass/fail criteria (p95 < 500ms on landing + register, error rate < 1%, OTP send latency < 2s p95). Run against staging/preview Fly deploy, not prod (per Phase 02.1 D-15). Output: `.planning/phases/06-.../06-LOAD-TEST-RUN.md` committed with k6 JSON summary + operator sign-off.

### Cloudflare + Cache Hardening (D-CFPurgeOnDeploy carry-forward)

- **D-15:** Cloudflare cache purge on deploy = **new GitHub Actions step in `.github/workflows/deploy.yml`**. After fly deploy succeeds, call `POST /zones/{zone_id}/purge_cache` with `purge_everything: true`. Requires `CF_API_TOKEN` + `CF_ZONE_ID` repo secrets (operator-side task). Failure of the purge step = warning, not deploy failure (cache TTL is short, content self-heals).

- **D-16:** D-CookieVaryCacheRule = **conditional / defer-by-default**. Phase 6 does NOT proactively build the cookie-vary fallback. Operator-side A1 verification (Plan 02-07 §2.4) happens first. If verified-broken on prod, a follow-on quick task adds the vary-on-cookie cache strategy. Otherwise, this stays deferred.

### Claude's Discretion

- Exact JSON schema versioning of the export bundle (`format_version: 1` mentioned in D-02; planner can detail).
- Exact text of the typed-confirmation string — `ИЗТРИЙТЕ` recommended but planner may suggest a longer phrase if UX research warrants.
- Choice of axe-core integration mechanism (`@axe-core/playwright` vs `jest-axe` adapter for Vitest — picker discretion based on existing test infrastructure).
- Bunny.net signed URL TTL exact value (D-01 said 7 days; planner can argue 24h if security review prefers tighter).
- Internal column naming details on `cookie_consents` (D-09) — planner aligns with existing `consents.ts` conventions.

</decisions>

<specifics>
## Specific Ideas

- Existing `/suspended/page.tsx` route + UX is the canonical reference for the deletion-grace lockout state (D-05). Reuse the same component shell, swap the copy + add the cancel-deletion CTA.
- Existing Phase 4 `04-OPS-RUNBOOK.md §1` documents the editorial bootstrap pattern that the deletion-time email-suppression cascade should mirror (D-07 step 7).
- Phase 02.1 `.planning/legal/attribution-balancing-test.md` is the template for the Art. 17(3) balancing test text that D-06 needs the lawyer to sign off on.
- "Async via email link" matches GitHub's data-export UX — the user gets a "Your data is ready" email and clicks through. The interaction feels familiar to anyone who's exported a GitHub repo or downloaded their Google Takeout.
- Typed-text `ИЗТРИЙТЕ` matches GitHub's "type the repo name to confirm" + Stripe's "type DELETE" delete-account patterns. Cyrillic spelling chosen to match the Bulgarian-only UI tone (Phase 1 D-27 formal-respectful).

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project + roadmap
- `.planning/PROJECT.md` — GDPR section (constraint block), branding constraints (Sinya palette + logo)
- `.planning/ROADMAP.md` §"Phase 6: GDPR Self-Service + Hardening" (lines 308–326) — goal + 8 requirements + 5 success criteria
- `.planning/REQUIREMENTS.md` — GDPR-04..09 + BRAND-04, BRAND-05 acceptance criteria
- `.planning/STATE.md` — Deferred Items table (`D-CFPurgeOnDeploy`, `D-CookieVaryCacheRule`, `D-ConsentsRegionPopulation`, `D-LawyerTrack`, `D-MaxMindLicenseKey`)

### Prior-phase decisions (locked, do not re-litigate)
- `.planning/phases/01-foundation/01-CONTEXT.md` — D-14 (legitimate-interest legal basis), D-19 (BullMQ queue), D-21 (PII redaction in logs), D-27 (Bulgarian formal-respectful tone)
- `.planning/phases/01-foundation/01-PLAN-CHECK.md` §2 N-1 — anonymous cookie-consent persistence carry-forward target for D-09
- `.planning/phases/02-public-surface-pre-warmup/02-CONTEXT.md` — GDPR-01..03 (privacy policy, terms, cookie consent banner) already shipped
- `.planning/phases/02.1-attribution-source-dashboard/02.1-CONTEXT.md` — D-04..D-08 (attribution_events schema), D-15 (k6 load test), D-18 (legal balancing test), D-19 (no raw IP in Postgres)
- `.planning/phases/04-user-submissions-editorial-moderation/04-CONTEXT.md` — Phase 4 `moderation_log` REVOKE pattern (D-08 here mirrors it)
- `.planning/phases/05-notifications/05-CONTEXT.md` §D-08 — newsletter preferences stored as 4 rows in `consents` (kind LIKE 'newsletter_%'), NOT as a separate `newsletter_preferences` table; D-02 + D-07 in this CONTEXT.md reference this storage shape.

### Domain-specific specs
- `.planning/legal/attribution-balancing-test.md` — template for Art. 17(3) balancing test text the lawyer signs off on for D-06 anonymization rationale
- `src/db/schema/consents.ts` — existing `consents` table schema (D-10 backfills `region` column here; columns are `{id, user_id, kind, granted, version, granted_at, region}` — NO `attr_sid`, NO `email_at_consent`)
- `src/db/schema/auth.ts` — existing `users` table columns: `{id, name, email, emailVerified, image, full_name, sector, role, self_reported_source, self_reported_other, created_at, email_verified_at, preferred_channel, status, platform_role}` — NO `phone`, NO `oblast`. D-06 + D-07 step 1 must only NULL columns that exist.
- `src/db/schema/attribution.ts` — `attribution_events` exposes both `attr_sid` and `user_id`; D-10 backfill joins on `user_id`.
- `src/db/schema/submissions.ts` — `moderation_log` schema (D-08 pattern reference)
- `src/db/migrations/0003_phase04_submissions.sql` (specifically lines around REVOKE statement) — the canonical migration pattern for D-08 + the new `deletion_log` REVOKE
- `src/app/(frontend)/suspended/page.tsx` — UX pattern reference for D-05 grace-period locked-account page
- `src/app/(frontend)/member/layout.tsx` — Phase 4 D-A1 / D-A2 canonical pattern for status-based redirects from a Server Component layout (Plan 06-10 lockout for `status='pending_deletion'` mirrors this — the Edge-runtime `src/middleware.ts` CANNOT read auth() / db and must not be used for status redirects).
- `src/lib/email/worker.tsx` — Phase 5 worker; D-01 + D-04 + D-05 add new email kinds (`data-export-ready`, `account-deletion-pending`, `account-deletion-cancelled`) following the post-Quick-260514-k4x `render(element, { plainText: true })` discipline
- `src/lib/geoip.ts` — Phase 02.1 GeoIP module. Exports `lookupIp(ip): Promise<GeoLookupResult>` where the result has `{oblast, country}` (NOT `lookupRegion`). D-09 cookie-consent route + D-10 backfill consume it. Node runtime only — MUST NOT be imported from Edge middleware.

### Reference docs
- `.planning/phases/02.1-attribution-source-dashboard/02.1-LOAD-TEST.md` — Phase 02.1 k6 load test artifact (D-14 reuses this pattern)
- `CLAUDE.md` — GDPR Component Map section + stack constraints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BullMQ queue + worker** (`src/lib/email/queue.ts`, `src/lib/email/worker.tsx`): D-01 export job, D-07 deletion-cascade job, D-04/D-05 email kinds all live here.
- **Brevo client** (`src/lib/email/brevo.ts`): D-07 step 7 contact removal API; existing `sendBrevoEmail` for the 3 new email kinds.
- **Bunny.net integration** (per CLAUDE.md stack; verify existing client at `src/lib/storage/` or similar — researcher to confirm): signed-URL upload for D-01 export bundles.
- **GeoIP worker** (`src/lib/geoip.ts`): D-09 cookie consent route + D-10 consents.region backfill reuse this. Export name is `lookupIp` returning `{oblast, country}`.
- **`/suspended/page.tsx` pattern**: D-05 grace-period locked-state page reuses the shell + auth-redirect logic.
- **`moderation_log` REVOKE migration** (`0003_phase04_submissions.sql`): D-08 + new `deletion_log` table follow this exact pattern.

### Established Patterns
- **Drizzle transactional updates with append-only audit log** (`src/lib/submissions/admin-actions.ts:69-98`): D-07 deletion cascade follows the same `db.transaction(async (tx) => { ...UPDATEs + INSERT INTO audit_log })` shape.
- **Worker post-tx email enqueue** (same file, lines 100-106): fire-and-forget pattern with `addEmailJob` AFTER the transaction commits — applied to D-01, D-04, D-05, D-07 step 8 confirmation emails.
- **Boot-time DB-permission assertion** (`scripts/start-worker.ts` Phase 5 G4 pattern): D-08 deletion_log REVOKE check follows this — verify, fail-loud if regressed.
- **i18n discipline**: every UI string under `messages/bg.json`; D-04 typed-confirm Cyrillic, D-05 grace-period page Bulgarian copy, D-12 audit fixes preserve i18n contract (per Phase 4 D-25 + Phase 5 i18n linter).
- **Server-Component status redirect (Phase 4 D-A1 / D-A2)**: `src/app/(frontend)/member/layout.tsx` reads `auth()` + queries `users.status` from Drizzle and `redirect()`s when the status is non-active. This is the canonical pattern for the Phase 6 `pending_deletion` lockout (Plan 06-10) — the Edge-runtime `src/middleware.ts` cannot perform this check because it forbids `auth()` and `@/db` imports.

### Integration Points
- **`/member/preferences` page** (`src/app/(frontend)/member/preferences/page.tsx`): D-01 export request button + D-04 destructive delete button live here OR on a new `/member/data-rights` page.
- **Authenticated-area layouts** (`src/app/(frontend)/member/layout.tsx` + any other authenticated route-segment layouts): D-05 grace-period lockout check (block navigation if `users.status = 'pending_deletion'`). NOT in `src/middleware.ts` — the existing middleware is Edge-runtime-only and rejects DB/auth imports.
- **Phase 5 newsletter preferences in `consents`**: D-02 export bundle key #4 INCLUDES `kind LIKE 'newsletter_%'` rows; D-07 step 3 strips their `region` PII as part of the wider consents region NULL.
- **`.github/workflows/deploy.yml`**: D-15 Cloudflare purge step appended to the deploy job (after fly deploy + smoke).
- **Playwright config** (`playwright.config.ts`): D-11 + D-12 a11y specs use existing `cf-ray` bypass header pattern (Quick 260511-0nx).

</code_context>

<deferred>
## Deferred Ideas

- **Lawyer sign-off on Art. 17(3) anonymization rationale text** (D-06) — part of `D-LawyerTrack` external dependency. Phase 6 can ship anonymization code with placeholder rationale text in `.planning/legal/erasure-balancing-test.md` (draft); production-ready text needs counsel review. NOT a Phase 6 code-shipping blocker but a Phase 6 launch blocker for the deletion-active flag.
- **`D-CoalitionVideoSubtitles`** (D-13 follow-on) — coalition delivers actual video files + Bulgarian subtitle .vtt files. Phase 6 ships the infrastructure + placeholder; coalition resolves the content side.
- **D-CookieVaryCacheRule deployment** (D-16) — only ships if A1 (Cloudflare free-tier cookie-presence Cache Rules) verification falsifies on prod. Operator runs verification first; conditional follow-on quick task implements vary-on-cookie cache strategy if needed.
- **Phase 3 plans (10 plans, no summaries)** — paused on D-LawyerTrack Art. 9 opinion. Already deferred to `Phase 999.3` in ROADMAP.md backlog 2026-05-15.
- **Phase 4 super_editor allow-list + i18n string-lock gaps** — deferred to `Phase 999.4` 2026-05-15. Phase 6 does NOT touch these.
- **Phase 02.1 `dashboard-role-gate.test.ts` ENOENT** — deferred to `Phase 999.21`. Phase 6 does NOT touch.
- **Format-flexible export (CSV / ZIP)** (D-03 carve-out) — JSON-only in v1. Add `?format=csv` later if regulator or user feedback warrants.

### Reviewed Todos (not folded)
- `2026-05-01-cloudflare-waf-origin-bypass-rule.md` — ops-track hardening; not Phase 6 GDPR scope.
- `2026-05-01-github-prod-env-protection.md` — ops-track; not Phase 6.
- `2026-05-01-payload-loadenv-patch.md` — Payload tsx ESM workaround; not Phase 6.
- `2026-05-04-payload-tsx-esm-incompat.md` — same as above.
- `2026-05-10-agenda-mobile-toc-sticky-fab.md` — accessibility-adjacent (mobile UX polish), but specific to /agenda; absorb into the D-12 audit if found in scope, otherwise leave as standalone polish todo.
- `2026-05-14-editor-nav-links-attribution-moderation.md` — editor-UX polish (`D-EditorNavLinks`); not Phase 6.

</deferred>

---

*Phase: 06-gdpr-self-service-hardening*
*Context gathered: 2026-05-15*
*Schema-shape revision: 2026-05-15 (D-02 bundle item #6, D-06 PII list, D-07 step 1 + 3 + 5 + 5.5, D-10 backfill JOIN — corrected against live schema)*
