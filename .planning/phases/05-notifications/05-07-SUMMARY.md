---
plan: 05-07
phase: 05-notifications
status: complete
tasks_complete: 2
tasks_total: 2
---

# Plan 05-07 Summary — Newsletter Composer Admin UI

**Mode:** Inline orchestrator execution (subagent retries hit Bash permission denial; orchestrator has direct Bash access).

## What was built

| File | Purpose |
|------|---------|
| `src/lib/newsletter/preview.ts` | renderPreview Server Action (debounced from iframe) — sentinel `#preview` URLs |
| `src/app/actions/send-blast.ts` | sendBlast — D-02 24h gate (lastTestSentAt + lastEditedAfterTestAt), enqueues newsletter-blast |
| `src/app/actions/send-test.ts` | sendTest — reads editor email via payloadInst.auth(), enqueues newsletter-test |
| `src/app/actions/cancel-scheduled.ts` | cancelScheduled — Pitfall 3 status flip BEFORE BullMQ remove |
| `src/app/actions/get-recipient-count.ts` | getRecipientCount — count only, never user list |
| `src/components/payload/LivePreviewIframe.tsx` | Client iframe with debounced renderPreview call |
| `src/components/payload/SendBlastButton.tsx` | Gated CTA with Tooltip + post-send Dialog |
| `src/components/payload/NewsletterComposer.tsx` | Top-level composer (split-pane / tab-toggle, action bar) |
| `src/components/ui/{dialog,tooltip,tabs,sonner}.tsx` | shadcn primitives (added via CLI) |
| `src/app/(payload)/admin/importMap.js` | Extended with NewsletterComposer entry |
| `src/collections/Newsletters.ts` | admin.components.edit.beforeDocumentControls registers composer |
| `tests/unit/newsletter-server-actions.test.ts` | 25+ source-grep contracts for the 5 Server Actions |
| `tests/integration/admin-newsletter-composer-importmap.test.ts` | 9 lock-in tests (importMap, getAdminT, no Cyrillic, no useTranslations) |
| `tests/e2e/admin-newsletter-composer.spec.ts` | Playwright .skip()'d full-flow scaffold for Wave 4 (Plan 05-11) |

## Decisions honored

- **D-02** — 24h gate enforced server-side in sendBlast: `lastTestSentAt + 24h` AND `lastEditedAfterTestAt === false`. Distinct gate_never / gate_expired / gate_invalidated reasons surface to UI.
- **D-04** — Pitfall 3 cancel race: status flip to 'cancelled' BEFORE BullMQ `getJob().remove()`; worker re-checks per-recipient (Plan 05-05) so cancel is authoritative even if job already promoted to active.
- **D-05** — getRecipientCount returns count only — never user IDs/emails.
- **D-14** — Preview uses sentinel `#preview` URLs (no Brevo blocklist effect).
- **D-22 / D-25** — Every new Server Action calls `assertEditorOrAdmin()` from `@/lib/auth/role-gate` first. Admin custom 'use client' components use `getAdminT` from `@/lib/email/i18n-direct.ts`, NEVER `useTranslations` from next-intl (Payload admin shell does NOT mount NextIntlClientProvider). Zero hardcoded Cyrillic literals in composer/SendBlastButton.
- **Pitfall 7** — Composer registration is split: component path string lives in `src/collections/Newsletters.ts admin.components.edit.beforeDocumentControls`, and `src/app/(payload)/admin/importMap.js` exports a matching key → React component. `src/payload.config.ts` is byte-identical to Plan 05-04's output.

## Notable deviations

1. **`afterFields` is not a Payload 3.84 collection-admin key.** The plan template specified `admin.components.afterFields`, but Payload 3.84's `CollectionAdminOptions` only exposes `afterList`, `afterListTable`, `beforeList`, `beforeListTable`, `Description`, `listMenuItems`, `views`, and `edit.{beforeDocumentControls, editMenuItems, PreviewButton, …}`. Verified against `node_modules/payload/dist/index.bundled.d.ts`. Used `admin.components.edit.beforeDocumentControls` — renders the composer above the Save / Publish controls on the Edit view, which matches the UI-SPEC §5.4 layout.
2. **Tests strip comments before pattern matching.** The composer files mention `useTranslations` / `next-intl` / Cyrillic in *comments* to document the constraint. The lock-in tests strip block + line comments before grepping, so only real code is checked.
3. **`brevo-sync.ts` already exists from 05-06.** Plan referenced it as a dependency; it's already in main and reused as-is.
4. **`pnpm build` not run as part of this plan.** Payload generates types based on the live DB, which doesn't yet have the Phase 5 schema (Wave 3 schema push gate). Build verification deferred to Wave 3.

## Verification

- `pnpm typecheck` — clean
- `pnpm test:unit` — 288/288 pass across 32 files (was 249 after 05-05; +39 new tests across 3 new files)
- `grep -lc "assertEditorOrAdmin" src/app/actions/*.ts src/lib/newsletter/preview.ts` → all 5 contain the call
- `grep -q "import { getAdminT }" src/components/payload/{NewsletterComposer,SendBlastButton}.tsx` → both ✓
- `grep -q "useTranslations" src/components/payload/{NewsletterComposer,SendBlastButton}.tsx` → none in code (only in docblock comments which the test strips)
- `grep -nE "[Ѐ-ӿ]" src/components/payload/{NewsletterComposer,SendBlastButton}.tsx` → only matches inside comments (stripped); no string-literal Cyrillic
- `grep -q "from '@/components/payload/NewsletterComposer'" src/payload.config.ts` → no (Pitfall 7 — registration via collection + importMap)
- 4 shadcn primitives installed: dialog.tsx, tooltip.tsx, tabs.tsx, sonner.tsx

## Notes for downstream plans

- **Plan 05-11 (Wave 4 e2e)**: un-skip `tests/e2e/admin-newsletter-composer.spec.ts` after Wave 3 schema push enables the live composer; full editor-to-Brevo flow runs end-to-end.
- **Plan 05-08 (preferences page)**: independent surface; no shared code with this plan.
- **Plan 05-09 (community page)**: independent surface; no shared code with this plan.

## Commits

- `14a42b4` — feat(05-07): 5 newsletter Server Actions — preview + sendBlast + sendTest + cancelScheduled + getRecipientCount
- `2f51846` — feat(05-07): NewsletterComposer admin UI + importMap + edit.beforeDocumentControls
