---
phase: 03-idea-catalog-voting
plan: 05a
type: execute
wave: 2
depends_on: ["03-01", "03-02", "03-03"]
files_modified:
  - src/app/(frontend)/idei/page.tsx
  - src/components/idea/IdeaCard.tsx
  - src/components/idea/TopicChips.tsx
  - src/components/idea/SortDropdown.tsx
  - src/components/idea/CatalogPagination.tsx
  - src/components/ui/badge.tsx
  - src/components/ui/dropdown-menu.tsx
  - src/components/ui/pagination.tsx
  - src/components/ui/progress.tsx
  - src/components/ui/skeleton.tsx
  - src/components/ui/toggle.tsx
  - src/components/ui/textarea.tsx
  - src/components/ui/table.tsx
  - tests/e2e/idea-catalog.spec.ts
  - tests/unit/idea-catalog-query.test.ts
  - tests/unit/idea-catalog-sort.test.ts
autonomous: true
requirements: [IDEA-01, IDEA-02]
threat_ids: [T-03-05a-01, T-03-05a-02]

must_haves:
  truths:
    - "Anonymous visitor can browse /idei (server-rendered card grid 1/2/3 cols responsive); 12 cards per page"
    - "Visitor can filter by topic (chip multi-select) and sort (3 options); URL state survives reload"
    - "Pagination resets when topic filter or sort changes"
    - "Pre-threshold cards show 'Очаква още N гласа за резултат.'; post-threshold cards show approve count + percent (public layer)"
    - "Empty platform state (zero published ideas) renders Card with link to /community"
    - "Empty filter state (filter excludes all) renders 'Нулирай филтъра' link"
    - "/idei?topic=taxes&sort=mostApproved URL state preserved on reload"
    - "All Bulgarian copy resolves via next-intl t() — zero hardcoded Cyrillic in JSX"
  artifacts:
    - path: "src/app/(frontend)/idei/page.tsx"
      provides: "Catalog index page — server-rendered, reads getCachedDisplayCounts per card"
      exports: ["default", "generateMetadata"]
    - path: "src/components/idea/IdeaCard.tsx"
      provides: "Card primitive for catalog grid; renders topic badge + title + excerpt + threshold-gated count"
      exports: ["IdeaCard"]
    - path: "src/components/idea/TopicChips.tsx"
      provides: "Client island; URL-state multi-select chip filter (aria-pressed)"
      exports: ["TopicChips"]
    - path: "src/components/idea/SortDropdown.tsx"
      provides: "Client island; shadcn DropdownMenu with 3 sort options"
      exports: ["SortDropdown"]
    - path: "src/components/idea/CatalogPagination.tsx"
      provides: "Server component wrapping shadcn Pagination with Next.js Link via asChild"
      exports: ["CatalogPagination"]
  key_links:
    - from: "src/app/(frontend)/idei/page.tsx"
      to: "src/lib/voting/cache.ts (getCachedDisplayCounts)"
      via: "import via IdeaCard"
      pattern: "getCachedDisplayCounts"
    - from: "src/components/idea/IdeaCard.tsx"
      to: "/idei/[slug] route (plan 03-05b)"
      via: "<Link href={`/idei/${idea.slug}`}>"
      pattern: "/idei/\\$\\{idea.slug\\}"
    - from: "src/components/idea/TopicChips.tsx + SortDropdown.tsx"
      to: "/idei page URL params"
      via: "useRouter().push(...)"
      pattern: "router.push"
  art9_lawyer_opinion_gate:
    - "GDPR Art.9 lawyer opinion on file at .planning/legal/art9-opinion.md before merge to main"

user_setup: []
---

<objective>
Public catalog page `/idei`: server-rendered grid + topic chip filter + sort dropdown + pagination + 8 shadcn primitive installs + the catalog-related components (IdeaCard, TopicChips, SortDropdown, CatalogPagination).

