# Phase 6: GDPR Self-Service + Hardening - Research

**Researched:** 2026-05-15
**Domain:** GDPR data-rights self-service (export + deletion), audit-table hardening, WCAG 2.1 AA compliance, capacity validation
**Confidence:** HIGH for stack reuse; MEDIUM for Bunny.net signed-URL (no prior client in repo); MEDIUM-LOW for Art.17(3) legal text (lawyer-final still gated on `D-LawyerTrack`)

## Summary

Phase 6 is dominantly a **reuse phase**, not a greenfield phase. Every required capability has a canonical pattern already shipped on prod: the deletion cascade follows `src/lib/submissions/admin-actions.ts:69-115` (Drizzle tx + append-only audit-log INSERT + post-tx `addEmailJob` fire-and-forget); the new email kinds (`data-export-ready`, `account-deletion-pending`, `account-deletion-cancelled`) slot into `src/lib/email/worker.tsx` exactly as Phase 4's `submission-status-approved` did; the new `deletion_log` REVOKE migration mirrors `0003_phase04_submissions.sql:84-92` verbatim with a different table name; the grace-period locked-account page reuses `src/app/(frontend)/suspended/page.tsx` as a shell; and the k6 load test extends `02.1/k6/attribution-load.js` with three new scenarios.

The **only genuinely new technical territory** is the Bunny.net signed-URL flow for export-bundle delivery (no Bunny client exists in the repo yet — `VideoPlayer.tsx` is a dumb `<video src>` stub that accepts a Bunny Stream URL but has no signing code). Three concerns matter: (1) Token Authentication V2 (SHA-256, not the deprecated MD5 Basic auth) is the right tool; (2) the security key MUST be a Pull Zone setting + an env secret, never client-visible; (3) revoking signed URLs mid-grace requires per-user salting (incorporate user_id into the token's optional parameters) so that account deletion can invalidate outstanding export links by rotating a single per-user secret column.

The **biggest planning risk** is treating WCAG audit work as estimable. shadcn/ui + Tailwind v4 has documented systemic AA failures (focus-ring contrast `ring-1 ring-ring/50`, muted-foreground placeholder contrast, missing ARIA on Combobox) that will surface on every flow at once — D-12's "fix critical + serious, defer moderate" boundary is the right shape but the planner must budget for ~20-40 findings, not 5.

**Primary recommendation:** Treat Phase 6 as 4 sequential waves: (W1) DDL — new `deletion_log`, new `cookie_consents`, new `data_export_jobs` tracking table, REVOKEs, `consents.region` backfill; (W2) BullMQ infrastructure — 4 new job kinds (`data-export`, `account-deletion-cascade`, plus the 3 email kinds); (W3) UX surfaces — `/member/data-rights` page, deletion modal, grace-period lockout, cancel-deletion OTP path; (W4) hardening — axe-core spec suite + Lighthouse CI extension + a11y audit doc + k6 extension + Cloudflare purge step in `deploy.yml`. Lock the W1 DDL on day one — every wave depends on it and `payload migrate` is still disabled (manual Neon SQL convention per `project_payload_schema_constraint.md`).

## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: Export delivery** = async via BullMQ → Bunny.net signed URL → transactional email. User clicks "Заявка за извличане на данни" in `/member/preferences` (or new `/member/data-rights` page) → Server Action enqueues a `data-export` job → worker builds JSON bundle, uploads to Bunny.net with a 7-day signed URL, fires email kind `data-export-ready`. Reuses Phase 1 BullMQ + Phase 5 React Email + Bunny.net stack.

**D-02: Export bundle scope** = all PII-bearing rows linked to the user, in a single JSON file:
1. `users` profile (email, full_name, phone, sector, role, status, registration_source)
2. `votes` (empty until Phase 3)
3. `submissions` (proposal / problem / DSA)
4. `consents` (audit trail + region after D-09 backfill)
5. `attribution_events` (post-linkage rows)
6. `newsletter_preferences`
7. `moderation_log` actions where the user is `actor_user_id` (editorial users only)

Each table = a top-level key; emit `null` for empty arrays; include a `metadata` block (`exported_at`, `format_version: 1`, `user_id_hash`).

**D-03: Export format** = single JSON file (UTF-8, indent 2). Not CSV-per-table. Not ZIP. `?format=csv` deferred.

**D-04: Deletion initiation UX** = typed-text confirmation `ИЗТРИЙТЕ` + immediate `account-deletion-pending` email. Cyrillic, case-sensitive, gates the destructive button.

**D-05: Grace period** = 30 days, account locked during grace. Login during grace → "Acccount scheduled for deletion on YYYY-MM-DD" page with OTP-protected "Отказване на изтриването" CTA. Mirrors `/suspended/page.tsx` shell.

**D-06: Content fate on deletion** = anonymize-and-preserve. `users` row becomes tombstone (email/full_name/phone/registration_source.other/oblast = NULL, status = 'deleted', `email_hash` retained). Linked submissions/votes/problem-reports keep `submitter_id = <tombstone>` so aggregates remain intact. Art.17(3) carve-out rationale needs lawyer sign-off (`D-LawyerTrack`). `deletion_log` records `target_user_id_hash` (SHA-256 of original user.id) + `deleted_at` + `deletion_reason='user_request'` — NO PII.

**D-07: Deletion cascade order** (worker job, day 30, after final cancellation check):
1. UPDATE `users` SET email=NULL, full_name=NULL, phone=NULL, oblast=NULL, status='deleted'
2. UPDATE `attribution_events` SET user_id=NULL (unlink, preserve aggregates)
3. UPDATE `consents` SET region=NULL, email_at_consent=NULL (strip PII; retain user_id_hash if present)
4. DELETE FROM `sessions` WHERE userId=<id>
5. DELETE FROM `newsletter_preferences` WHERE user_id=<id>
6. Cancel any in-flight BullMQ jobs targeting this user
7. Brevo: `DELETE /contacts/{email}` + add `email_hash` to local suppression list
8. INSERT INTO `deletion_log` (target_user_id_hash, deleted_at, deletion_reason='user_request')
9. `submissions` / `votes` / `problem_reports` rows NOT touched (anonymization via tombstone).

Steps 1-5 + 8 wrapped in Drizzle tx; Brevo (step 7) outside tx, idempotent + retried.

**D-08: Audit-table INSERT-only** = REVOKE UPDATE, DELETE at DB level + boot-time assertion test. New `deletion_log` gets the same `REVOKE UPDATE, DELETE` migration shape as `moderation_log` from `0003_phase04_submissions.sql:84-92`. Unit test asserts `has_table_privilege(current_user, 'deletion_log', 'UPDATE')` returns false.

**D-09: Anonymous cookie-consent persistence** = new `cookie_consents` table `(anon_id UUID, choices JSONB, consent_at, withdrawn_at NULL, ip_hash TEXT)`. CookieYes posts events to a new Server Action. Linked to `attr_sid` when present; UPDATEd with `user_id` post-verifyOtp (mirrors Phase 02.1 D-07).

**D-10: consents.region backfill** = Server Action + one-time Drizzle migration writing GeoIP-resolved oblast into `consents.region`. New consents always populate region at INSERT via existing Phase 02.1 GeoIP worker. Backfill: `consents JOIN attribution_events ON consents.attr_sid = attribution_events.attr_sid` copying `first_oblast` → `consents.region`.

**D-11: WCAG audit tooling** = axe-core (component + integration) + Lighthouse (page) + manual keyboard pass. axe-core via new `tests/e2e/a11y/*.spec.ts`.

**D-12: WCAG scope** = 6 core flows: `/`, `/register`, `/login` + OTP, `/member` dashboard + `/member/predlozhi`, `/predlozheniya` + `/problemi`, `/agenda`. Fix critical + serious only; defer moderate + minor. Audit document: `.planning/phases/06-.../06-A11Y-AUDIT.md`.

**D-13: Bulgarian video subtitles** = conditional on coalition delivering videos. Ship HTML5 `<track>` infrastructure + placeholder demo VTT. Actual subtitles = new `D-CoalitionVideoSubtitles` external dependency.

**D-14: 2x load test** = reuse Phase 02.1 D-15 k6 setup. New scenario file at `.planning/phases/06-.../06-LOAD-TEST.md`. Targets: p95 < 500ms on landing + register, error rate < 1%, OTP send latency < 2s p95. Staging deploy, not prod.

**D-15: Cloudflare cache purge on deploy** = new GitHub Actions step in `.github/workflows/deploy.yml` (after fly deploy succeeds). `POST /zones/{zone_id}/purge_cache` with `purge_everything: true`. Requires `CF_API_TOKEN` + `CF_ZONE_ID` repo secrets. Purge failure = warning, not deploy failure.

**D-16: D-CookieVaryCacheRule** = conditional / defer-by-default. Phase 6 does NOT proactively build the cookie-vary fallback. Operator A1 verification runs first.

### Claude's Discretion

- Exact JSON schema versioning of the export bundle (`format_version: 1` recommended in D-02).
- Exact text of the typed-confirmation string — `ИЗТРИЙТЕ` recommended.
- Choice of axe-core integration mechanism (`@axe-core/playwright` vs `jest-axe` adapter for Vitest).
- Bunny.net signed URL TTL exact value (D-01 said 7 days; 24h acceptable if security review prefers tighter).
- Internal column naming on `cookie_consents` (D-09).

### Deferred Ideas (OUT OF SCOPE)

- Lawyer sign-off on Art.17(3) anonymization rationale text — part of `D-LawyerTrack`. Phase 6 ships placeholder rationale; production-ready text needs counsel review. NOT a code-shipping blocker; IS a launch blocker for the deletion-active flag.
- `D-CoalitionVideoSubtitles` — coalition delivers actual video + .vtt files. Phase 6 ships infrastructure only.
- `D-CookieVaryCacheRule` deployment — conditional on prod A1 verification falsifying.
- Phase 3 plans (paused on `D-LawyerTrack`).
- Phase 4 super_editor allow-list + i18n string-lock gaps.
- Phase 02.1 `dashboard-role-gate.test.ts` ENOENT.
- Format-flexible export (CSV/ZIP) — JSON-only in v1.
- Editor admin nav (separate `D-EditorNavLinks` todo).
- CI test suite rot (theme.test.ts 13 failures).

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GDPR-04 | Member can export all data (JSON or CSV) — right to portability | D-01 async export job; D-02 bundle scope; D-03 JSON-only; Focus Area 1 (Bunny signed-URL) |
| GDPR-05 | Member can delete account from settings; 30-day soft-delete + hard-wipe | D-04 typed-text confirm; D-05 grace lockout; D-07 cascade order |
| GDPR-06 | Deletion cascade reaches ESP + backups + logs | D-07 step 7 Brevo `DELETE /contacts/{email}` + local suppression; tombstone-not-purge for backups |
| GDPR-07 | Audit tables INSERT-only at DB permission level | D-08 REVOKE pattern from Phase 4; boot-time assertion in `start-worker.ts` |
| GDPR-08 | deletion_log stores hashed user_id only (no PII) | D-06 `target_user_id_hash = SHA-256(user.id)`; no original user_id in row |
| GDPR-09 | Attribution data has no raw IP (verified, already enforced) | Already enforced by Phase 02.1 D-19; Phase 6 adds boot-time grep-assertion regression-lock |
| BRAND-04 | WCAG 2.1 AA on contrast, keyboard nav, alt text, captions | D-11/D-12 axe-core + Lighthouse; Focus Area 2 |
| BRAND-05 | Bulgarian video subtitles | D-13 `<track srcLang="bg">` infrastructure + placeholder VTT |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Data export request UX (button + state) | Frontend Server (RSC + Server Action) | — | Same as Phase 5 preferences; reads session, enqueues job |
| Export bundle assembly (JSON build, multi-table read) | Worker (BullMQ) | Database | Long-running, sub-1s/table queries; OOM-safe outside web request |
| Export storage + delivery | CDN / Storage (Bunny.net) | Worker (uploads) | Worker writes blob; Bunny serves it via signed CDN URL |
| Export-ready notification | API/Backend (Brevo) | Worker (sendBrevoEmail) | Existing pattern from Phase 5 NOTIF-* |
| Deletion request UX (modal + typed confirm) | Frontend Server | — | Server Action with zod validation, transactional DB write |
| Grace-period lockout (login interception) | Frontend Server (middleware/layout guard) | Database (users.status check) | Mirrors `member/layout.tsx` suspended check |
| Cancel-deletion OTP flow | Frontend Server (Server Action) + API (Brevo OTP send) | Database | Reuses Phase 1 OTP path |
| Deletion cascade execution (day 30) | Worker (BullMQ scheduled job) | Database (tx) + API (Brevo DELETE) | Long-running, transactional, idempotent |
| `deletion_log` writes | Database (INSERT-only at permission level) | Worker | REVOKE UPDATE, DELETE = DB-tier enforcement |
| Cookie consent persistence (D-09) | API/Backend (CookieYes webhook → Server Action) | Database | New `cookie_consents` table |
| consents.region backfill (D-10) | Database (one-time Drizzle migration) | Worker (ongoing INSERTs populate region) | Migration runs once; new INSERTs use existing GeoIP worker |
| axe-core a11y testing | CI/Test (Playwright) | — | Spec suite, no runtime code |
| Lighthouse CI | CI (GitHub Actions) | — | Existing `.lighthouserc.json` extended |
| k6 load test | CI/External (Hetzner runner) | — | Reuses Phase 02.1 pattern |
| Cloudflare purge on deploy | CI (GitHub Actions) | CDN (Cloudflare) | New step in `deploy.yml` post-flyctl-deploy |

## Standard Stack

### Core (all locked, version-pinned in `package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.3.9 | App Router, Server Actions, Server Components | `[VERIFIED: package.json]` |
| Payload CMS | 3.84.1 | Admin shell (no member-facing surface in Phase 6) | `[VERIFIED: package.json]` |
| Drizzle ORM | 0.45.2 | TypeScript SQL, transactions, INSERT-only enforcement | `[VERIFIED: package.json]` |
| Auth.js | 5.0.0-beta.31 | Session reads in Server Actions, OTP cancel-deletion path | `[VERIFIED: package.json]` |
| BullMQ | 5.76.4 | Async export job + day-30 deletion cascade job | `[VERIFIED: package.json]` |
| ioredis | 5.10.1 | Upstash Redis transport for BullMQ | `[VERIFIED: package.json]` |
| @upstash/redis | 1.37.0 | Rate limiting on export request + deletion request | `[VERIFIED: package.json]` |
| @upstash/ratelimit | 2.0.8 | 1 export/24h per user; 1 delete-request/lifetime | `[VERIFIED: package.json]` |
| React Email | @react-email/render 1.1.0 + @react-email/components 0.1.0 | 3 new email templates | `[VERIFIED: package.json]` |
| zod | 3.24.2 | Server Action input validation (typed-text confirm, cancel OTP) | `[VERIFIED: package.json]` |
| zod-i18n-map | 2.27.0 | Bulgarian error messages | `[VERIFIED: package.json]` |
| next-intl | 4.11.0 | Bulgarian copy for new pages + email templates | `[VERIFIED: package.json]` |
| shadcn/ui | latest | `AlertDialog` for deletion confirm modal, `Card` for `/member/data-rights` | `[VERIFIED: existing components in src/components/ui/]` |
| Tailwind CSS | 4.2.4 | Styling | `[VERIFIED: package.json]` |
| Pino | 10.3.1 | Structured logs for deletion + export audit | `[VERIFIED: package.json]` |
| Sentry | 10.51.0 | Error tracking on new flows | `[VERIFIED: package.json]` |

### New (introduced by Phase 6)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @axe-core/playwright | 4.11.3 (latest) | WCAG 2.1 AA scanning in Playwright specs | `[VERIFIED: npm view @axe-core/playwright version → 4.11.3]` |
| axe-core | 4.11.4 (latest, peerDep auto-resolved) | Engine for `@axe-core/playwright` | `[VERIFIED: npm view axe-core version → 4.11.4]` |

**No Bunny.net SDK in npm.** Bunny does not publish an official Node SDK for signed URLs (verified by absence from current `package.json` and from the Bunny official docs). The signing is a single `crypto.createHash('sha256')` call + base64url substitution. Inline in `src/lib/storage/bunny.ts` (new file, ~30 lines). No new dependency. `[VERIFIED: Bunny docs — token-auth algorithm is hash-based, no SDK required; community npm package `bunnysign` is C# / read-only].

### Installation

```bash
pnpm add -D @axe-core/playwright
```

No production dependencies added. axe-core resolves transitively via the playwright peer.

### Version Verification

Run before pinning the dev-dep:
```bash
npm view @axe-core/playwright version       # current: 4.11.3
npm view @axe-core/playwright peerDependencies   # check axe-core constraint
```

## Project Constraints (from CLAUDE.md)

- **Bulgarian UI everywhere** — every user-facing string in `messages/bg.json`; emails use Bulgarian formal-respectful tone per Phase 1 D-27.
- **No raw IP in DB** — already enforced by Phase 02.1 D-19; Phase 6 adds boot-time grep-assertion regression-lock for GDPR-09.
- **EU data residency** — Bunny.net is Slovenian/EU; signed-URL flow never leaves EU. Brevo EU-region account already in use. No new processors introduced.
- **GDPR Component Map** is the canonical inventory; Phase 6 closes "Right to erasure (account deletion)" and "Right to data export" lines.
- **Manual DDL convention** — every new collection/global/field/table requires manual DDL via Neon SQL editor (`payload migrate` still blocked by tsx ESM incompat). Phase 6 will produce `0004_phase06_gdpr.sql` for operator-applied DDL.
- **No editor admin nav touch** — `D-EditorNavLinks` is a separate todo, not Phase 6 scope.

## System Architecture Diagram

```
┌─────────────────────┐
│ /member/data-rights │  RSC reads session, renders 2 cards: Export + Delete
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
[Export click]  [Delete click → AlertDialog typed-text ИЗТРИЙТЕ]
     │           │
     ▼           ▼
requestExport()  requestDeletion()
Server Action    Server Action
     │           │ (Drizzle tx:
     │           │   users.status='pending_deletion',
     │           │   users.deletion_requested_at=now())
     │           │
     ▼           ▼
addEmailJob({   addEmailJob({kind:'account-deletion-pending'})
  kind:         + addEmailJob({
  'data-export',  kind:'account-deletion-cascade',
  userId         delayMs: 30*86400_000,
})                userId
                })
     │           │
     ▼           ▼
┌─────────────────────────────────┐
│ BullMQ queue: email-queue       │  Upstash Redis EU
└──────────────────┬──────────────┘
                   │
                   ▼
       ┌───────────────────────┐
       │ start-worker.ts       │  Fly.io worker process group
       │ (existing entrypoint) │
       └─────────┬─────────────┘
                 │
       ┌─────────┴────────────────────────────┐
       │                                      │
       ▼                                      ▼
[data-export handler]              [account-deletion-cascade handler]
  1. Read 7 tables for userId        Pre-cancel check:
  2. Build JSON bundle in memory       SELECT status FROM users
  3. Stream-upload to Bunny.net        If status != 'pending_deletion' → abort
     Storage (Storage Zone HTTP API)   Drizzle tx:
  4. Generate signed URL                1. users SET email=NULL, ..., status='deleted'
     (token + expires=now+7d)           2. attribution_events SET user_id=NULL
  5. addEmailJob({                      3. consents SET region=NULL, email_at_consent=NULL
       kind:'data-export-ready',        4. DELETE sessions
       userId,                          5. DELETE newsletter_preferences
       exportUrl                        8. INSERT deletion_log(target_user_id_hash)
     })                                Post-tx:
                                        6. BullMQ removeJobs for userId
                                        7. Brevo DELETE /contacts/{email} (retry-safe)
                                                  │
                                                  ▼
                                       ┌──────────────────┐
                                       │ Brevo API (EU)   │
                                       └──────────────────┘

[Login during grace] ──► member/layout.tsx guard:
                          if (users.status === 'pending_deletion'):
                            redirect('/account-pending-deletion')

[/account-pending-deletion] ──► OTP-protected "Отказване" CTA
                                  ▼
                              cancelDeletion() Server Action
                                  ▼
                              UPDATE users SET status='active',
                                     deletion_requested_at=NULL
                                  ▼
                              addEmailJob({kind:'account-deletion-cancelled'})
                                  ▼
                              BullMQ removeJobs(kind='account-deletion-cascade', userId)

[Cookie consent banner accept] ──► CookieYes posts to /api/cookie-consent
                                     ▼
                                   INSERT cookie_consents (anon_id, choices, ip_hash)
                                     ▼
                                   (later, post-register) UPDATE cookie_consents SET user_id

[GitHub Actions deploy.yml]
  verify-eu-dsn → migrate → deploy → smoke
                                 ▼
                            NEW: cloudflare-purge step
                                 ▼
                            POST cf/zones/{id}/purge_cache
```

## Recommended Project Structure

```
src/
├── app/(frontend)/
│   ├── member/
│   │   ├── data-rights/page.tsx        # NEW — D-01 + D-04 UX
│   │   └── preferences/page.tsx        # EXISTING — D-01 may link from here
│   └── account-pending-deletion/
│       └── page.tsx                    # NEW — D-05 grace-period lockout
├── app/api/
│   └── cookie-consent/route.ts         # NEW — D-09 CookieYes webhook
├── components/
│   ├── data-rights/
│   │   ├── ExportRequestForm.tsx       # NEW — D-01 button + state
│   │   ├── DeletionConfirmDialog.tsx   # NEW — D-04 typed-text modal
│   │   └── CancelDeletionForm.tsx      # NEW — D-05 OTP cancel
│   └── ui/
│       └── alert-dialog.tsx            # shadcn — install if absent
├── db/
│   ├── schema/
│   │   ├── deletion.ts                 # NEW — deletion_log + data_export_jobs + cookie_consents
│   │   └── auth.ts                     # EXISTING — add users.deletion_requested_at, users.email_hash
│   └── migrations/
│       └── 0004_phase06_gdpr.sql       # NEW — manual DDL for operator Neon apply
├── lib/
│   ├── data-rights/
│   │   ├── actions.ts                  # NEW — requestExport, requestDeletion, cancelDeletion Server Actions
│   │   ├── export-builder.ts           # NEW — JSON bundle assembly
│   │   ├── cascade.ts                  # NEW — D-07 9-step deletion cascade
│   │   └── zod.ts                      # NEW — input schemas
│   ├── storage/
│   │   └── bunny.ts                    # NEW — signed-URL generator (~30 lines)
│   └── email/
│       ├── worker.tsx                  # EXISTING — add 3 new job-kind handlers
│       ├── queue.ts                    # EXISTING — extend EmailJobKind union with 5 new kinds
│       └── templates/
│           ├── DataExportReadyEmail.tsx       # NEW
│           ├── AccountDeletionPendingEmail.tsx # NEW
│           └── AccountDeletionCancelledEmail.tsx # NEW
├── middleware.ts                       # EXISTING — no Phase 6 changes (Edge-only)
└── scripts/
    └── start-worker.ts                 # EXISTING — add deletion_log REVOKE boot-assertion

tests/
├── e2e/
│   ├── a11y/                           # NEW directory
│   │   ├── landing.a11y.spec.ts
│   │   ├── register.a11y.spec.ts
│   │   ├── login-otp.a11y.spec.ts
│   │   ├── member-dashboard.a11y.spec.ts
│   │   ├── proposals-problems.a11y.spec.ts
│   │   ├── agenda.a11y.spec.ts
│   │   └── data-rights.a11y.spec.ts    # bonus — new surface should be AA-clean from day 1
│   └── data-rights/
│       ├── export-request.spec.ts
│       ├── deletion-typed-text.spec.ts
│       └── grace-period-lockout.spec.ts
└── unit/
    ├── deletion-log-schema.test.ts     # source-grep + privilege assertion
    ├── deletion-cascade.test.ts        # 9-step order verification
    ├── export-bundle-shape.test.ts     # snapshot test of JSON keys
    └── bunny-signed-url.test.ts        # known-good token vector

.planning/
├── phases/06-gdpr-self-service-hardening/
│   ├── 06-A11Y-AUDIT.md                # NEW — D-12 findings + remediation
│   ├── 06-LOAD-TEST.md                 # NEW — k6 reuse pattern + thresholds
│   ├── 06-LOAD-TEST-RUN.md             # NEW (operator-signed after run)
│   └── k6/
│       └── phase6-extension.js         # NEW — extends 02.1 with 3 new scenarios
└── legal/
    └── erasure-balancing-test.md       # NEW — Art.17(3) draft (mirrors attribution-balancing-test.md)

.github/workflows/
├── deploy.yml                          # MODIFY — add Cloudflare purge step (D-15)
└── lighthouse.yml                      # MODIFY — extend URL list to 6 core flows (D-11)
```

---

## Focus Area 1: Bunny.net Signed-URL TTL Pattern (D-01)

**State of the art:** Bunny.net has two URL-token-auth flavours. The deprecated **Basic** (MD5) is documented but flagged for removal. The current standard is **Token Authentication V2** (SHA-256, supports `token_path`, `token_countries`, `token_ip`). For Phase 6 use V2. `[CITED: docs.bunny.net/docs/cdn-token-authentication]`

**No existing Bunny client in repo.** `src/components/landing/VideoPlayer.tsx` is the only Bunny reference — and it's a 30-line dumb `<video src={...}>` stub. No upload/signing code exists. Phase 6 writes the first one. `[VERIFIED: grep across src/]`

### The Two Bunny Services Phase 6 Needs

| Service | Used For | API |
|---------|----------|-----|
| **Bunny Storage** (HTTP REST) | Upload the export JSON bundle | `PUT https://storage.bunnycdn.com/{storage_zone}/{path}` with `AccessKey` header |
| **Bunny CDN Pull Zone** (configured to pull from the Storage Zone above, with **Token Authentication V2** enabled in Security settings) | Serve the export bundle via signed URL | `https://{pullzone}.b-cdn.net/{path}?token=...&expires=...` |

The Pull Zone's **URL Token Authentication Key** (Pull Zone → Security → Token Authentication) is the shared secret. Store as Fly secret `BUNNY_TOKEN_AUTH_KEY`. The Storage Zone's **AccessKey** is a separate credential (Storage Zone → FTP & API Access). Store as Fly secret `BUNNY_STORAGE_ACCESS_KEY`.

### Canonical Signing Algorithm (V2, SHA-256)

```ts
// src/lib/storage/bunny.ts — full file, ~30 lines
import { createHash } from 'node:crypto';

/**
 * Generates a Bunny.net Token Authentication V2 signed URL.
 *
 * Phase 6 D-01: 7-day TTL on data-export bundles.
 *
 * Algorithm (per Bunny docs):
 *   hash_input = security_key + signed_url_path + expires + (optional token_path) + (optional remote_ip) + (optional sorted params)
 *   token = Base64URL( SHA256_RAW(hash_input) )
 *     where Base64URL = standard Base64 with '+' → '-', '/' → '_', and '=' stripped.
 *
 * URL form: https://{pullzone}.b-cdn.net{path}?token={token}&expires={unix}
 */
export function signBunnyUrl(opts: {
  pullZoneHostname: string;   // e.g. 'cdn.chastnik.eu' or 'smbsite-exports.b-cdn.net'
  path: string;               // e.g. '/exports/2026-05/abcd1234.json' (leading slash, no query)
  ttlSeconds: number;         // 7 * 86_400 for D-01
  securityKey?: string;       // process.env.BUNNY_TOKEN_AUTH_KEY default
}): string {
  const securityKey = opts.securityKey ?? process.env.BUNNY_TOKEN_AUTH_KEY;
  if (!securityKey) throw new Error('BUNNY_TOKEN_AUTH_KEY not configured');

  const expires = Math.floor(Date.now() / 1000) + opts.ttlSeconds;
  const hashInput = securityKey + opts.path + String(expires);

  const tokenB64 = createHash('sha256').update(hashInput).digest('base64');
  const tokenUrl = tokenB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `https://${opts.pullZoneHostname}${opts.path}?token=${tokenUrl}&expires=${expires}`;
}
```

`[CITED: docs.bunny.net/docs/cdn-token-authentication — algorithm structure SHA256_RAW(security_key + signed_url + expires + ...)]`
`[ASSUMED: exact base64url substitution chars]` — Bunny's docs describe "Base64 with URL-safe replacements"; the `+→-` `/→_` `=→strip` convention is the universal RFC 4648 base64url variant. Verify with a known-good vector from the Pull Zone dashboard's "Test URL" feature on first deploy.

### Upload to Bunny Storage (worker side)

```ts
async function uploadExportBundle(
  storageZone: string,
  path: string,
  body: Buffer,
): Promise<void> {
  const accessKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
  if (!accessKey) throw new Error('BUNNY_STORAGE_ACCESS_KEY not configured');

  // Storage region matters: default region is Falkenstein DE (EU).
  // Confirm in Storage Zone settings — primary region MUST be 'de'.
  const res = await fetch(`https://storage.bunnycdn.com/${storageZone}${path}`, {
    method: 'PUT',
    headers: {
      AccessKey: accessKey,
      'content-type': 'application/json',
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Bunny storage upload failed: ${res.status} ${await res.text()}`);
  }
}
```

`[CITED: docs.bunny.net/reference/put_-storagezonename-path-filename]`

### Worker Handler Sketch (data-export job)

```tsx
// src/lib/email/worker.tsx — new case in the processor switch
case 'data-export': {
  const userId = job.data.userId!;
  const exportData = await buildExportBundle(userId);  // 7-table read, builds JSON object
  const bundle = Buffer.from(JSON.stringify(exportData, null, 2), 'utf8');

  // Path: scoped by user_id_hash so listing the Storage Zone doesn't leak user UUIDs
  const userIdHash = createHash('sha256').update(userId).digest('hex').slice(0, 16);
  const filename = `${Date.now()}-${randomUUID()}.json`;
  const path = `/exports/${userIdHash}/${filename}`;

  await uploadExportBundle(process.env.BUNNY_STORAGE_ZONE!, path, bundle);

  const signedUrl = signBunnyUrl({
    pullZoneHostname: process.env.BUNNY_EXPORT_HOSTNAME!,
    path,
    ttlSeconds: 7 * 86_400,
  });

  // Track the export job so deletion-cascade can find + invalidate stale URLs
  await db.insert(data_export_jobs).values({
    user_id: userId,
    bunny_path: path,
    expires_at: new Date((Math.floor(Date.now() / 1000) + 7 * 86_400) * 1000),
  });

  // Existing email-send pattern
  return sendBrevoEmail({
    to: { email: row.email, name: row.full_name },
    subject: tEmail('subject'),
    htmlContent: await render(<DataExportReadyEmail t={tEmail} fullName={row.full_name} exportUrl={signedUrl} expiresAt={expiresAt} />),
    textContent: await render(<DataExportReadyEmail t={tEmail} ... />, { plainText: true }),
    from: { email: process.env.EMAIL_FROM_TRANSACTIONAL!, name: loadT('email.from')('name') },
  });
}
```

### TTL Choice — 7 Days vs Tighter

D-01 specifies 7 days. The discretion line lets the planner argue tighter. Trade-off:

| TTL | UX | Security | Storage cost |
|-----|-----|----------|--------------|
| 7 days | Generous — covers a member who's on holiday | Window for credential leak / shoulder-surfing | Bundle in storage for 7d |
| 24 hours | Tight — must download same day | Minimal exposure window | Bundle in storage for 1d |
| 1 hour | Brittle — email transport delay can blow the window | Tightest | Trivial |

**Recommendation:** Keep D-01's 7 days. Add a "Re-request export" button that's enabled after the previous expires_at. The user pays the latency tax to refresh, not the planner.

### Revocation on Deletion-Intervenes (D-07 step 6)

When the cascade fires, in-flight or recent export bundles must become inaccessible. Three options:

| Option | Mechanism | Tradeoff |
|--------|-----------|----------|
| **Delete blob from Storage** | `DELETE /{storage_zone}/{path}` for every row in `data_export_jobs WHERE user_id=<id>` | Clean. Requires deletion-cascade step to know all paths (hence `data_export_jobs` table). |
| Rotate Pull Zone key | Invalidates ALL signed URLs globally | Nuclear; breaks every other user's outstanding link. Don't. |
| Per-user salting | Use Bunny's `token_path` parameter — sign with `path=/exports/{user_id_hash}/` so a per-user secret rotation invalidates just that user | Adds complexity; not Phase 6 scope |

**Recommended cascade step 6.5** (insert between step 6 in-flight cancel and step 7 Brevo): `DELETE FROM data_export_jobs WHERE user_id=<id> RETURNING bunny_path`, then loop `DELETE https://storage.bunnycdn.com/{storage_zone}{path}` for each (idempotent, ignore 404). `[CITED: docs.bunny.net/reference/delete_-storagezonename-path-filename]`

### New Env Vars (operator-side, Fly secrets)

| Var | Purpose | Where |
|-----|---------|-------|
| `BUNNY_STORAGE_ZONE` | Storage Zone name (e.g. `smbsite-exports`) | Storage Zone overview |
| `BUNNY_STORAGE_ACCESS_KEY` | API write key | Storage Zone → FTP & API Access |
| `BUNNY_EXPORT_HOSTNAME` | Pull Zone hostname (e.g. `cdn-exports.chastnik.eu`) | Pull Zone overview |
| `BUNNY_TOKEN_AUTH_KEY` | Pull Zone token-auth secret | Pull Zone → Security → Token Authentication |

Add a `D-BunnyExportZoneProvisioning` deferred item if these aren't set up at the start of execution. The operator can run with a sandbox Storage Zone for development and swap to a prod Zone before the launch.

### Common Pitfalls (Focus Area 1)

| Pitfall | Cause | Fix |
|---------|-------|-----|
| `403 Forbidden` on signed URL | Pull Zone has Token Authentication V1 (MD5) not V2 enabled, or path has query string already baked in | Verify Pull Zone Security → Token Authentication V2 → enabled; only sign the path-without-query |
| `400 Bad Request` on Storage PUT | Bunny rejects paths starting without `/` | Always leading-slash the path |
| Storage region is not EU | Phase 1 D-14 + GDPR-09 require EU-only data path | Storage Zone settings → primary region MUST be `de` (Falkenstein); disable US replicas |
| Signed URL works but file is empty | Worker streamed before the buffer was complete; or used `body: stream` against fetch's broken streaming | Use `Buffer.from(JSON.stringify(...))` — small bundles fit in memory; 7-table JSON for a single user is <100KB even for super-active accounts |
| URL leaks via email forwarding | Member forwards the email to a colleague | This is acceptable — the URL is bound to a specific account's data; forwarding it gives the colleague that data, which the member chose to do. Document in the email body: "Не препращайте този имейл — линкът дава достъп до вашите данни до DD.MM.YYYY." |
| TTL boundary clock skew | Worker generates token with `expires=now+604800`; Bunny edge clock differs | Bunny tolerates ~5min skew; if `now()` is wrong globally the entire system is broken. Don't over-engineer. |

---

## Focus Area 2: axe-core + Playwright on Next.js 15 + shadcn/ui + Tailwind v4

**State of the art:** `@axe-core/playwright` v4.11.3 (latest) ships an `AxeBuilder` that injects axe-core into the page, runs `axe.run()`, and returns structured violations classified by `impact: 'minor' | 'moderate' | 'serious' | 'critical'`. Filter to AA via `.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])`. `[CITED: playwright.dev/docs/accessibility-testing]` `[VERIFIED: npm view @axe-core/playwright version → 4.11.3]`

### Canonical Spec Pattern

```ts
// tests/e2e/a11y/landing.a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('landing accessibility (BRAND-04, D-12)', () => {
  test('home page passes WCAG 2.1 AA', async ({ page }, testInfo) => {
    await page.goto('/');
    // Wait for shadcn dialogs / CookieYes overlay to settle. Plain
    // 'networkidle' hangs on CookieYes placeholder key (per quick task
    // 260511-fast-2). Use domcontentloaded + a short fixed wait or a
    // resilient locator for first-paint completion.
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('main', { state: 'visible' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      // Per D-12 — fix critical + serious in Phase 6; document moderate + minor
      // in 06-A11Y-AUDIT.md and defer to follow-on quick tasks.
      .options({ resultTypes: ['violations'] })
      .analyze();

    await testInfo.attach('axe-results-full', {
      body: JSON.stringify(results, null, 2),
      contentType: 'application/json',
    });

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    // Soft assertion: log everything, fail only on critical/serious.
    if (results.violations.length > 0) {
      for (const v of results.violations) {
        console.warn(`[a11y:${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} nodes)`);
      }
    }
    expect(blocking).toEqual([]);
  });
});
```

### Page-Level Spec Coverage Matrix (D-12)

| Spec file | URL | Phase-1-shipped surface | Notable shadcn components in scope |
|-----------|-----|--------------------------|------------------------------------|
| `landing.a11y.spec.ts` | `/` | Yes | Card, Button, NavigationMenu (Header), Footer |
| `register.a11y.spec.ts` | `/register` | Yes | Form, Input, Label, RadioGroup, Select (sector/role), Checkbox (consent), Button |
| `login-otp.a11y.spec.ts` | `/login` + `/auth/otp` | Yes | Form, Input (OTP), Button |
| `member-dashboard.a11y.spec.ts` | `/member` + `/member/predlozhi` | Yes (orphan-link wire 260514-q3u) | Card, Button (CTA), Form, Textarea, Select |
| `proposals-problems.a11y.spec.ts` | `/predlozheniya` + `/problemi` | Yes | Card grid, Badge, Tabs (kind filter) |
| `agenda.a11y.spec.ts` | `/agenda` | Yes | Table of Contents (sticky), heading hierarchy h1→h2→h3, prose typography |
| `data-rights.a11y.spec.ts` | `/member/data-rights` (NEW) | NEW Phase 6 | AlertDialog (deletion confirm), Card, Button |

### Top-5 shadcn/ui WCAG Failures to Expect

Per public 2026 shadcn audit `[CITED: thefrontkit.com/blogs/shadcn-ui-accessibility-audit-2026]`:

1. **Focus-ring contrast** — `focus-visible:ring-1 ring-ring/50` produces ratios below 3:1 in light themes. **Fix:** bump to `ring-2 ring-ring/80` or use a darker `--ring` token. Affects every interactive element. **Severity: serious.**
2. **Muted placeholder contrast** — `placeholder:text-muted-foreground` typically lands at 3.5:1, below 4.5:1 required for input text. **Fix:** darken `--muted-foreground` from the default Tailwind palette toward `oklch(0.43 ...)` or similar. Affects every Input. **Severity: serious.**
3. **AlertDialog focus trap missing initial-focus declaration** — Radix manages focus correctly but doesn't auto-focus a sensible element. **Fix:** pass `onOpenAutoFocus` to set focus on the typed-text Input. Critical for the deletion modal (D-04). **Severity: critical.**
4. **Combobox / Select missing `aria-haspopup`** — Radix uses different ARIA semantics than the user expects. axe-core flags this. **Fix:** verify shadcn's `Select` wrapper hasn't been customized to drop the ARIA. **Severity: moderate.**
5. **Form validation announcements** — Zod error messages render to screen but don't announce via aria-live. **Fix:** wrap `FormMessage` in a region with `role="alert"`. Affects register + delete-confirm + cancel-deletion. **Severity: serious.**

The Phase 6 audit doc (`06-A11Y-AUDIT.md`) should expect ~5-10 findings per page across 6 pages = ~30-60 total. Critical + serious filter brings this to ~10-15. That's a realistic budget for the W4 wave; the planner should reserve task budget accordingly.

### Lighthouse CI Extension (D-11)

`.lighthouserc.json` currently runs against `/`, `/agenda`, `/faq`. Extend to all 6 D-12 flows:

```jsonc
{
  "ci": {
    "collect": {
      "url": [
        "https://chastnik.eu/",
        "https://chastnik.eu/register",
        "https://chastnik.eu/login",
        "https://chastnik.eu/predlozheniya",
        "https://chastnik.eu/problemi",
        "https://chastnik.eu/agenda",
        "https://chastnik.eu/faq"
      ],
      "numberOfRuns": 3,
      "settings": { ... existing ... }
    },
    "assert": {
      "preset": "lighthouse:no-pwa",
      "assertions": {
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        // Existing performance + seo gates unchanged.
      }
    }
  }
}
```

Authenticated pages (`/member`, `/member/data-rights`) cannot be Lighthouse'd without seed credentials in CI. **Recommendation:** Lighthouse covers the public 6; axe-core in Playwright covers the authenticated member surfaces (which already have `D-Phase5-E2E-SeedingHarness` in deferred — same auth path will be re-used). Document this split in `06-A11Y-AUDIT.md`.

### Video Subtitles (BRAND-05 / D-13)

```tsx
// src/components/landing/VideoPlayer.tsx — modified
export function VideoPlayer({
  src,
  poster,
  vttSrc,        // NEW — Bunny Stream subtitle URL
}: {
  src?: string;
  poster?: string;
  vttSrc?: string;
}) {
  if (!src) return null;
  return (
    <video src={src} poster={poster} controls preload="metadata" className="...">
      {vttSrc && (
        <track
          kind="subtitles"
          src={vttSrc}
          srcLang="bg"
          label="Български"
          default
        />
      )}
    </video>
  );
}
```

Bunny Stream supports `.vtt` files as library-attached captions; the Stream API returns a `captions` URL per language. Phase 6 ships a placeholder `public/demo.vtt` for development; production VTT URLs come from Bunny Stream once `D-CoalitionVideoSubtitles` resolves. `[CITED: docs.bunny.net/docs/stream-captions]`

### Common Pitfalls (Focus Area 2)

| Pitfall | Cause | Fix |
|---------|-------|-----|
| `networkidle` hang with CookieYes | Placeholder CookieYes key never settles network (260511-fast-2) | Use `domcontentloaded` + explicit selector wait |
| False positives from Sentry/CookieYes scripts | axe scans third-party DOM | `.exclude('[data-cky-tag]')` or use `.include('main')` scoped scans |
| CI flake on AlertDialog focus | Dialog opens before axe scans, focus management async | `await dialog.waitFor({ state: 'visible' })` then scan |
| Reports drown the console | 30-60 violations per page | Use `testInfo.attach` JSON + a markdown report generator script |
| Locale-specific contrast issues | `bg` text is longer than `en`; sometimes causes truncation that fails 1.4.5 (images of text) | Visual review on every spec; not auto-detectable by axe |

---

## Focus Area 3: GDPR Art. 17(3) Anonymization Rationale (D-06)

**State of the art:** EDPB published the 2025 Coordinated Enforcement Action report (and a 2026 stakeholder report on anonymization Feb 18, 2026) flagging that **controllers over-rely on anonymization as an erasure-alternative** and that what counts as "true anonymization" is contested. The CJEU's *EDPS v SRB* (Case C-413/23P) reset the bar — relative-identifiability test applies. `[CITED: edpb.europa.eu — 2026-02 stakeholder anonymisation report]` `[CITED: ReedSmith viewpoints 2025 Coordinated Enforcement Action]`

**Bottom line for D-06:** SMBsite is doing **pseudonymization + targeted PII strip**, NOT pure anonymization. The `users` row retaining `id` + `email_hash` + `status='deleted'` is enough to fail the EDPB three-test (single-out by hash; linkability via attribution_events.attr_sid even after user_id=NULL; inference via timestamps). Therefore D-06's content must claim Art. 17(3)(b) or (d) **legal basis** for retaining the pseudonymized record — NOT claim that the record is anonymous.

### Article 17(3) Verbatim Carve-Outs

From `[CITED: gdpr-info.eu/art-17-gdpr]`:

> **17(3)(b)** "for compliance with a legal obligation which requires processing by Union or Member State law to which the controller is subject or for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller"
>
> **17(3)(d)** "for archiving purposes in the public interest, scientific or historical research purposes or statistical purposes in accordance with Article 89(1) in so far as the right referred to in paragraph 1 is likely to render impossible or seriously impair the achievement of the objectives of that processing"

### Defensible Rationale for SMBsite

The coalition operates as a **political-advocacy non-profit**. The platform's purpose is **mass mobilization of SMB owners around political reforms**. The aggregated vote counts and proposal histories are the **statistical output** of that civic mobilization. Wiping vote/proposal rows on every user deletion would:
- Falsify the vote-count integrity (other users' votes that were genuine become dependent on which deleters exist)
- Eliminate the statistical record of WHY a policy proposal gained or lost support
- Defeat the very legitimate interest (Art. 6(1)(f)) that justifies collecting the data in the first place

This puts the retention claim under **Art. 17(3)(d)** (statistical purposes per Art. 89(1)) AND arguably Art. 17(3)(b) (task in the public interest — civic mobilization is a public-interest task even when conducted by a non-state actor; Bulgarian + EU law on political associations recognizes this).

### Template Structure (mirrors `attribution-balancing-test.md`)

`.planning/legal/erasure-balancing-test.md` should follow the exact 6-section structure of the attribution test:

```markdown
# Account Deletion — Anonymize-and-Preserve Balancing Test

**Status:** Draft (Phase 6)
**Owner:** Coalition + DPO (TBD; lawyer review tracked under D-LawyerTrack)
**Refers to:** D-06, GDPR-05, GDPR-08

## Purpose
On user deletion, the user's PII is stripped from the `users` row (tombstone),
but linked submissions / votes / problem reports retain `submitter_id = <tombstone>`
so aggregate vote counts and oblast statistics are preserved. The legal basis for
retention is **Art. 17(3)(d) GDPR (statistical purposes per Art. 89(1))** with
fallback **Art. 17(3)(b) (task in the public interest — civic mobilization
under Bulgarian + EU law on political associations)**.

## Necessity
The platform's core function is mass political mobilization. Aggregate vote
counts, oblast distribution of support, and historical proposal timelines are
the statistical record of that mobilization. Per-row purge on user erasure would:
- Falsify already-published aggregate counts
- Destroy time-series integrity (a proposal's popularity over time)
- Eliminate the audit trail that lets the coalition (and the public) trace which
  reforms had genuine grass-roots support vs. astroturfing

Less-intrusive alternatives considered and rejected:
- **Hard-delete all linked rows** — destroys aggregate counts; betrays remaining
  users whose votes are now miscounted in retained tallies
- **K-anonymity (require ≥k votes per oblast before showing aggregates)** —
  doesn't help on deletion; the original row still has a unique submitter_id

## Data minimisation
- The `users` row is reduced to {id, email_hash, status='deleted', created_at}
- All identifying fields (email, full_name, phone, oblast, registration_source)
  are set NULL
- `attribution_events.user_id` is set NULL (unlinks the user from attribution
  trail; aggregate per-oblast counts preserved)
- `consents.region` and `consents.email_at_consent` are set NULL
- `sessions` and `newsletter_preferences` are hard-deleted (no retention purpose)
- Brevo contact is `DELETE`d and email added to local suppression list

## Balancing test
| Factor | Assessment |
|---|---|
| Reasonable expectation | Members are told at registration that their
  vote/proposal counts aggregate into public statistics; the privacy policy
  declares retention under Art. 17(3)(d). |
| Privacy impact | Minimal post-tombstone — no identifiable data remains in
  the user-linked tables. Submission text written by the user remains
  (Art. 17(3)(a) freedom of expression). |
| Right to object | User has already exercised the right to erasure; the
  retained record is no longer personal data identifiable to them. |
| Power imbalance | Low — voluntary engagement with civic platform; coalition
  is non-state actor. |

**Conclusion:** Retention of tombstone + linked rows is appropriate under
Art. 17(3)(d) statistical purposes carve-out, with Art. 17(3)(b) public-interest
task as fallback.

## Safeguards
- Tombstone reduces user to non-identifiable shell
- `deletion_log` records only `target_user_id_hash` (SHA-256 of original id);
  cannot be reversed
- `email_hash` retained ONLY for Brevo suppression-list dedup (per GDPR-06
  cascade requirement); never re-associated with PII
- Audit table is INSERT-only at DB permission level (REVOKE per D-08)

## Pending review
- Bulgarian DPO sign-off (post-Phase-6 launch)
- Lawyer review under D-LawyerTrack — final wording in privacy policy
- Specific Art. 17(3)(d) language confirmed against Bulgarian implementation
  of GDPR (Закон за защита на личните данни)
```

### Citations the Lawyer-Review Document Will Need

| Citation | URL / Reference |
|----------|-----------------|
| Art. 17(3)(b) verbatim | gdpr-info.eu/art-17-gdpr/ |
| Art. 17(3)(d) verbatim | gdpr-info.eu/art-17-gdpr/ |
| Art. 89(1) safeguards on statistical purposes | gdpr-info.eu/art-89-gdpr/ |
| EDPB Guidelines 5/2019 on RTBF (search engines context, useful for "public interest" framing) | edpb.europa.eu — Guidelines 05/2019 |
| EDPB 2025 Coordinated Enforcement Action report on Art. 17 | edpb.europa.eu — CEF Report 2025 |
| EDPB 2026-02 stakeholder report on anonymisation | edpb.europa.eu — Stakeholder Event Feb 2026 |
| CJEU *EDPS v SRB* (C-413/23P) — relative identifiability | curia.europa.eu — C-413/23P (anonymization standard) |
| Bulgarian Закон за защита на личните данни — political associations clause | lex.bg — ЗЗЛД |

### Common Pitfalls (Focus Area 3)

| Pitfall | Cause | Fix |
|---------|-------|-----|
| Claiming tombstone = anonymous | EDPB three-test fails (id + email_hash + timestamps single-out) | Frame as pseudonymized retention under Art. 17(3)(d), NOT anonymization |
| Forgetting cascade to consents.email_at_consent | `consents` table holds historical email at consent time | D-07 step 3 strips this; verify the schema field exists or add to consents in Phase 6 |
| Privacy policy not updated to reference Art. 17(3) | Legal basis claim must be declared to data subject in advance | Privacy policy update is part of `D-LawyerReviewLegal` — coalition track |
| Backups retain PII | Neon PITR holds historical row state | Document Brevo + Neon retention in privacy policy; Neon PITR is ≤7 days on standard tier — eventual purge inevitable |
| `email_hash` collision | SHA-256 of email is deterministic; same email → same hash | This is intentional for suppression-list dedup; salt would defeat the purpose. Document this. |

---

## Focus Area 4: k6 Load Test for Member Flows (D-14)

**State of the art:** Phase 02.1's `attribution-load.js` is the canonical k6 pattern. 4 scenarios via `executor: 'constant-arrival-rate'`, shared cookie jar via `http` default behaviour, Next-Action header for Server Action dispatch, Turnstile always-pass key. Sign-off at p95 < 500ms / failed < 1% / OTP linkage > 0. `[VERIFIED: .planning/phases/02.1-attribution-source-dashboard/02.1-LOAD-TEST.md]`

### Phase 6 Extension Scenarios

| Scenario | Path | Method | Target RPS (relative to D-14 TARGET_RPS) | What's actually exercised |
|----------|------|--------|-------------------------------------------|---------------------------|
| `data_export_enqueue` | `/member/data-rights` Server Action | POST (Next-Action) | 5% of TARGET_RPS | requestExport(): rate-limit check → DB write → addEmailJob |
| `member_preferences_load` | `/member/preferences` | GET | 20% of TARGET_RPS | Full RSC with 4 newsletter topic queries + user row read |
| `deletion_cancel_otp_send` | `/account-pending-deletion` Server Action | POST (Next-Action) | 2% of TARGET_RPS | requestCancelOtp(): rate-limit + addEmailJob |
| `cookie_consent_post` | `/api/cookie-consent` | POST JSON | 30% of TARGET_RPS | INSERT cookie_consents row (most-frequent path — every cookie banner accept) |

The **deletion-cascade worker** is NOT a k6 target — it's a delayed BullMQ job, not an inbound RPS path. Instead, write a separate **worker-throughput test** as a tsx script that enqueues N synthetic deletion jobs and measures completion time. Pattern:

```ts
// scripts/load-test-deletion-cascade.ts (NEW, dev-only)
// Enqueues 100 synthetic deletion-cascade jobs against staging seed users
// and measures p95 completion time. NOT a k6 test (job-queue throughput
// is not an HTTP RPS path). Run on staging only.
```

### TARGET_RPS Calculation for Phase 6

Phase 02.1 used the formula `mail_drop × scan_rate × peak_compression / window`. For Phase 6, the relevant peak is **steady-state platform activity** AFTER the campaign has activated members — not the launch-day burst.

Worksheet (operator fills in real values):

| Variable | Default | Coalition value | Source |
|----------|---------|-----------------|--------|
| active_members | 1,000 | TBD | post-warmup membership target |
| sessions_per_member_per_day | 0.3 | TBD | civic platform engagement baseline |
| peak_compression_factor | 4× | TBD | Daily peak vs avg (typically 2-5× for evening browsing) |
| peak_window_seconds | 14,400 | TBD | 4-hour evening peak |
| derived peak RPS | ~0.083 | TBD | (1000 × 0.3 × 4) / 14400 |
| **2× headroom** | **~0.17** | **TBD** | Round up to next integer |
| **TARGET_RPS** | **2** (minimum) | **TBD** | Floor at 2 for meaningful threshold testing |

For Phase 6 the QR mail-drop burst has already been validated by Phase 02.1. The new test is about **the new flows under steady-state load** — proves the new Server Actions don't have latency cliffs.

### Pass/Fail Criteria (D-14)

Reuse Phase 02.1 thresholds + add Phase-6-specific:

```js
// .planning/phases/06-.../k6/phase6-extension.js
export const options = {
  thresholds: {
    // Reused from Phase 02.1
    http_req_duration: ['p(95)<500'],   // 500ms p95 global
    http_req_failed: ['rate<0.01'],     // 1% error rate

    // Phase 6 specific
    'http_req_duration{scenario:data_export_enqueue}': ['p(95)<800'],   // Server Action allowance
    'http_req_duration{scenario:cookie_consent_post}': ['p(95)<200'],   // Lightweight INSERT
    'http_req_duration{scenario:member_preferences_load}': ['p(95)<600'],
  },
  scenarios: {
    landing_hit: { ...phase21 },
    register_hit: { ...phase21 },
    otp_verify_hit: { ...phase21 },
    data_export_enqueue: {
      executor: 'constant-arrival-rate',
      rate: Math.max(1, Math.floor(TARGET_RPS * 0.05)),
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 2,
      maxVUs: 10,
      exec: 'dataExportEnqueue',
    },
    cookie_consent_post: {
      executor: 'constant-arrival-rate',
      rate: Math.max(1, Math.floor(TARGET_RPS * 0.3)),
      ...
      exec: 'cookieConsentPost',
    },
    // ... etc
  },
};
```

### Pre-Run Staging Prerequisites (additions on top of Phase 02.1)

- [ ] Staging Fly app has `BUNNY_*` secrets set (use a sandbox Storage Zone to avoid polluting prod)
- [ ] Staging Neon has the Phase 6 DDL applied (`0004_phase06_gdpr.sql`)
- [ ] Staging seed user `loadtest+gdpr@chastnik.eu` created via SQL (mirrors `loadtest+otp@chastnik.eu` pattern)
- [ ] Staging Brevo API key has `contacts:delete` scope enabled
- [ ] Staging worker process group restarted to pick up the 3 new email-kind handlers
- [ ] Staging rate-limit bypass flag `LOAD_TEST_BYPASS_RATE_LIMIT=true` set (1 export/24h gate would kill k6 in 1 iteration otherwise)

### Common Pitfalls (Focus Area 4)

| Pitfall | Cause | Fix |
|---------|-------|-----|
| Rate-limit kills k6 immediately | Export endpoint has 1/24h per-user limit | LOAD_TEST_BYPASS_RATE_LIMIT env flag (same pattern as Phase 02.1 OTP) |
| Worker not configured for delayMs jobs | BullMQ `delay` not set on staging Redis | Confirm Upstash plan supports delayed jobs (free tier does; verify Redis maxmemory-policy=noeviction per Phase 5 G4) |
| 30-day deletion-cascade not exercised | k6 only proves HTTP path; the cascade itself is a worker job | Use the separate `scripts/load-test-deletion-cascade.ts` for worker throughput |
| Bunny export bundles balloon storage cost | k6 enqueues N export jobs; worker writes N JSON files to Bunny | Clean up the staging Bunny Storage Zone after run: `for path in $(bunny ls); do bunny rm $path; done` |
| Seed user has no PII to export | k6 fixture user has empty submissions/votes | Seed with at least 5 submissions to make the export non-trivial |

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Signed URL generation | Custom HMAC scheme | Bunny.net Token Auth V2 + `crypto.createHash('sha256')` | Bunny edge enforces; you get geo + IP + path scoping for free |
| Async job queue | Custom interval polling | Existing BullMQ (`src/lib/email/queue.ts`) | Already proven in 5 prior phases |
| Email rendering | Hand-written HTML email | React Email components (existing pattern in `src/lib/email/templates/`) | Brand-consistent, both HTML + plainText from same source |
| Audit-table append-only enforcement | Application-layer assertion only | DB-tier REVOKE UPDATE, DELETE | Defense-in-depth; survives app bugs |
| WCAG scanning | Manual review only | @axe-core/playwright + Lighthouse CI | Automation catches 30-40% of issues; manual finds the rest |
| Cookie consent banner | Custom banner | CookieYes (already in stack per D-09) | EU-DPA-recognized CMP; legal-defensible |
| Rate limiting | In-memory counter | @upstash/ratelimit (existing) | Already provisioned, EU region |
| Deletion confirmation modal | Custom dialog | shadcn AlertDialog with `onOpenAutoFocus` | Radix focus management correct; just need a11y config |
| OTP generation for cancel-deletion | New OTP system | Existing Auth.js OTP via `persistHashedOtp` (src/lib/auth.ts:73) | Same hash discipline, same verificationTokens table |
| Bulgarian VTT subtitle authoring | Manual `.vtt` file authoring | Bunny Stream Library captions UI | Stream auto-syncs `.vtt` to player; falls back to client-side `<track>` if needed |
| JSON bundle "right way" | Schema-less JSON | Versioned schema with `format_version: 1` | Forward-compat; D-02 already specifies this |

**Key insight:** Phase 6 has zero algorithm complexity. Every "hard" piece is owned by an existing system. The complexity is **wiring** + **ordering** + **legal text**.

## Runtime State Inventory

> Phase 6 is partially a "rename / new-column / DDL-migration" phase — runtime state matters.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| **Stored data** | New rows in `cookie_consents` (D-09), new `deletion_log` rows on every deletion, `data_export_jobs` tracking rows, `consents.region` backfilled retroactively, tombstoned `users` rows post-deletion, `attribution_events.user_id` set NULL post-deletion, Brevo contact list mutations (DELETE per cascade) | Manual DDL `0004_phase06_gdpr.sql` applied via Neon SQL Editor; backfill SQL run once against `consents` |
| **Live service config** | Bunny Pull Zone Token Authentication V2 must be enabled in dashboard; Storage Zone primary region MUST be `de` (Falkenstein); Pull Zone hostname must be added to Cloudflare DNS as CNAME if not using `.b-cdn.net` directly; Brevo API key scope must include `contacts:delete` | Operator-side checklist: Bunny dashboard config, Brevo API scope verification |
| **OS-registered state** | Fly worker process group has 2 workers (email, attribution) — Phase 6 doesn't add a third process group, both new job kinds (data-export, account-deletion-cascade) run on the existing email worker; no fly.toml changes needed | None — verified via `start-worker.ts` |
| **Secrets / env vars** | 4 new Fly secrets: `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_ACCESS_KEY`, `BUNNY_EXPORT_HOSTNAME`, `BUNNY_TOKEN_AUTH_KEY`. 2 new GH Actions secrets: `CF_API_TOKEN`, `CF_ZONE_ID` (for D-15 purge step). 1 new staging-only flag: `LOAD_TEST_BYPASS_RATE_LIMIT` | Operator pre-flight checklist before Wave 1 |
| **Build artifacts** | No new build artifacts; `.next/standalone/` continues to be the deploy artifact. `@axe-core/playwright` adds to `node_modules` only; runs in CI, not bundled. | None |

**Nothing found in "OS-registered state" category beyond confirming Fly process-group composition is unchanged.**

## Common Pitfalls (cross-cutting, beyond per-focus-area)

### Pitfall A: BullMQ delay precision on Upstash free tier
**What goes wrong:** D-07 cascade job is enqueued with `delayMs: 30 * 86400_000`. Upstash free tier doesn't guarantee long-delay job persistence; eviction or instance restart could lose the job.
**Why it happens:** Free tier is best-effort; long delays sit in Redis ZSETs that can be evicted under memory pressure.
**How to avoid:** Phase 5 G4 already enforced `maxmemory-policy=noeviction` boot-time (verified at `scripts/start-worker.ts:97`). For 30-day delays specifically, defense-in-depth: also schedule a daily cron job (BullMQ repeat job) that scans `users WHERE status='pending_deletion' AND deletion_requested_at < now() - INTERVAL '30 days'` and enqueues missed cascades.
**Warning signs:** Search BullMQ admin dashboard for stuck "delayed" jobs; staging deletion fixture user should age 30 days and successfully cascade.

### Pitfall B: Drizzle transaction can't include the Brevo API call
**What goes wrong:** Wrapping the 9-step cascade in `db.transaction()` and putting the Brevo `DELETE /contacts/{email}` inside means a Brevo timeout rolls back the DB cascade, leaving the user in a half-deleted state.
**Why it happens:** Drizzle transactions are SQL-only; external API calls aren't part of the tx.
**How to avoid:** Step 7 (Brevo) MUST run OUTSIDE the Drizzle tx, AFTER the tx commits, with its own retry. This is exactly the pattern from `src/lib/submissions/admin-actions.ts:100-106` (post-tx `addEmailJob`). Plan accordingly.
**Warning signs:** Operator manual smoke test on staging — verify deletion succeeds even when Brevo is temporarily failing (mock 503 response). Tombstone row must exist; Brevo retry must succeed eventually.

### Pitfall C: Existing FK from consents.user_id is `onDelete: 'restrict'`
**What goes wrong:** D-07 cascade sets `users.email=NULL` instead of DELETEing the row (because `consents` ON DELETE RESTRICT blocks). This is actually the intended behavior — tombstone-not-purge — but if anyone later writes `db.delete(users)` thinking it'll cascade, it'll throw.
**Why it happens:** `consents.user_id` was deliberately set to `restrict` in `src/db/schema/consents.ts:25` precisely so the cascade is forced to go through the tombstone path.
**How to avoid:** Don't delete users rows. Ever. The cascade UPDATEs them. Unit test asserts this — `tests/unit/users-no-delete.test.ts` greps `src/lib/data-rights/` for `.delete(users)` and fails if found.
**Warning signs:** Any PR that writes `db.delete(users)` triggers the grep test.

### Pitfall D: `email_hash` retention conflicts with absolute purge mental model
**What goes wrong:** GDPR-08 says "deletion_log stores hashed user_id only — without PII". `email_hash` on the tombstone users row is arguably PII (it's a deterministic projection of email). A pedantic auditor might flag it.
**Why it happens:** SHA-256 of an email IS reversible by dictionary attack — every email on Earth is a finite set. So email_hash is pseudonymous, not anonymous.
**How to avoid:** Document `email_hash`'s purpose explicitly in the privacy policy: "we keep a one-way hash of your email for unsubscribe-suppression purposes only — to prevent the same email being re-added to the platform by mistake. We never reverse-resolve this hash." This frames it as a legitimate-interest processor that's necessary for the user's own benefit.
**Warning signs:** A user asks "why do you keep my email hash after I deleted?" — answer must be: "to prevent accidental re-subscription if your email is added to a contact list later".

### Pitfall E: WCAG audit produces a moving target
**What goes wrong:** Audit on Tuesday finds 30 issues; planner budgets 30 tasks; on Friday a Tailwind v4 minor upgrade changes a token and adds 5 new findings.
**Why it happens:** axe-core rules update; library upgrades shift contrast ratios; new content introduces new violations.
**How to avoid:** Lock the axe-core version in `package.json` (no `^`). Pin `tailwindcss` (already pinned at `4.2.4`). Generate the audit doc once, treat it as a snapshot. Plan-check verifies no version churn during Phase 6.
**Warning signs:** A Wave 4 task ships an a11y fix but Wave 4's audit doc shows different findings than Wave 1's — investigate version drift.

### Pitfall F: Cloudflare purge step in deploy.yml fails silently
**What goes wrong:** D-15 says purge failure = warning, not deploy failure. CI shows green, but cached HTML serves stale content for hours.
**Why it happens:** Cloudflare API rate limits + occasional 5xx; the step is intentionally non-blocking.
**How to avoid:** Use `continue-on-error: true` on the purge step but EXPLICITLY log to the GitHub Actions summary so operators see "purge skipped — manual purge required". A grep on the deploy logs surfaces failures.
**Warning signs:** Users report stale content; check deploy log for "purge skipped" warnings.

### Pitfall G: New deletion-related copy not in i18n linter scope
**What goes wrong:** D-04 typed-text `ИЗТРИЙТЕ` modal copy is hardcoded as a Bulgarian string; i18n linter doesn't catch it (it's a literal Cyrillic comparison, not a translatable string).
**Why it happens:** The typed-confirmation is part of the validation logic, not display text. zod schema compares to literal "ИЗТРИЙТЕ".
**How to avoid:** Two layers — (a) the EXPECTED_INPUT string lives in `src/lib/data-rights/zod.ts` as a constant `const TYPED_DELETE_CONFIRM = 'ИЗТРИЙТЕ'`; (b) the LABEL telling the user what to type uses `t('member.dataRights.delete.typeToConfirm', {phrase: 'ИЗТРИЙТЕ'})` so the bg.json key holds the user-facing prompt.
**Warning signs:** `lint:i18n` passes but the modal renders untranslated.

## Code Examples

Verified patterns lifted from existing code:

### Drizzle Transaction + Audit Log INSERT (mirror for deletion cascade)

```ts
// Source: src/lib/submissions/admin-actions.ts:69-115 (Phase 4 verified pattern)
await db.transaction(async (tx) => {
  const updated = await tx
    .update(users)
    .set({
      email: null,
      full_name: null,
      // ... all PII fields NULL
      status: 'deleted',
    })
    .where(and(eq(users.id, userId), eq(users.status, 'pending_deletion')))
    .returning({ id: users.id });

  if (updated.length === 0) throw new Error('alreadyHandled');

  await tx.update(attribution_events).set({ user_id: null }).where(eq(attribution_events.user_id, userId));
  await tx.update(consents).set({ region: null }).where(eq(consents.user_id, userId));
  await tx.delete(sessions).where(eq(sessions.userId, userId));
  await tx.delete(newsletter_preferences).where(eq(newsletter_preferences.user_id, userId));

  // Append-only audit log
  await tx.insert(deletion_log).values({
    target_user_id_hash: createHash('sha256').update(userId).digest('hex'),
    deleted_at: new Date(),
    deletion_reason: 'user_request',
  });
});

// Post-tx: Brevo API call (idempotent + retried)
await addEmailJob({
  to: '',
  kind: 'brevo-contact-delete-retry',
  unsubEmail: originalEmail,
});
```

### Email Worker Handler (mirror for new kinds)

```tsx
// Source: src/lib/email/worker.tsx:300-345 (Phase 4 verified pattern)
case 'data-export-ready': {
  const userId = job.data.userId!;
  const exportUrl = job.data.exportUrl!;
  const [row] = await db
    .select({ email: users.email, full_name: users.full_name })
    .from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return { messageId: 'skipped-missing-row' };

  const tEmail = loadT('email.dataExportReady');
  const expiresAt = new Date(job.data.expiresAt!);
  const emailElement = (
    <DataExportReadyEmail
      t={tEmail}
      fullName={row.full_name}
      exportUrl={exportUrl}
      expiresAt={expiresAt}
    />
  );
  const emailHtml = await render(emailElement);
  const emailText = await render(emailElement, { plainText: true });
  return sendBrevoEmail({
    to: { email: row.email, name: row.full_name },
    subject: tEmail('subject'),
    htmlContent: emailHtml,
    textContent: emailText,
    from: {
      email: process.env.EMAIL_FROM_TRANSACTIONAL ?? 'no-reply@auth.chastnik.eu',
      name: loadT('email.from')('name'),
    },
  });
}
```

### REVOKE Migration Pattern (mirror for deletion_log)

```sql
-- Source: src/db/migrations/0003_phase04_submissions.sql:84-92 (Phase 4 verified)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_db_user') THEN
    REVOKE UPDATE, DELETE ON TABLE deletion_log FROM app_db_user;
    REVOKE UPDATE, DELETE ON TABLE cookie_consents FROM app_db_user;
    REVOKE UPDATE, DELETE ON TABLE data_export_jobs FROM app_db_user;
  ELSE
    RAISE NOTICE 'app_db_user role not present — REVOKEs skipped (expected in CI / dev containers)';
  END IF;
END $$;
```

### Boot-time Privilege Assertion (mirror eviction-policy pattern)

```ts
// Source: scripts/start-worker.ts:66-125 (Phase 5 G4 verified)
async function assertDeletionLogInsertOnly(): Promise<void> {
  const client = await getDbClient();
  const result = await client.query(
    `SELECT has_table_privilege(current_user, 'deletion_log', 'UPDATE') as can_update,
            has_table_privilege(current_user, 'deletion_log', 'DELETE') as can_delete`,
  );
  if (result.rows[0].can_update || result.rows[0].can_delete) {
    console.error('[worker] FATAL audit-assert: deletion_log permits UPDATE or DELETE — REVOKE missed');
    process.exit(1);
  }
  console.warn('[worker] audit-assert: deletion_log INSERT-only ✓');
}
```

## Validation Architecture

> Required because `workflow.nyquist_validation: true` in `.planning/config.json`.

### Test Framework
| Property | Value |
|----------|-------|
| Framework (unit) | Vitest 2.1.8 with `@testing-library/react` 16.1.0 |
| Framework (E2E) | Playwright 1.49.1 |
| Framework (a11y, NEW) | @axe-core/playwright 4.11.3 |
| Framework (load) | k6 (Hetzner runner, external) |
| Config files | `vitest.config.ts`, `playwright.config.ts`, `.lighthouserc.json` |
| Quick run command | `pnpm test:unit` |
| Full suite command | `pnpm test` (unit + E2E) + `pnpm exec playwright test tests/e2e/a11y` |
| a11y-only command | `pnpm exec playwright test tests/e2e/a11y --project chromium-desktop` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| GDPR-04 | Member submits export → JSON bundle delivered via signed URL within 5min | E2E + unit | `pnpm exec playwright test tests/e2e/data-rights/export-request.spec.ts` + `pnpm test:unit -- export-bundle-shape` | ❌ Wave 0 |
| GDPR-04 | Export bundle contains all 7 tables with stable schema | unit (snapshot) | `pnpm test:unit -- export-bundle-shape` | ❌ Wave 0 |
| GDPR-04 | Bunny signed URL produces known-good token vector | unit | `pnpm test:unit -- bunny-signed-url` | ❌ Wave 0 |
| GDPR-05 | Typed-text confirm `ИЗТРИЙТЕ` gates the delete button | E2E | `pnpm exec playwright test tests/e2e/data-rights/deletion-typed-text.spec.ts` | ❌ Wave 0 |
| GDPR-05 | Grace-period lockout redirects login to `/account-pending-deletion` | E2E | `pnpm exec playwright test tests/e2e/data-rights/grace-period-lockout.spec.ts` | ❌ Wave 0 |
| GDPR-05 | Cancel-deletion via OTP restores `status='active'` | E2E | `pnpm exec playwright test tests/e2e/data-rights/cancel-deletion.spec.ts` | ❌ Wave 0 |
| GDPR-06 | Cascade calls Brevo `DELETE /contacts/{email}` after tx commit | unit (mocked Brevo) | `pnpm test:unit -- deletion-cascade` | ❌ Wave 0 |
| GDPR-06 | Cascade preserves submissions row (anonymize-and-preserve) | unit | `pnpm test:unit -- deletion-cascade` | ❌ Wave 0 |
| GDPR-07 | `deletion_log` REVOKE applied at DB level | unit (privilege check against staging) | `pnpm test:unit -- deletion-log-schema` | ❌ Wave 0 |
| GDPR-07 | Worker boot fails if REVOKE missing | unit | `pnpm test:unit -- start-worker-assertions` | ❌ Wave 0 (extends Phase 5 G4 pattern) |
| GDPR-08 | `deletion_log` row contains no PII fields | unit (source-grep) | `pnpm test:unit -- deletion-log-schema` | ❌ Wave 0 |
| GDPR-09 | `attribution_events` has no `ip_*` columns | unit (grep) | `pnpm test:unit -- attribution-schema` | ✅ exists (Phase 02.1) |
| BRAND-04 | 6 core flows pass WCAG 2.1 AA (critical + serious = 0) | E2E (axe-core) | `pnpm exec playwright test tests/e2e/a11y/` | ❌ Wave 0 |
| BRAND-04 | Lighthouse accessibility score ≥0.95 on 6 flows | CI (Lighthouse) | runs on PR via `.github/workflows/lighthouse.yml` | ✅ exists (extend URL list) |
| BRAND-05 | VideoPlayer renders `<track>` when `vttSrc` provided | unit | `pnpm test:unit -- video-player` | ❌ Wave 0 (extends existing test if any) |
| D-09 | CookieYes webhook INSERTs cookie_consents row | E2E + unit | `pnpm exec playwright test tests/e2e/cookie-consent.spec.ts` (extends existing) + `pnpm test:unit -- cookie-consents-schema` | partial — existing E2E doesn't write |
| D-10 | New consents INSERTs populate region via GeoIP | unit (mocked GeoIP) | `pnpm test:unit -- consents-region-populate` | ❌ Wave 0 |
| D-10 | One-time backfill SQL populates region for historical rows | manual SQL + verification query | one-off Neon SQL Editor; verification query committed to migration | ❌ Wave 0 |
| D-14 | k6 thresholds (p95 < 500ms, error < 1%) under TARGET_RPS | external (Hetzner) | `k6 run phase6-extension.js` | ❌ Wave 0 |
| D-15 | Cloudflare purge step in deploy.yml | smoke (operator post-deploy) | manual: verify cache purge in GH Actions log | n/a (workflow change) |

### Sampling Rate

- **Per task commit:** `pnpm test:unit` (Vitest, < 30s)
- **Per wave merge:** `pnpm test` + `pnpm exec playwright test tests/e2e/a11y` (full suite, ~3-5min)
- **Per phase gate:** All of the above + `pnpm exec playwright test tests/e2e/data-rights` + operator-run k6 + operator-applied Neon DDL + Lighthouse CI green on PR
- **Per phase ship:** Full suite green + operator-signed `06-LOAD-TEST-RUN.md` + operator-signed `06-A11Y-AUDIT.md`

### Wave 0 Gaps

- [ ] `tests/e2e/a11y/` directory + 7 spec files (one per D-12 flow + 1 for new data-rights surface)
- [ ] `tests/e2e/data-rights/` directory + 4 spec files (export, typed-text, grace-period, cancel-deletion)
- [ ] `tests/unit/deletion-cascade.test.ts` — order + transactional semantics + Brevo mocked
- [ ] `tests/unit/deletion-log-schema.test.ts` — privilege assertion + source-grep for no-PII columns
- [ ] `tests/unit/export-bundle-shape.test.ts` — snapshot test of 7-key JSON structure + stability across users
- [ ] `tests/unit/bunny-signed-url.test.ts` — known-good token vector against Bunny docs example
- [ ] `tests/unit/cookie-consents-schema.test.ts` — INSERT-only enforcement
- [ ] `tests/unit/consents-region-populate.test.ts` — new INSERTs populate region from GeoIP
- [ ] `tests/unit/video-player.test.ts` — `<track>` rendered when vttSrc provided
- [ ] `.planning/phases/06-.../06-A11Y-AUDIT.md` — populated as Wave 4 progresses
- [ ] `.planning/phases/06-.../06-LOAD-TEST.md` — k6 runbook (clone 02.1 pattern)
- [ ] `.planning/phases/06-.../k6/phase6-extension.js` — new k6 scenarios
- [ ] `.planning/legal/erasure-balancing-test.md` — Art. 17(3) draft

No framework install needed — Vitest + Playwright already present.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bunny Token Auth V1 (MD5) | Token Auth V2 (SHA-256, supports token_path + countries + IP) | Bunny rolled out 2022; V1 deprecated 2024 | Use V2 only — V1 brute-force trivially possible with modern GPUs |
| `jest-axe` for component a11y | `@axe-core/playwright` for full-page a11y | Industry shift 2024-2025 to E2E-level a11y | Playwright already in stack; one fewer dep |
| Manual cache purge after deploy | Automated CF purge in deploy.yml | Industry standard since 2023 | D-15 closes this |
| MD5 token storage | SHA-256 throughout | Universal post-2020 | Already correct in codebase (OTP HMAC, password hash patterns) |
| "Anonymization is unambiguous" | EDPB three-test (single-out + linkability + inference) | CJEU C-413/23P (2024) + EDPB 2025-2026 guidance | D-06 must frame as pseudonymization + retention under Art. 17(3), NOT anonymization |
| GA4 for civic platforms | Plausible (already in stack) | EU DPA rulings 2022-2024 | Already correct |

**Deprecated/outdated:**
- **Bunny Token Auth V1 (MD5)** — do not use even though docs still show it. V2 is the recommended path.
- **Mailchimp / SendGrid** — US data residency; CLAUDE.md already proscribes them.
- **Manual `payload migrate`** — blocked by tsx ESM incompat; project memory notes manual DDL convention.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Bunny Token Auth V2 base64url substitution uses `+→-`, `/→_`, strip `=` (RFC 4648 standard) | Focus Area 1 signing algorithm | Signed URLs return 403 from Bunny edge until operator runs Bunny's "Test URL" feature and pastes the correct substitution; trivially fixable in `bunny.ts` |
| A2 | The Pull Zone hostname is operator-provisioned at start of phase; not deferred mid-phase | Focus Area 1 env vars | Phase ship blocked on operator setting up the Pull Zone; declare as `D-BunnyExportZoneProvisioning` |
| A3 | Coalition's claim to Art. 17(3)(d) "statistical purposes" survives Bulgarian DPO scrutiny | Focus Area 3 legal rationale | Lawyer review (D-LawyerTrack) may rephrase the legal basis; doesn't break code, only the draft balancing test text |
| A4 | shadcn/ui contrast issues (focus-ring, muted-foreground) are the top findings the audit will surface | Focus Area 2 expected findings | If actual findings are different (e.g., ARIA-heavy issues dominate), task budget shifts within Phase 6 but doesn't blow scope |
| A5 | k6 TARGET_RPS=2 is sufficient (steady-state, not launch-burst) for Phase 6 thresholds | Focus Area 4 calculation | If post-warmup membership grows faster than projected, re-run with higher TARGET_RPS; trivial flag change |
| A6 | `D-CFPurgeOnDeploy` repo secrets (`CF_API_TOKEN`, `CF_ZONE_ID`) are operator-provided before W4 | D-15 deploy.yml | Wave 4 task blocked on operator; declare as pre-flight checklist item |
| A7 | Brevo API key on prod has `contacts:delete` scope | D-07 cascade step 7 | Cascade fails on 403; operator verifies in Brevo dashboard before W2 |
| A8 | The 30-day grace period schedule is enforced by BullMQ `delayMs` AND a safety-net cron job | Pitfall A | Belt-and-suspenders; if cron misses, BullMQ delay covers; if BullMQ delay loses the job, cron catches it within 24h |
| A9 | `data_export_jobs` tracking table is needed to find + invalidate Bunny blobs on deletion | Focus Area 1 revocation | Without the tracking table, deletion can't find Bunny paths to delete; we'd leak export bundles for 7 days post-deletion |
| A10 | Existing `users.created_at` is sufficient; `users.deletion_requested_at` is a new column | D-04 / D-05 schema | Confirmed via `src/db/schema/auth.ts` read — no existing deletion column |

## Open Questions

1. **What's the Bunny Storage Zone naming convention for prod?**
   - What we know: D-01 says Bunny.net; project has no prior Bunny Storage usage.
   - What's unclear: Storage Zone name + Pull Zone hostname (e.g., `cdn-exports.chastnik.eu` vs `smbsite-exports.b-cdn.net`).
   - Recommendation: Operator decides during W2 wave; planner adds `D-BunnyExportZoneProvisioning` pre-flight checklist item.

2. **Is there an existing OTP-cancel pattern we can reuse beyond Phase 1's register/login?**
   - What we know: `verificationTokens` table supports `kind: 'register' | 'login'`; cancel-deletion would be a new `kind: 'cancel_deletion'`.
   - What's unclear: Whether the `verifyOtp` Server Action's kind-branching logic accommodates a new kind without surgery.
   - Recommendation: W3 wave starts with a 30-min exploration of `src/app/actions/verify-otp.ts` (existing); if surgery needed, plan a dedicated task.

3. **Should `deletion_log` keep `target_user_id_hash` for forever, or have its own retention policy?**
   - What we know: GDPR-08 says "audit table is INSERT-only at DB level"; doesn't specify retention.
   - What's unclear: Whether keeping hash-only entries forever is fine (presumed yes — non-PII, fits audit purpose).
   - Recommendation: Treat as infinite retention in Phase 6; document in privacy policy that "hashed audit records of deletion events are retained indefinitely for compliance verification".

4. **Does Phase 6 need to backfill the `email_hash` column for existing users?**
   - What we know: D-06 says retain `email_hash` on tombstone. Existing users don't have this column yet.
   - What's unclear: Whether to backfill all current users now (during 0004 migration) or only set on tombstone time.
   - Recommendation: Backfill all in 0004 — small one-time SQL update, makes future deletions a trivial UPDATE rather than a "fetch email, hash it, UPDATE" round-trip.

5. **Are deferred items `D-CFPurgeOnDeploy`, `D-ConsentsRegionPopulation`, `D-CookieVaryCacheRule` listed as Phase 6 in STATE.md actually scope?**
   - What we know: STATE.md row 134-135 lists these as `resolves_phase: 6`.
   - What's unclear: All three are explicitly addressed in CONTEXT.md decisions D-15, D-10, D-16 — so YES, in scope.
   - Recommendation: Planner explicitly maps each `D-*` deferred item to a wave + task.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | ✓ | ≥20 (package.json engines) | — |
| pnpm | All | ✓ | 9.15.0 | — |
| PostgreSQL via Neon | DDL, cascade | ✓ | 16.x EU Frankfurt | — |
| BullMQ + Upstash Redis | Job queue | ✓ | 5.76.4 / 1.37.0 (EU region) | — |
| Brevo API | Cascade step 7 | ✓ | REST v3 | — |
| Bunny Storage Zone | Export bundle upload | ✗ | — | **None — operator must provision** |
| Bunny Pull Zone (Token Auth V2) | Export bundle signed URL | ✗ | — | **None — operator must provision** |
| Cloudflare API token + zone ID | D-15 purge step | ✗ | — | **None — operator must provide GH Actions secrets** |
| @axe-core/playwright | a11y testing | ✗ | — | Install: `pnpm add -D @axe-core/playwright` |
| Hetzner CX21 (load runner) | k6 load test | n/a (provisioned per-run) | — | Operator provisions on demand, deletes after |
| MaxMind GeoLite2 license key | consents.region backfill | ✓ | (operational per Phase 02.1 deploy) | — |
| Playwright | E2E + a11y | ✓ | 1.49.1 | — |
| Vitest | Unit | ✓ | 2.1.8 | — |

**Missing dependencies with no fallback (operator must address before Wave 2):**
- Bunny Storage Zone provisioning (Storage Zone + AccessKey + region = de)
- Bunny Pull Zone with Token Auth V2 (hostname + token key)
- Cloudflare API token with `Cache Purge` permission + zone ID

**Missing dependencies with fallback (planner addresses in plan):**
- `@axe-core/playwright` — add as dev-dep via pnpm (Wave 4 first task)

## Security Domain

`security_enforcement: true` (per `.planning/config.json`). Applicable to a phase that handles deletion + data export.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Existing Auth.js v5 OTP for cancel-deletion path; no new auth surface |
| V3 Session Management | yes | Existing `__Secure-next-auth.session-token` cookie; deletion-cascade DELETEs `sessions` rows |
| V4 Access Control | yes | Server Actions check session via `await auth()`; deletion requires same-user check (`session.user.id === input.userId`) |
| V5 Input Validation | yes | zod schemas at every Server Action boundary; existing `src/lib/email/queue.ts` + `src/lib/submissions/zod.ts` pattern |
| V6 Cryptography | yes | SHA-256 for `target_user_id_hash`, `email_hash`, and Bunny signed-URL token. No new crypto primitives. |
| V7 Error Handling | yes | Existing Pino structured logs; no new error surfaces beyond `[worker] FATAL audit-assert` |
| V8 Data Protection | yes | The phase IS data protection — D-06 anonymize, D-07 cascade, D-09 consent persistence, D-10 region backfill |
| V9 Communications Security | yes | TLS to Bunny.net (HTTPS), Brevo (HTTPS), Cloudflare (HTTPS) — all native |
| V10 Malicious Code | n/a | No file upload from user; export is server-generated JSON |
| V11 Business Logic | yes | Race conditions on `users.status` flips — mirror Phase 4 `WHERE status='active'` pattern (UPDATE ... WHERE old_status) to prevent double-fire |
| V12 Files & Resources | yes | Bunny signed URLs use TTL; per-user path scoping prevents enumeration |
| V13 API & Web Service | yes | All Server Actions; no public API endpoints added except `/api/cookie-consent` (CookieYes webhook) — verify request signature if CookieYes supports it |
| V14 Configuration | yes | Bunny secrets via Fly secrets; never inlined in build; never in NEXT_PUBLIC_* |

### Known Threat Patterns for Phase 6 Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Mass deletion DoS (user spams delete-request to clog worker) | Denial | Rate limit: 1 deletion-request per lifetime per user (already only-once semantic — `status` can only flip `active → pending_deletion` once); on cancel + re-request, rate-limit per 24h |
| Export bundle URL enumeration | Information disclosure | Per-user-id-hash path prefix + signed URL TTL — paths aren't guessable, signed URLs expire |
| Replay attack on cancel-deletion OTP | Spoofing | Existing Auth.js OTP one-use + HMAC-hashed + expires (Phase 1 pattern) |
| CSRF on requestDeletion Server Action | Tampering | Next.js Server Actions have CSRF protection by default (action-ID + origin check) |
| Brevo API key leak via export bundle (the bundle contains the user's email which is also their Brevo contact) | Information disclosure | Already mitigated — the bundle is signed-URL-protected; Brevo API key never appears in bundle |
| Concurrent deletion + active session (user deletes while logged in on another device) | Tampering | `sessions` DELETE in cascade step 4 forces logout on all devices; layout guard re-checks `users.status` on every request |
| Stale signed URL post-deletion (deletion fires during 7-day TTL) | Information disclosure | D-07 cascade step 6.5 DELETEs Bunny blobs; tracker table `data_export_jobs` enables enumeration |
| SQL injection via `target_user_id_hash` | Tampering | Drizzle parameterized queries; `target_user_id_hash` computed in app, never user-supplied |
| Cookie consent webhook spoofing | Spoofing | If CookieYes provides webhook signing, verify HMAC; if not, restrict by source IP (CookieYes documents their egress IPs) — investigate during D-09 implementation |

## Sources

### Primary (HIGH confidence)
- `.planning/phases/06-gdpr-self-service-hardening/06-CONTEXT.md` — 16 locked decisions
- `.planning/REQUIREMENTS.md` — GDPR-04..09 + BRAND-04..05
- `src/lib/email/worker.tsx` — Phase 4 + 5 verified email-kind handler patterns (lines 300-414)
- `src/lib/submissions/admin-actions.ts` — Phase 4 verified Drizzle tx + audit-log INSERT (lines 69-115)
- `src/db/migrations/0003_phase04_submissions.sql:84-92` — REVOKE pattern
- `scripts/start-worker.ts:66-125` — boot-time assertion pattern
- `src/db/schema/consents.ts` — append-only consents pattern + D-10 backfill target
- `src/db/schema/auth.ts` — users table shape; D-04/D-06 columns to ADD COLUMN
- `src/app/(frontend)/suspended/page.tsx` — D-05 grace-page shell
- `.planning/phases/02.1-attribution-source-dashboard/02.1-LOAD-TEST.md` — k6 reuse template
- `.planning/legal/attribution-balancing-test.md` — Art. 17(3) template structure
- `package.json` — verified versions for all locked stack components

### Secondary (MEDIUM-HIGH confidence)
- [Playwright accessibility testing docs](https://playwright.dev/docs/accessibility-testing) — AxeBuilder canonical pattern
- [@axe-core/playwright npm](https://www.npmjs.com/package/@axe-core/playwright) — latest version 4.11.3
- [Bunny.net Token Authentication docs](https://docs.bunny.net/docs/cdn-token-authentication) — V2 SHA-256 algorithm
- [Bunny.net signed URL article](https://support.bunny.net/hc/en-us/articles/360016055099) — signing examples
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — current state of component library
- [GDPR Art. 17 official text](https://gdpr-info.eu/art-17-gdpr/) — verbatim 17(3)(b) + 17(3)(d) carve-outs
- [EDPB Stakeholder Event on Anonymisation Feb 2026](https://www.edpb.europa.eu/) — pseudonymization vs anonymization distinction

### Tertiary (verified-but-needs-validation)
- [thefrontkit shadcn/ui WCAG audit 2026](https://thefrontkit.com/blogs/shadcn-ui-accessibility-audit-2026) — community audit; useful for expected findings but not authoritative
- [Article 17 EDPB CEF Report 2025](https://changeflow.com/govping/government-general/edpb-2026-02-19) — third-party summary of EDPB findings on Art. 17 enforcement

### Internal canonical references (Phase 6 build sequence)
- Phase 4 plans 04-01 / 04-06 / 04-07 — closest precedent for Phase 6 architecture
- Phase 5 G4 eviction-policy boot-assertion — closest precedent for D-08 boot-assertion
- Phase 02.1 D-15 k6 — closest precedent for D-14
- Phase 02.1 GeoIP worker (`src/lib/attribution/geoip.ts`) — D-10 dependency
- Phase 5 unsubscribe → Brevo blocklist (`src/lib/newsletter/brevo-sync.ts`) — D-07 step 7 pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library version verified against `package.json` + npm
- Architecture patterns: HIGH — Phase 6 reuses Phase 4 + 5 patterns 1:1
- Bunny.net signed URL: MEDIUM — algorithm verified from Bunny docs; exact base64url chars assumed (A1)
- WCAG audit tooling: HIGH — `@axe-core/playwright` is industry-standard
- GDPR Art. 17(3) rationale: MEDIUM — text drafted from EDPB guidance + Bulgarian-applicable framing; lawyer-final under `D-LawyerTrack`
- k6 reuse: HIGH — Phase 02.1 pattern proven in production
- Common pitfalls: HIGH — most are lifted directly from existing in-codebase comments + Phase 5 G1-G4 + Phase 04.1 lessons

**Research date:** 2026-05-15
**Valid until:** 2026-06-14 (30 days — Phase 6 implementation should start within this window; longer = re-check Bunny + axe versions)

---

*Phase: 06-gdpr-self-service-hardening*
*Research authored: 2026-05-15*
