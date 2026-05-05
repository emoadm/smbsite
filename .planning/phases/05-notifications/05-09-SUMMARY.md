---
plan: 05-09
phase: 05-notifications
status: complete
tasks_complete: 2
tasks_total: 2
---

# Plan 05-09 Summary — /community Page + Footer Column 4

**Mode:** Inline orchestrator execution.

## What was built

| File | Purpose |
|------|---------|
| `src/components/community/ChannelCard.tsx` | 3-variant card (teaser / redeem / placeholder); title is `<h3>` |
| `src/app/(frontend)/community/page.tsx` | Public RSC page with `dynamic = 'force-dynamic'`, reads CommunityChannels Global + auth() |
| `src/components/layout/Footer.tsx` | Column 4 rebuilt with conditional links matching /community logic |
| `tests/unit/community-page.test.ts` | 20 source-grep contracts (page + ChannelCard + Footer) |
| `tests/e2e/community-page.spec.ts` | Playwright .skip()'d full-flow scaffold for Wave 4 |

## Decisions honored

- **D-10** — Footer Column 4 reads CommunityChannels Global per request; anonymous sees /community fallback, member sees real external URLs.
- **D-11** — Anonymous-side render NEVER includes raw external URLs in HTML; all anonymous CTAs route through `/register?next=/community`.
- **D-12** — `dynamic = 'force-dynamic'` (no caching). Coalition swaps URLs in Payload Global → site reflects immediately, no redeploy. `channelsPending` key preserved as the both-invisible fallback.
- **NOTIF-04 / NOTIF-05** — 4 distinct render states delivered: anon-both-visible, member-both-visible, one-invisible, both-invisible.
- **Heading hierarchy** — Page renders exactly 1× `<h1>` and 1× `<h2>` (the explainer). ChannelCard titles are `<h3>`, so the single-h2 invariant holds in every render state. The Wave 4 e2e assertion `expect(page.locator('h2')).toHaveCount(1)` is correct.
- **Security** — External CTAs use `rel="noopener noreferrer"`; URLs only originate from the CommunityChannels Global (editor/admin write — Plan 05-04 access policy).

## Notable deviations

1. **`findGlobal` cast via `as never`.** The `community-channels` slug is not in the auto-generated Payload types until Wave 3 schema push completes. Same pattern as Plan 05-05 worker.tsx (`'newsletters' as never`). Will be replaced by proper typing post Wave 3.
2. **No `pnpm build` run.** Same reason as Plan 05-07 — Payload generates types from the live DB, which doesn't yet have the Phase 5 globals. Build verification deferred to Wave 3.

## Verification

- `pnpm typecheck` — clean
- `pnpm test:unit` — 323/323 pass across 35 files (was 303 after 05-08; +20 new tests across 1 new file)
- `grep -c "force-dynamic" src/app/(frontend)/community/page.tsx` → 1
- `grep -E "export const revalidate" src/app/(frontend)/community/page.tsx` → empty
- `grep -q "<h3" src/components/community/ChannelCard.tsx` → matches
- `grep -E "<h2[^>]*>\{title\}" src/components/community/ChannelCard.tsx` → empty (heading hierarchy lock)
- `grep -c "whatsappActive\|telegramActive" src/components/layout/Footer.tsx` → 4 (declarations + branches)
- `grep -c "findGlobal" src/components/layout/Footer.tsx` → 1

## Notes for downstream plans

- **Plan 05-11 (Wave 4 e2e)**: un-skip `tests/e2e/community-page.spec.ts` after Wave 3 schema push. Seed CommunityChannels Global in test fixture for the full-flow Playwright tests (3 variants).
- **Coalition deferred**: D-CoalitionChannels in STATE.md unblocks once coalition pastes the real URLs into `/admin/globals/community-channels` and toggles `whatsappVisible`/`telegramVisible` to true — no redeploy needed.

## Commits

- `f0a00d4` — feat(05-09): /community page + ChannelCard + Footer Column 4 conditional links