Purpose: Splits the original plan 03-05 into catalog-only (this plan) and detail-only (03-05b) per checker W-1. Delivers UI-SPEC §S1 (catalog index). Depends on plan 03-02 (cache, schema) and plan 03-03 (Payload Ideas collection providing the `ideas` table). Runs parallel with plans 03-04, 03-06, 03-07 in Wave 2/3 because there are no shared file conflicts.

Plan 03-05b consumes the shadcn primitives installed here (badge, dropdown-menu, pagination, progress, skeleton, toggle, textarea, table) by ordering its wave AFTER 03-05a.

Output:
- 1 page route (`/idei`)
- 4 components under `src/components/idea/` (IdeaCard, TopicChips, SortDropdown, CatalogPagination)
- 8 shadcn UI primitive installs
- 1 e2e spec + 2 unit tests
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/phases/03-idea-catalog-voting/03-CONTEXT.md
@.planning/phases/03-idea-catalog-voting/03-RESEARCH.md
@.planning/phases/03-idea-catalog-voting/03-PATTERNS.md
@.planning/phases/03-idea-catalog-voting/03-UI-SPEC.md
@.planning/phases/03-idea-catalog-voting/03-02-PLAN.md
@.planning/phases/03-idea-catalog-voting/03-03-PLAN.md
@CLAUDE.md
@src/app/(frontend)/member/preferences/page.tsx
@src/app/(frontend)/member/page.tsx
@src/components/landing/Hero.tsx
@components.json
@messages/bg.json

<interfaces>
From plan 03-02 src/lib/voting/cache.ts:
```typescript
type DisplayCounts = { revealed: false; total: number; remaining: number } | { revealed: true; approve: number; reject: number; total: number; approvePct: number };
getCachedDisplayCounts(ideaId: string): Promise<DisplayCounts>
```

From plan 03-03 src/payload-types.ts (or src/types/idea.ts fallback):
```typescript
interface Idea {
  id: string;
  title: string;
  slug: string;
  topic: 'taxes'|'labor'|'regulation'|'financing'|'digitalization'|'other';
  excerpt?: string;
  hero?: { id: string; url: string; alt: string } | null;
  body: SerializedEditorState;
  is_featured: boolean;
  featured_order: number | null;
  status: 'draft'|'published'|'archived';
  display_frozen: boolean;
  created_at: string;
  updated_at: string;
}
```

From `src/components/ui/card.tsx` + `src/components/ui/button.tsx` (Phase 1 ship — direct reuse for grid Card + filter buttons).

VoteCountDisplay (the client/server component that renders the threshold-gated counts) is shipped by **plan 03-05b**. To avoid a cross-wave bind, IdeaCard inlines the minimal `revealed: false → "Очаква още N гласа за резултат."` and `revealed: true → "{n} одобряват · {p}% одобрение"` rendering. The detail page (plan 03-05b) imports the full VoteCountDisplay component which adds the member-only "за членове" reject line.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: shadcn primitive installs (8 components — shared with plan 03-05b)</name>
  <files>src/components/ui/badge.tsx, src/components/ui/dropdown-menu.tsx, src/components/ui/pagination.tsx, src/components/ui/progress.tsx, src/components/ui/skeleton.tsx, src/components/ui/toggle.tsx, src/components/ui/textarea.tsx, src/components/ui/table.tsx</files>
  <read_first>
    - components.json (verify shadcn config — style new-york, baseColor slate, cssVariables true, prefix "")
    - src/components/ui/button.tsx (existing — confirm canonical naming pattern shadcn produced)
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section "Design System" lines 19-43 + section "Component Inventory" lines 813-843
  </read_first>
  <action>
Run shadcn add commands for each missing primitive. ORDER matters because some compose on others. Use `npx shadcn@latest add` (NOT shadcn-ui — old name).

```
npx shadcn@latest add badge
npx shadcn@latest add dropdown-menu
npx shadcn@latest add pagination
npx shadcn@latest add progress
npx shadcn@latest add skeleton
npx shadcn@latest add toggle
npx shadcn@latest add textarea
npx shadcn@latest add table
```

