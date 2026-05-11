# Phase 4 — Editorial Operations Runbook

> Procedures for the coalition operator to bootstrap and maintain editorial roles.
> Phase 4 introduces a **two-identity model** (PATTERNS.md §Critical Architecture Finding):
> editorial users exist in BOTH the application `users` table (Drizzle, Auth.js) AND the
> Payload `admin_users` table.

---

## 1. Bootstrap the first super_editor

Phase 4 intentionally has no UI for granting `super_editor` — the first super_editor is created
via direct DB seed (D-Phase04Plan01-LiveNeonPush, STATE.md Deferred Items).

### Step 1.1 — Pick the operator account

The operator MUST already have a member account on the platform (registered via /auth/register,
email verified). Note the `users.id` for this account:

```sql
SELECT id, email FROM users WHERE email = '<operator email>';
```

### Step 1.2 — Promote in users table

Via Neon SQL Editor (NOT `payload migrate` — blocked by tsx/Node 22 ESM incompat):

```sql
UPDATE users SET platform_role = 'super_editor' WHERE id = '<operator user_id>';
```

### Step 1.3 — Promote in admin_users table

The Payload `admin_users` table is separate (managed by Payload's auth system).

**(a) Use the existing Payload admin UI** — log in as the existing admin user (created during
deploy), navigate to Collections → Admin Users, find the operator's row (or create one if
absent), set `role = 'super_editor'`.

**(b) Direct DB seed** if no admin exists yet:

```sql
INSERT INTO admin_users (id, email, role, name)
VALUES (gen_random_uuid(), '<operator email>', 'super_editor', '<operator full name>');
-- Set the password via Payload admin password-reset flow on first login.
```

**CRITICAL:** the `email` value in `admin_users` MUST match the email in `users` for both
identities to align. Mismatched emails mean the operator can log in to Payload admin but
the `actor_user_id` in `moderation_log` will be NULL (T-04-07-07).

---

## 2. Provisioning a regular editor

1. The candidate must already have a member account in `users` (registered via the platform,
   email verified).
2. A super_editor calls `grantEditor({ userId })` (Server Action shipped in Plan 04-07).
   Phase 4 ships the action without a dedicated UI surface — call via:
   - A custom Payload admin view (future plan can add one), or
   - Direct DB (see Step 2a below).
3. Mirror in admin_users so the editor can log in to the Payload admin panel:

```sql
INSERT INTO admin_users (id, email, role, name)
VALUES (gen_random_uuid(), '<editor email>', 'editor', '<editor full name>');
-- Or via the Payload admin Users collection UI (Collections → Admin Users → Create).
```

4. The new editor logs into /admin with the email they used in Step 3. They will see the
   Moderation Queue under the admin navigation.

**Step 2a — Direct DB grantEditor (if no UI yet):**

```sql
UPDATE users SET platform_role = 'editor' WHERE id = '<candidate user_id>';
INSERT INTO moderation_log (action, actor_user_id, target_kind, target_id, note)
VALUES ('editor_grant', '<super_editor_user_id>', 'user', '<candidate user_id>', 'Initial editor grant via SQL');
```

---

## 3. Revoking editor access

1. A super_editor calls `revokeEditor({ userId })` (Server Action from Plan 04-07).
   The action sets `users.platform_role = NULL`.
2. **The `assertNotLastSuperEditor()` guard refuses to demote the last super_editor** —
   this prevents locking out all role management (T-04-07-05). If only one super_editor
   exists, the action will fail with "Cannot demote the last super_editor".
3. Remove from admin_users to revoke Payload admin panel access:

```sql
UPDATE admin_users SET role = NULL WHERE email = '<editor email>';
-- or
DELETE FROM admin_users WHERE email = '<editor email>';
```

---

## 4. Recovering from accidental last-super-editor demotion

The Server Action guard (`assertNotLastSuperEditor`) prevents this in the application path.
If it happens via direct DB SQL (operator error):

```sql
-- Restore super_editor in the application users table
UPDATE users SET platform_role = 'super_editor' WHERE id = '<user_id>';

-- Restore in admin_users (for Payload admin access)
UPDATE admin_users SET role = 'super_editor' WHERE email = '<email>';

-- Optionally log the recovery
INSERT INTO moderation_log (action, actor_user_id, target_kind, target_id, note)
VALUES ('editor_grant', '<your_user_id>', 'user', '<restored_user_id>', 'Emergency super_editor restoration via SQL');
```

