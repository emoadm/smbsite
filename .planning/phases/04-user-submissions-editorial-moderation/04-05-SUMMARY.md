---
phase: 04-user-submissions-editorial-moderation
plan: "05"
subsystem: ui
tags: [phase-4, wave-3, public-surface, anonymity, heat-map, n-suppression, drizzle, next-intl, shadcn]

requires:
  - phase: 04-01
    provides: "submissions + moderation_log schema; public/maps/bg-oblasts.svg with 28 BG-NN ISO paths"
  - phase: 04-02
    provides: "Locked i18n keys: submission.proposals.*, problem.heatmap.*, submission.topics.*"
provides:
  - "src/lib/submissions/public-queries.ts — D-C1 whitelist queries + D-D2 N>=5 suppression at DB layer"
  - "src/components/proposals/ProposalCard.tsx — anonymous-byline RSC proposal card"
  - "src/components/problems/OblastMap.tsx — SVG choropleth with quartile density tiers"
  - "src/components/problems/OblastBreakdownTable.tsx — oblast/count/top-topic breakdown table"
  - "src/app/(frontend)/predlozheniya/page.tsx — public proposals page (PROP-04)"
  - "src/app/(frontend)/problemi/page.tsx — public heat-map page (D-D1, D-D2)"
  - "src/components/ui/table.tsx — shadcn Table component (newly installed)"
  - "tests/unit/submission-public-query.test.ts — D-C1 column whitelist guard"
  - "tests/unit/heatmap-suppression.test.ts — D-D2 N>=5 suppression guard"
  - "tests/e2e/proposals-public.spec.ts — D-C1 anonymity E2E audit"
affects:
  - "Phase 04-06 (moderation queue — approves proposals that become visible on /predlozheniya)"
  - "Phase 04-07 (status-change email — notifies submitter when proposal approved/rejected)"
  - "Phase 06 OPS-05 (load test — /problemi with 30-min aggregate cache)"

tech-stack:
  added:
    - "src/components/ui/table.tsx (shadcn Table — was absent from project, created manually)"
  patterns:
    - "D-C1 column whitelist: Drizzle select() with explicit column enumeration excludes all PII"
    - "D-D2 N>=5 suppression: HAVING clause at DB layer, not CSS/React layer"
    - "unstable_cache with 30-min revalidate for non-sensitive aggregates"
    - "TDD: source-level grep tests lock security invariants without DB fixture dependency"
    - "SVG enrichment via regex transform on on-disk asset — no user input reaches dangerouslySetInnerHTML"
    - "Public RSC pages with ISR revalidate (60s proposals, 1800s heat-map) aligned to cache TTL"

key-files:
  created:
    - src/lib/submissions/public-queries.ts
    - src/components/proposals/ProposalCard.tsx
    - src/components/problems/OblastMap.tsx
    - src/components/problems/OblastBreakdownTable.tsx
    - src/app/(frontend)/predlozheniya/page.tsx
    - src/app/(frontend)/problemi/page.tsx
    - src/components/ui/table.tsx
    - tests/unit/submission-public-query.test.ts
    - tests/unit/heatmap-suppression.test.ts
    - tests/e2e/proposals-public.spec.ts
  modified: []

key-decisions:
  - "shadcn table component created manually from canonical shadcn pattern — was not present from Phase 2.1 or earlier plans"
  - "Quartile thresholds are computed dynamically from the non-suppressed count distribution at render time; no hardcoded tier values"
  - "The 'full_name' literal was removed from a doc comment in public-queries.ts to preserve the D-C1 grep assertion in submission-public-query.test.ts (Rule 1 auto-fix)"
  - "E2E spec marked Wave-0-blocked for the 'canonical byline appears' test — it safely skips when zero approved proposals exist (cards count guard)"
  - "OblastMap uses readFileSync on public/maps/bg-oblasts.svg at render time (Node runtime, Server Component) — no NEXT_PUBLIC_ env exposure"

requirements-completed:
  - PROP-04
  - PROB-01
  - PROB-02
  - PROB-03
  - PROB-04

duration: 35min
completed: 2026-05-10
---

# Phase 04 Plan 05: Public Proposals Catalog + Oblast Heat-Map Summary

**Public /predlozheniya and /problemi pages enforcing D-C1 anonymity and D-D2 N>=5 suppression at the Drizzle query layer, backed by source-level unit tests that lock both invariants.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-05-10
- **Tasks:** 3 (Task 1: queries + tests; Task 2: ProposalCard + page; Task 3: OblastMap + table + page)
- **Files created:** 10
- **Files modified:** 0

## Accomplishments

- Built public-queries.ts with strict D-C1 column whitelist (no submitter_id, email, full_name) and D-D2 HAVING count(*) >= 5 at the SQL layer
- Shipped /predlozheniya with ISR=60s, ProposalCard with canonical "Член на коалицията" byline via i18n (no hardcoded Bulgarian copy), and voting-soon alert
- Shipped /problemi with SVG choropleth (quartile density tiers), OblastBreakdownTable, and national-level aggregates; both respect N>=5 suppression at every query
- Source-level TDD unit tests lock D-C1 and D-D2 invariants without requiring a DB fixture