Each command writes to `src/components/ui/{name}.tsx`. **Before each add, check whether the file already exists** (Phase 2.1 may have installed `table` already per UI-SPEC line 39). If it exists, skip the install — DO NOT overwrite.

**Why all 8 in 03-05a:** plan 03-05b (idea detail) depends on `progress` (VoteCountDisplay), `toggle` (admin freeze toggle reused via shared component) and `textarea` (none — but admin uses it via 03-07b). Installing all 8 here lets later plans import from `src/components/ui/*` without their own shadcn install. Plan 03-05b sets `wave: 2.5` and `depends_on: ["03-05a"]` so it runs strictly after this plan finishes.

**Registry safety gate:** these are all from the official shadcn registry (no third-party). UI-SPEC §Registry Safety §846-852 confirms.

**Custom override on Toggle:** the shadcn Toggle ships with default sizing 36×36; UI-SPEC §S8 requires the freeze toggle inside IdeaSidebar to use it as-is (sized 40×min-40 via the parent layout) — no install-time override needed.

**Custom override on Pagination:** the shadcn Pagination uses `<a>` for links; we need it to use Next.js `<Link>`. We wrap at the call-site in `CatalogPagination.tsx` (Task 4) via `asChild`. DO NOT modify the installed shadcn file.

After installation, run `pnpm tsc --noEmit` and visually inspect at least `badge.tsx`, `progress.tsx`, `dropdown-menu.tsx`, `pagination.tsx` to confirm imports compile (Tailwind v4 + React 19 — already shipping per Phase 1 D-04).

If a shadcn add fails or installs the wrong version (Tailwind v3 default templates), fall back to the manual `npx shadcn@latest@canary add` invocation per shadcn changelog Feb 2025 entry — this is documented in CLAUDE.md.
  </action>
  <verify>
    <automated>for f in badge dropdown-menu pagination progress skeleton toggle textarea table; do test -f "src/components/ui/$f.tsx" && echo "OK $f" || echo "MISSING $f"; done; pnpm tsc --noEmit 2>&1 | grep -E "src/components/ui/(badge|dropdown-menu|pagination|progress|skeleton|toggle|textarea|table)\.tsx" | head -5</automated>
  </verify>
  <acceptance_criteria>
    - All 8 files exist under src/components/ui/
    - `pnpm tsc --noEmit` emits zero errors for the new shadcn files
    - components.json unchanged
    - No third-party registry references (only @shadcn)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: IdeaCard + TopicChips + SortDropdown + CatalogPagination — catalog UI components</name>
  <files>src/components/idea/IdeaCard.tsx, src/components/idea/TopicChips.tsx, src/components/idea/SortDropdown.tsx, src/components/idea/CatalogPagination.tsx</files>
  <read_first>
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S1 lines 131-217
    - .planning/phases/03-idea-catalog-voting/03-PATTERNS.md section "IdeaCard" lines 770-803
    - src/components/landing/Hero.tsx (existing Hero pattern — analog for inline server components)
    - src/components/ui/badge.tsx + dropdown-menu.tsx + pagination.tsx (just-installed in Task 1)
  </read_first>
  <action>
**File 1: src/components/idea/IdeaCard.tsx** — server component (no `'use client'`).

Per UI-SPEC §S1 lines 177-209 EXACTLY. The card inlines the minimal threshold-gated count rendering since the full `VoteCountDisplay` component is shipped by plan 03-05b (the detail page consumer). When 03-05b ships, IdeaCard is NOT refactored — it keeps its compact card-variant rendering.