---

## 5. Suspending and unsuspending members

### 5.1 — Suspend a member (editor or super_editor)

1. Log in to Payload admin → navigate to Moderation Queue.
2. Click "Прегледай заявката" on any submission by the target member.
3. In ReviewDialog, expand the submitter accordion.
4. Click "Спри акаунта" (destructive button).
5. Enter a reason (minimum 10 characters, recorded in moderation_log.note).
6. Click "Спри акаунта" in the confirmation dialog.

**Effect:**
- `users.status` → `'suspended'`
- One new row in `moderation_log` with `action='user_suspend'`, `target_kind='user'`, `target_id=<userId>`, `note=<reason>`
- BullMQ enqueues a `user-suspended` email job → worker sends Bulgarian suspension email to the member

**Layout gate:** On the member's next navigation to any `/member/*` page, they are redirected
to `/suspended`. Their existing session is NOT immediately revoked (T-04-07-03 documented
tradeoff — the window is 30s–15min until next navigation, acceptable for v1).

### 5.2 — Unsuspend a member (super_editor only)

Phase 4 ships `unsuspendUser({ userId, note })` as a Server Action but without a dedicated UI.

**Via Server Action (when a custom view is added in a future plan):**
Call `unsuspendUser({ userId: '<target user id>', note: 'Причина за реактивиране' })`.

**Via direct DB (emergency path, only for super_editors):**

```sql
UPDATE users SET status = 'active' WHERE id = '<user_id>';
INSERT INTO moderation_log (action, actor_user_id, target_kind, target_id, note)
VALUES ('user_unsuspend', '<actor_user_id>', 'user', '<target_user_id>', '<reason for unsuspension>');
```

---

## 6. Pages collection (EDIT-03 — agitation pages)

The `Pages` Payload collection (Plan 04-01) appears in the admin nav under Collections → Pages.
Editors create/edit/publish via the Lexical editor.

**Publishing workflow:**
1. Create a new Page with status = 'draft'. Save.
2. Preview via the Payload admin preview button (if configured) or by visiting the page URL
   directly while logged in as an admin.
3. When ready, set status = 'published' and save. The `beforeChange` hook stamps `published_at`.
4. Public read access (`isPublishedOrEditor`) gates anonymous visitors out until status = 'published'.

---

## 7. Ad-hoc newsletters (EDIT-06)

Phase 5 already shipped the Newsletters collection + composer. No Phase 4 changes required
for this sub-criterion of EDIT-06 — it inherits from Phase 5.

**Workflow:**
1. Navigate to /admin → Collections → Newsletters → Create New.
2. Compose via Lexical editor (Phase 5 plan 05-07).
3. Send test email to yourself first (24h gate).
4. Click "Изпрати бюлетина" when ready.

---

## 8. Status-change emails

Approve/reject actions automatically enqueue submission-status emails (Plan 04-07 worker.tsx).
The BullMQ worker handles them async. To monitor:

- **Sentry:** errors in worker handlers report under `submission-status-*` job tags.
- **Pino logs:** structured `kind=submission-status-approved|rejected|user-suspended` entries.
- **Brevo:** check the transactional email log in the Brevo dashboard for delivery status.

**Email subjects (from bg.json, verified Bulgarian Cyrillic):**
- Approved: "Вашето предложение беше одобрено"
- Rejected: "Вашето предложение не беше одобрено"
- Suspended: "Акаунтът ти е временно спрян"

---

## 9. Cross-references

| Topic | Location |
|-------|----------|
| Schema migration (DDL applied manually) | `D-Phase04Plan01-LiveNeonPush` in STATE.md Deferred Items |
| Two-table identity architecture | PATTERNS.md §Critical Architecture Finding |
| Last-super-editor guard test | `tests/unit/super-editor-guard.test.ts` |
| Layout gate pattern (session JWT not mutated) | PATTERNS.md Pattern 6 |
| Suspended account page | `src/app/(frontend)/suspended/page.tsx` |
| assertNotLastSuperEditor implementation | `src/lib/auth/role-gate.ts` |
| suspendUser, grantEditor, revokeEditor actions | `src/lib/submissions/admin-actions.ts` |
| SuspendDialog component | `src/app/(payload)/admin/views/moderation-queue/SuspendDialog.tsx` |