## Task Commits

1. **Task 1 RED** — `b38ea47` (test: D-C1 whitelist + D-D2 suppression failing tests)
2. **Task 1 GREEN** — `47ca742` (feat: public-queries.ts implementation)
3. **Task 1 Fix** — `fb125f0` (fix: remove 'full_name' literal from comment for D-C1 test)
4. **Task 2 RED** — `d911110` (test: E2E proposals-public spec)
5. **Task 2 GREEN** — `b571c62` (feat: ProposalCard + /predlozheniya page)
6. **Task 3 GREEN** — `2933f83` (feat: OblastMap + OblastBreakdownTable + /problemi page)

**Plan metadata:** (this commit)

## Files Created

- `src/lib/submissions/public-queries.ts` — D-C1 whitelist Drizzle queries + D-D2 aggregate with HAVING
- `src/components/proposals/ProposalCard.tsx` — Server Component card with anonymous byline
- `src/components/problems/OblastMap.tsx` — SVG choropleth with quartile density tiers, aria-labels
- `src/components/problems/OblastBreakdownTable.tsx` — shadcn Table with national row pinned at top
- `src/app/(frontend)/predlozheniya/page.tsx` — public proposals page (ISR=60s)
- `src/app/(frontend)/problemi/page.tsx` — public heat-map page (ISR=1800s)
- `src/components/ui/table.tsx` — shadcn Table component (newly added, was absent)
- `tests/unit/submission-public-query.test.ts` — D-C1 invariant guard
- `tests/unit/heatmap-suppression.test.ts` — D-D2 invariant guard
- `tests/e2e/proposals-public.spec.ts` — anonymity audit E2E spec

## Decisions Made

- **shadcn table newly installed:** `src/components/ui/table.tsx` was absent from the project (not added by Phase 2.1 or earlier). Created manually following the canonical shadcn pattern using native HTML elements — no radix-ui dependency.
- **Quartile thresholds at first deploy:** Thresholds are dynamic (computed from the live non-suppressed count distribution). On first deploy with zero suppressed oblasts the tier is identical for all visible oblasts; tiers diverge as data accumulates. Operators should interpret the map color scale as relative density within the visible set, not absolute thresholds.
- **No drift from UI-SPEC §S2 4-tier scale:** All four tiers (fill-secondary/40, fill-secondary/70, fill-primary/60, fill-primary) are implemented exactly per UI-SPEC. Deviation: none.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed 'full_name' literal from doc comment to preserve D-C1 test assertion**
- **Found during:** Task 1 (verification of acceptance criteria after writing public-queries.ts)
- **Issue:** The plan's template included the comment `No submitter_id. No full_name. No email.` The test `submission-public-query.test.ts` asserts `expect(src).not.toMatch(/full_name/)` — so this literal in a comment would cause the test to fail even though `full_name` is not selected anywhere in code
- **Fix:** Rewrote the comment to `No submitter PII columns: submitter_id, name, email, sector, role are excluded.` — no functional change
- **Files modified:** src/lib/submissions/public-queries.ts
- **Commit:** fb125f0

---

**Total deviations:** 1 auto-fixed (Rule 1 — comment wording caused test false failure)
**Impact on plan:** Zero scope change. The fix is a one-line comment rewrite; no logic changed.

## Known Stubs

None — all data is wired to live Drizzle queries. Empty states are handled by conditional rendering, not placeholder data.

## Threat Flags

No new security surface beyond what is documented in the plan's STRIDE register (T-04-05-01 through T-04-05-06). All HIGH-severity threats are mitigated:

- T-04-05-01 (D-C1 PII leak): Drizzle column whitelist + grep-locked unit test + TypeScript type
- T-04-05-02 (D-D2 small-N): HAVING count(*) >= 5 at SQL layer + grep-locked unit test
- T-04-05-03 (SVG XSS via dangerouslySetInnerHTML): SVG from controlled on-disk asset, no user input

## Self-Check

| Check | Result |
|-------|--------|
| src/lib/submissions/public-queries.ts exists | FOUND |
| src/components/proposals/ProposalCard.tsx exists | FOUND |
| src/components/problems/OblastMap.tsx exists | FOUND |
| src/components/problems/OblastBreakdownTable.tsx exists | FOUND |
| src/app/(frontend)/predlozheniya/page.tsx exists | FOUND |
| src/app/(frontend)/problemi/page.tsx exists | FOUND |
| src/components/ui/table.tsx exists | FOUND |
| tests/unit/submission-public-query.test.ts exists | FOUND |
| tests/unit/heatmap-suppression.test.ts exists | FOUND |
| tests/e2e/proposals-public.spec.ts exists | FOUND |
| D-C1: submissions.submitter_id not in public-queries.ts | CONFIRMED (grep=0) |
| D-D2: having(sql\`count(*) >= 5\`) in public-queries.ts | CONFIRMED (grep=1) |
| Canonical byline via i18n only (no hardcode in ProposalCard) | CONFIRMED (grep=0) |
| pnpm tsc --noEmit | PASSED (no output) |
| Task commits b38ea47..2933f83 | FOUND in git log |