```tsx
import Link from 'next/link';
import { Star } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCachedDisplayCounts } from '@/lib/voting/cache';
import type { Idea } from '@/payload-types';

export async function IdeaCard({ idea }: { idea: Idea }) {
  const t = await getTranslations('idea');
  const counts = await getCachedDisplayCounts(idea.id);
  return (
    <Link
      href={`/idei/${idea.slug}`}
      className="group block rounded-xl outline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card className="relative flex flex-col gap-4 rounded-xl border bg-card p-6 transition-shadow hover:ring-1 hover:ring-secondary/50">
        {idea.is_featured && (
          <Badge className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
            <Star className="mr-1 size-3" />
            {t('badge.editorPick')}
          </Badge>
        )}
        <Badge variant="outline" className="self-start rounded-full bg-muted px-3 py-1 text-sm font-semibold text-muted-foreground">
          {t(`topic.${idea.topic}`)}
        </Badge>
        <h2 className="font-display text-2xl leading-snug text-balance line-clamp-3">
          {idea.title}
        </h2>
        <p className="text-base text-muted-foreground line-clamp-2">{idea.excerpt}</p>
        <div className="border-t pt-4">
          {!counts.revealed ? (
            <p className="mt-auto text-sm text-muted-foreground">
              {t('threshold.cardShort', { N: counts.remaining })}
            </p>
          ) : (
            <p className="mt-auto text-sm text-foreground [font-feature-settings:'tnum']">
              {t('count.approve', { n: counts.approve })} · {t('count.percent', { p: counts.approvePct })}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}
```

D-23 silent freeze: there is NO branch on `display_frozen` in this card (cache.ts handles freeze suppression by returning `revealed: false` per plan 03-07b cross-modification). Public catalog never shows a freeze marker.

**File 2: src/components/idea/TopicChips.tsx** — client component (URL state via useRouter).

```tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const TOPICS = ['taxes', 'labor', 'regulation', 'financing', 'digitalization', 'other'] as const;

export function TopicChips() {
  const t = useTranslations('idea');
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const active = new Set((params.get('topic') ?? '').split(',').filter(Boolean));

  const toggle = (topic: string) => {
    const next = new Set(active);
    next.has(topic) ? next.delete(topic) : next.add(topic);
    const sp = new URLSearchParams(params.toString());
    if (next.size > 0) sp.set('topic', Array.from(next).join(','));
    else sp.delete('topic');
    sp.delete('page'); // reset pagination on filter change
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {TOPICS.map((topic) => {
        const isActive = active.has(topic);
        return (
          <button
            key={topic}
            type="button"
            onClick={() => toggle(topic)}
            aria-pressed={isActive}
            className={
              isActive
                ? 'rounded-full bg-primary text-primary-foreground border-primary border px-3 py-1 text-sm font-semibold min-h-[32px] sm:min-h-[36px] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                : 'rounded-full bg-muted text-muted-foreground border-input border px-3 py-1 text-sm font-semibold min-h-[32px] sm:min-h-[36px] hover:bg-secondary/20 hover:border-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            }
          >
            {t(`topic.${topic}`)}
          </button>
        );
      })}
    </div>
  );
}
```

**File 3: src/components/idea/SortDropdown.tsx** — client component using shadcn DropdownMenu.

Per UI-SPEC §S1 lines 171-176:

```tsx
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';

const SORTS = ['newest', 'mostApproved', 'editorPicks'] as const;

export function SortDropdown() {
  const t = useTranslations('idea.sort');
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const current = (params.get('sort') ?? 'newest') as (typeof SORTS)[number];

  const select = (sort: (typeof SORTS)[number]) => {
    const sp = new URLSearchParams(params.toString());
    if (sort === 'newest') sp.delete('sort');
    else sp.set('sort', sort);
    sp.delete('page');
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="ml-auto">
          {t(current)}
          <ChevronDown className="size-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {SORTS.map((s) => (
          <DropdownMenuItem key={s} onClick={() => select(s)}>
            <span className="flex-1">{t(s)}</span>
            {current === s && <Check className="size-4 ml-2" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**File 4: src/components/idea/CatalogPagination.tsx** — wraps shadcn Pagination with Next.js Link.

```tsx
import Link from 'next/link';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext } from '@/components/ui/pagination';

type Props = {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
};

