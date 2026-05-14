# Add Payload admin nav links for Attribution + Moderation Queue views

**Status:** pending
**Priority:** medium (editor-UX polish; no functional impact)
**Created:** 2026-05-14
**Source:** Phase 04.1 Wave 6 verification — operator observed missing nav entries
**Tracking key:** `D-EditorNavLinks`

## Problem

`src/payload.config.ts:29-40` registers two custom admin views:

- `attribution` → `/admin/views/attribution` (Phase 02.1 ATTR-07)
- `moderationQueue` → `/admin/views/moderation-queue` (Phase 4 EDIT-04 / EDIT-05)

Payload's admin side nav auto-lists Collections (Users, Newsletters, Pages, Ideas) and Globals (Community channels) only. **Custom views registered via `admin.components.views.*` are reachable by URL but do NOT auto-appear in the side nav.** Editors currently have to know the URLs.

Observed 2026-05-14 during Phase 04.1 smoke (`emoadm@gmail.com` super_editor on prod chastnik.eu): side nav shows Users, Newsletters, Pages, Ideas, Globals → Community channels — no Attribution, no Moderation Queue.

## Fix

Add `admin.components.beforeNavLinks` (or `afterNavLinks`) array in `src/payload.config.ts` with two client components that render Link elements to the custom views. Payload v3 docs: <https://payloadcms.com/docs/admin/components#beforenavlinks>

Sketch:

```tsx
// src/app/(payload)/admin/components/AttributionNavLink.tsx
'use client';
import Link from 'next/link';
import bg from '@/../messages/bg.json';

export const AttributionNavLink = () => (
  <Link href="/admin/views/attribution" className="nav__link">
    {bg.attribution.dashboard.navLabel /* "Атрибуция" */}
  </Link>
);

// src/app/(payload)/admin/components/ModerationQueueNavLink.tsx
'use client';
import Link from 'next/link';
import bg from '@/../messages/bg.json';

export const ModerationQueueNavLink = () => (
  <Link href="/admin/views/moderation-queue" className="nav__link">
    {bg.moderation.queue.navLabel /* "Опашка за модерация" */}
  </Link>
);
```

```ts
// src/payload.config.ts (admin.components)
beforeNavLinks: [
  '/src/app/(payload)/admin/components/AttributionNavLink#AttributionNavLink',
  '/src/app/(payload)/admin/components/ModerationQueueNavLink#ModerationQueueNavLink',
],
```

Both components must respect role gates (only render for editor / super_editor). The simplest approach: render the Link unconditionally but let the view itself enforce role check (which it already does — see `src/app/(payload)/admin/views/moderation-queue/ModerationQueueView.tsx:55` and the analogous attribution gate).

Better: read session in the component and conditionally render. Requires investigating Payload's auth-context access from custom client components.

## Implementation cost

~30 min: write 2 client components + add 2 i18n keys (`attribution.dashboard.navLabel`, `moderation.queue.navLabel`) + update `importMap.js` (regen via Payload CLI: `pnpm payload generate:importmap`) + deploy.

## Why not done in Phase 04.1

Phase 04.1's scope is Payload schema reconciliation (the 2026-05-11 deploy incident root cause). Editor-UX polish is out of scope. Operator can reach both views via direct URL for now; both verified working in Wave 6 smoke.

## Acceptance

- Super_editor session on prod sees "Атрибуция" + "Опашка за модерация" in side nav
- Clicking each lands on the correct view
- Non-editor users see neither link (or the role gate inside the view still shows denial copy — current behaviour preserved)