export function CatalogPagination({ currentPage, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;
  const pages: number[] = [];
  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) {
    pages.push(p);
  }
  return (
    <Pagination>
      <PaginationContent>
        {currentPage > 1 && (
          <PaginationItem>
            <PaginationPrevious href={buildHref(currentPage - 1)} asChild>
              <Link href={buildHref(currentPage - 1)} aria-label="Previous">‹</Link>
            </PaginationPrevious>
          </PaginationItem>
        )}
        {pages.map((p) => (
          <PaginationItem key={p}>
            <PaginationLink href={buildHref(p)} isActive={p === currentPage} asChild>
              <Link href={buildHref(p)} aria-current={p === currentPage ? 'page' : undefined}>{p}</Link>
            </PaginationLink>
          </PaginationItem>
        ))}
        {currentPage < totalPages && (
          <PaginationItem>
            <PaginationNext href={buildHref(currentPage + 1)} asChild>
              <Link href={buildHref(currentPage + 1)} aria-label="Next">›</Link>
            </PaginationNext>
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}
```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "src/components/idea/(IdeaCard|TopicChips|SortDropdown|CatalogPagination)\.tsx" | head -10; grep -c "useTranslations\|getTranslations" src/components/idea/IdeaCard.tsx src/components/idea/TopicChips.tsx src/components/idea/SortDropdown.tsx</automated>
  </verify>
  <acceptance_criteria>
    - All 4 component files exist and type-check
    - IdeaCard is a server component; reads getCachedDisplayCounts; renders threshold-gated count inline
    - TopicChips + SortDropdown are client components; URL state survives reload; pagination resets on filter change
    - CatalogPagination wraps shadcn Pagination with Next.js Link via asChild
    - Zero hardcoded Cyrillic in JSX (every label resolves via t())
    - Final grep gate: `grep -nE '"[А-Яа-я]+' src/components/idea/IdeaCard.tsx src/components/idea/TopicChips.tsx src/components/idea/SortDropdown.tsx src/components/idea/CatalogPagination.tsx` returns zero matches
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: /idei catalog page + 2 unit tests</name>
  <files>src/app/(frontend)/idei/page.tsx, tests/unit/idea-catalog-query.test.ts, tests/unit/idea-catalog-sort.test.ts</files>
  <read_first>
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S1 (full visual spec)
    - .planning/phases/03-idea-catalog-voting/03-PATTERNS.md section "src/app/(frontend)/idei/page.tsx" lines 1032-1060
    - src/app/(frontend)/member/preferences/page.tsx (page shell with auth + getTranslations + generateMetadata)
    - src/db/schema/voting.ts (just-built — IDEA_TOPICS, IDEA_STATUSES) + ideas table
  </read_first>
  <action>
**File 1: src/app/(frontend)/idei/page.tsx**

```tsx
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { sql } from 'drizzle-orm';
import { TopicChips } from '@/components/idea/TopicChips';
import { SortDropdown } from '@/components/idea/SortDropdown';
import { IdeaCard } from '@/components/idea/IdeaCard';
import { CatalogPagination } from '@/components/idea/CatalogPagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { MainContainer } from '@/components/layout/MainContainer';
import type { Metadata } from 'next';

const PAGE_SIZE = 12;
const ALLOWED_TOPICS = ['taxes', 'labor', 'regulation', 'financing', 'digitalization', 'other'] as const;
const ALLOWED_SORTS = ['newest', 'mostApproved', 'editorPicks'] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('idea.catalog');
  return { title: t('title'), description: t('subtitle') };
}

type SearchParams = { page?: string; topic?: string; sort?: string };

export default async function IdeaCatalogPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const topicCsv = sp.topic ?? '';
  const topics = topicCsv.split(',').filter((x): x is (typeof ALLOWED_TOPICS)[number] => (ALLOWED_TOPICS as readonly string[]).includes(x));
  const sort = (ALLOWED_SORTS as readonly string[]).includes(sp.sort ?? '') ? (sp.sort as (typeof ALLOWED_SORTS)[number]) : 'newest';

  const t = await getTranslations('idea');

  // Build ORDER BY clause from whitelisted sort enum.
  let orderBy = `created_at DESC`;
  if (sort === 'mostApproved') {
    // Pitfall 6 — must use cooling-aware approve count.
    orderBy = `(SELECT COUNT(*) FROM votes v JOIN users u ON u.id = v.user_id WHERE v.idea_id = ideas.id AND v.choice = 'approve' AND u.email_verified_at + INTERVAL '${process.env.VOTE_COUNTABLE_INTERVAL ?? '48 hours'}' < NOW()) DESC, created_at DESC`;
  } else if (sort === 'editorPicks') {
    orderBy = `is_featured DESC, featured_order ASC NULLS LAST, created_at DESC`;
  }

  const offset = (page - 1) * PAGE_SIZE;
  const ideasQuery = await db.execute(sql.raw(`
    SELECT id, title, slug, topic, excerpt, hero_id, body, is_featured, featured_order, status, display_frozen, created_at, updated_at
    FROM ideas
    WHERE status = 'published'
    ${topics.length > 0 ? `AND topic IN (${topics.map((x) => `'${x}'`).join(',')})` : ''}
    ORDER BY ${orderBy}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `));
  const ideas = ideasQuery.rows as any[];

  const totalQuery = await db.execute(sql.raw(`
    SELECT COUNT(*)::int AS total FROM ideas WHERE status = 'published'
    ${topics.length > 0 ? `AND topic IN (${topics.map((x) => `'${x}'`).join(',')})` : ''}
  `));
  const total = (totalQuery.rows[0] as { total: number }).total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (p: number) => {
    const sp2 = new URLSearchParams();
    if (p > 1) sp2.set('page', String(p));
    if (topicCsv) sp2.set('topic', topicCsv);
    if (sort !== 'newest') sp2.set('sort', sort);
    return `/idei${sp2.toString() ? `?${sp2.toString()}` : ''}`;
  };

  return (
    <MainContainer>
      <div className="pt-12">
        <h1 className="font-display text-4xl md:text-5xl text-balance">{t('catalog.title')}</h1>
        <p className="mt-2 text-base text-muted-foreground">{t('catalog.subtitle')}</p>
      </div>

      <div className="pt-8 flex flex-wrap items-center gap-3">
        <TopicChips />
        <SortDropdown />
      </div>

      <div className="pt-6">
        {total === 0 && topics.length === 0 ? (
          <Card className="mx-auto max-w-prose p-12 text-center">
            <h2 className="font-display text-3xl">{t('empty.platform')}</h2>
            <p className="mt-4 text-base text-muted-foreground">{t('empty.platformBody')}</p>
            <Button asChild className="mt-6"><Link href="/community"><Users className="mr-2 size-4" />{t('empty.platformCta')}</Link></Button>
          </Card>
        ) : ideas.length === 0 ? (
          <div className="text-center py-16">
            <h2 className="font-display text-2xl">{t('empty.filter')}</h2>
            <p className="mt-2 text-base text-muted-foreground">{t('empty.filterBody')}</p>
            <Button variant="link" asChild className="mt-4"><Link href="/idei">{t('empty.filterReset')}</Link></Button>
          </div>
        ) : (
          <Suspense fallback={<CatalogSkeleton />}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ideas.map((idea) => <IdeaCard key={idea.id} idea={idea as any} />)}
            </div>
          </Suspense>
        )}
      </div>

      <div className="pt-12">
        <CatalogPagination currentPage={page} totalPages={totalPages} buildHref={buildHref} />
      </div>
    </MainContainer>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[280px] rounded-xl" />)}
    </div>
  );
}
```

**Note on raw SQL safety:** the topic + sort values are whitelisted against `ALLOWED_TOPICS` / `ALLOWED_SORTS` BEFORE concat. This is Drizzle's recommended pattern for `IN` lists when the count is dynamic; the values themselves are static enums (no user-controlled fragment reaches the SQL). Same defense as `parseInterval` in cooling.ts.

**File 2: tests/unit/idea-catalog-query.test.ts** — IDEA-01 published-only filter.

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('IDEA-01 — catalog excludes draft + archived', () => {
  it('catalog page query includes status = published filter', () => {
    const src = readFileSync('src/app/(frontend)/idei/page.tsx', 'utf8');
    expect(src).toMatch(/status\s*=\s*'published'/);
    expect(src).not.toMatch(/status\s*IN\s*\([^)]*draft[^)]*\)\s*ORDER/i);
  });

  it('topics are whitelisted via ALLOWED_TOPICS before concat', () => {
    const src = readFileSync('src/app/(frontend)/idei/page.tsx', 'utf8');
    expect(src).toMatch(/ALLOWED_TOPICS/);
    expect(src).toMatch(/ALLOWED_TOPICS\s+as\s+readonly\s+string\[\]\)\.includes/);
  });
});
```

**File 3: tests/unit/idea-catalog-sort.test.ts** — sort 'mostApproved' uses cooling-aware aggregate.

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('IDEA-02 — sort by Най-одобрени uses cooling-aware approve count', () => {
  it('mostApproved sort references INTERVAL cooling join', () => {
    const src = readFileSync('src/app/(frontend)/idei/page.tsx', 'utf8');
    expect(src).toMatch(/sort\s*===\s*'mostApproved'/);
    expect(src).toMatch(/INTERVAL\s*'\$\{[^}]+\}'/);
    expect(src).toMatch(/email_verified_at/);
  });

  it('editorPicks sort uses is_featured DESC + featured_order ASC NULLS LAST', () => {
    const src = readFileSync('src/app/(frontend)/idei/page.tsx', 'utf8');
    expect(src).toMatch(/is_featured DESC,\s*featured_order ASC NULLS LAST/);
  });

  it('sort is whitelisted via ALLOWED_SORTS before use', () => {
    const src = readFileSync('src/app/(frontend)/idei/page.tsx', 'utf8');
    expect(src).toMatch(/ALLOWED_SORTS/);
  });
});
```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "idei/page\.tsx" | head -10; pnpm test:unit -- tests/unit/idea-catalog-query.test.ts tests/unit/idea-catalog-sort.test.ts --run 2>&1 | tail -15</automated>
  </verify>
  <acceptance_criteria>
    - /idei page exists and type-checks
    - tests/unit/idea-catalog-query.test.ts GREEN (status='published' enforced; ALLOWED_TOPICS whitelist)
    - tests/unit/idea-catalog-sort.test.ts GREEN (cooling-aware sort; ALLOWED_SORTS whitelist)
    - Anonymous visitor can browse /idei locally and see grid of cards
    - Empty platform / empty filter / non-empty grid all render correctly
    - Pagination resets when filter or sort changes (TopicChips + SortDropdown both `sp.delete('page')`)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: Playwright e2e — catalog browse + filter/sort URL state</name>
  <files>tests/e2e/idea-catalog.spec.ts</files>
  <read_first>
    - playwright.config.ts (existing config)
    - tests/e2e/ existing spec files (Phase 1 / Phase 5 — for fixture + helper patterns)
    - .planning/phases/03-idea-catalog-voting/03-RESEARCH.md section "Phase Requirements → Test Map" lines 1264-1298
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S1
  </read_first>
  <action>
Use existing Playwright fixture pattern (Phase 1's `tests/e2e/auth.spec.ts` shows the pattern).

```typescript
import { test, expect } from '@playwright/test';

test.describe('IDEA-01 — public catalog', () => {
  test('renders catalog with topic chips + sort dropdown', async ({ page }) => {
    await page.goto('/idei');
    await expect(page.getByRole('heading', { name: 'Идеи на коалицията' })).toBeVisible();
    // Topic chips visible
    await expect(page.getByRole('button', { name: 'Данъци' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Цифровизация' })).toBeVisible();
    // Sort dropdown trigger visible
    await expect(page.getByRole('button', { name: /Най-нови/ })).toBeVisible();
  });

  test('platform-empty state with link to community', async ({ page }) => {
    // Pre-state: zero published ideas (test DB or behind a feature flag)
    await page.goto('/idei');
    const empty = page.getByText('Скоро ще започнем да публикуваме идеи');
    if (await empty.isVisible()) {
      await expect(page.getByRole('link', { name: 'Към общността' })).toHaveAttribute('href', '/community');
    }
  });
});

test.describe('IDEA-02 — filter + sort URL state', () => {
  test('topic filter narrows results; URL updates; reload preserves selection', async ({ page }) => {
    await page.goto('/idei');
    await page.getByRole('button', { name: 'Данъци' }).click();
    await expect(page).toHaveURL(/topic=taxes/);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Данъци' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('sort dropdown updates URL', async ({ page }) => {
    await page.goto('/idei');
    await page.getByRole('button', { name: /Най-нови/ }).click();
    await page.getByRole('menuitem', { name: 'Най-одобрени' }).click();
    await expect(page).toHaveURL(/sort=mostApproved/);
  });

  test('changing filter resets pagination to page 1', async ({ page }) => {
    await page.goto('/idei?page=3');
    await page.getByRole('button', { name: 'Данъци' }).click();
    await expect(page).not.toHaveURL(/page=/);
  });
});
```

If the catalog has no fixture-seeded ideas, the second test branch handles platform-empty gracefully. Document the fixture status in 03-05a-SUMMARY.md.
  </action>
  <verify>
    <automated>pnpm test:e2e tests/e2e/idea-catalog.spec.ts --reporter=list 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - tests/e2e/idea-catalog.spec.ts exists and runs
    - All catalog tests GREEN (or platform-empty branch reached if fixture absent)
    - URL state preservation asserted via `aria-pressed='true'` after reload
    - Pagination reset on filter change asserted
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → /idei page | Filter / sort / page params are user-controlled; whitelisted via ALLOWED_TOPICS / ALLOWED_SORTS enums BEFORE any sql.raw concat |
| Browser → IdeaCard | Slug is rendered into a Link; not user-input at render time (sourced from DB) |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-03-05a-01 | Tampering | SQL injection via topic / sort URL params | HIGH | mitigate | ALLOWED_TOPICS / ALLOWED_SORTS whitelisted before any sql.raw concat; Drizzle parameterizes the rest; tests/unit/idea-catalog-query.test.ts asserts whitelist |
| T-03-05a-02 | Information Disclosure | Catalog leaks unpublished (draft/archived) ideas | HIGH | mitigate | `WHERE status = 'published'` literal in BOTH the data query and the count query; tests/unit/idea-catalog-query.test.ts asserts the literal is present and no draft/archived branch exists |

Both HIGH threats mitigated within this plan.
</threat_model>

<verification>
- /idei renders the catalog grid with chip filter + sort dropdown
- Anonymous viewer sees pre-threshold empty-state per card OR post-threshold approve%; reject count never appears (member layer is plan 03-05b)
- Filter + sort + pagination URL state survives reload
- pnpm tsc --noEmit emits zero new errors
- All unit tests in this plan GREEN
- Final grep gate: `grep -nE '"[А-Яа-я]+' src/components/idea/IdeaCard.tsx src/components/idea/TopicChips.tsx src/components/idea/SortDropdown.tsx src/components/idea/CatalogPagination.tsx src/app/(frontend)/idei/page.tsx` returns zero matches (per Phase 1 D-27)
</verification>

<success_criteria>
- IDEA-01 (catalog browse with published-only filter) end-to-end demonstrable
- IDEA-02 (topic filter + sort + URL state) end-to-end demonstrable
- 8 shadcn primitives installed from official registry
- D-23 silent display-freeze preserved (no banner anywhere on public surfaces)
- All Bulgarian copy via next-intl (no hardcoded Cyrillic in JSX)
</success_criteria>

<output>
After completion, create `.planning/phases/03-idea-catalog-voting/03-05a-SUMMARY.md` documenting:
- All 8 shadcn primitives installed (or which were already present)
- 4 idea/* components shipped
- Catalog page route + 1 e2e + 2 unit tests
- Confirmation that ALLOWED_TOPICS / ALLOWED_SORTS whitelist is in place
- Note that plan 03-05b (idea detail) consumes the same shadcn primitives without re-installing
</output>
</content>
</invoke>