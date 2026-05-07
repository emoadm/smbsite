---
phase: 03-idea-catalog-voting
plan: 05b
type: execute
wave: 2.5
depends_on: ["03-01", "03-02", "03-03", "03-04", "03-05a"]
files_modified:
  - src/app/(frontend)/idei/[slug]/page.tsx
  - src/components/idea/IdeaDetail.tsx
  - src/components/idea/VoteButtons.tsx
  - src/components/idea/VoteCountDisplay.tsx
  - src/components/idea/RetractToast.tsx
  - src/components/idea/TurnstileChallenge.tsx
  - tests/e2e/idea-vote.spec.ts
  - tests/e2e/retract-undo.spec.ts
  - tests/e2e/vote-rate-limit.spec.ts
  - tests/e2e/vote-display.spec.ts
  - tests/unit/idea-cache-no-bust.test.ts
autonomous: true
requirements: [IDEA-03, IDEA-05, IDEA-06, IDEA-08]
threat_ids: [T-03-05b-01, T-03-05b-02, T-03-05b-03, T-03-05b-04]

must_haves:
  truths:
    - "Visitor can open /idei/{slug} and read the full Lexical body (with optional 16:9 hero)"
    - "Below threshold: counts hidden; copy 'Гласуването е в ход — резултатите ще се покажат след първите N гласа.'"
    - "Above threshold: public sees approve count + percent; member sees ALSO reject count with 'за членове' pill"
    - "Member with email-verified clicks Одобрявам / Не одобрявам; vote casts (or changes); aria-pressed flips"
    - "Member retract → Sonner toast 'Гласът ти е оттеглен. [Отмени]' (5-sec undo) → undo restores prev choice"
    - "Soft rate-limit triggers Turnstile widget inline; hard rate-limit shows destructive Alert"
    - "/idei/{slug}?preview=draft renders draft only when editor session present; otherwise 404"
    - "Server Actions castVote/retractVote/undoRetract MUST NOT call revalidatePath/revalidateTag (D-03)"
    - "Display-freeze on idea is silent on public surface (D-23) — counts simply read as 'not yet revealed'"
  artifacts:
    - path: "src/app/(frontend)/idei/[slug]/page.tsx"
      provides: "Idea detail page — Lexical render + count + buttons + draft preview gate"
      exports: ["default", "generateMetadata"]
    - path: "src/components/idea/IdeaDetail.tsx"
      provides: "Server component — hero + Lexical body + VoteCountDisplay + VoteButtons composition"
      exports: ["IdeaDetail"]
    - path: "src/components/idea/VoteButtons.tsx"
      provides: "Client island; aria-pressed toggle pair; useTransition; Sonner integration; Turnstile inline render on soft-block"
      contains: "aria-pressed"
    - path: "src/components/idea/VoteCountDisplay.tsx"
      provides: "Threshold-gated count + role-layered display (public vs member)"
      contains: "за членове"
    - path: "src/components/idea/RetractToast.tsx"
      provides: "Sonner toast wrapper for 5-sec undo window"
      contains: "duration: 5000"
    - path: "src/components/idea/TurnstileChallenge.tsx"
      provides: "Inline Cloudflare Turnstile widget mount; reuses Phase 1 D-05 widget pattern"
      exports: ["TurnstileChallenge"]
  key_links:
    - from: "src/app/(frontend)/idei/[slug]/page.tsx"
      to: "src/lib/voting/cache.ts (getCachedDisplayCounts via IdeaDetail)"
      via: "import inside IdeaDetail server component"
      pattern: "getCachedDisplayCounts"
    - from: "src/components/idea/VoteButtons.tsx"
      to: "src/app/actions/cast-vote.ts + retract-vote.ts + undo-retract.ts"
      via: "import { castVote } / retractVote / undoRetract"
      pattern: "from '@/app/actions/cast-vote'"
    - from: "src/app/(frontend)/idei/[slug]/page.tsx Lexical body"
      to: "src/lib/newsletter/lexical-to-html.ts"
      via: "renderLexicalToHtml(idea.body)"
      pattern: "renderLexicalToHtml"
  art9_lawyer_opinion_gate:
    - "GDPR Art.9 lawyer opinion on file at .planning/legal/art9-opinion.md before merge to main"

user_setup: []
---

<objective>
Idea detail page `/idei/{slug}` + the vote interaction core (VoteButtons, VoteCountDisplay, RetractToast, TurnstileChallenge) + the IdeaDetail composition + 4 e2e specs + 1 unit test.

Purpose: Splits the original plan 03-05 into catalog-only (03-05a) and detail-only (this plan) per checker W-1. Delivers UI-SPEC §S2/S3/S4 (idea detail + vote buttons + count display). Depends on plan 03-04 (Server Actions) and plan 03-05a (shadcn primitives + the catalog the detail page links back to).

Wave 2.5 strictly after 03-05a so the shadcn primitives (`progress`, `badge`, `dropdown-menu`, etc.) installed by 03-05a are available without redundant install.

Output:
- 1 page route (`/idei/[slug]`)
- 5 components under `src/components/idea/`
- 4 e2e specs + 1 unit test
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
@.planning/phases/03-idea-catalog-voting/03-04-PLAN.md
@.planning/phases/03-idea-catalog-voting/03-05a-PLAN.md
@CLAUDE.md
@src/components/preferences/NewsletterToggleRow.tsx
@src/components/landing/Hero.tsx
@src/lib/newsletter/lexical-to-html.ts
@src/lib/auth.ts
@src/lib/turnstile.ts
@messages/bg.json

<interfaces>
From plan 03-02 src/lib/voting/cache.ts:
```typescript
type DisplayCounts = { revealed: false; total: number; remaining: number } | { revealed: true; approve: number; reject: number; total: number; approvePct: number };
getCachedDisplayCounts(ideaId: string): Promise<DisplayCounts>
```

From plan 03-04 src/app/actions/cast-vote.ts:
```typescript
type CastVoteResult = { ok: true; action: 'cast' | 'change' | 'noop'; voteEventLogId?: string } | { ok: false; reason: 'unauthenticated'|'email_not_verified'|'invalid_input'|'rate_limited'|'turnstile_required'|'captcha_failed'|'idea_not_published'|'internal_error' };
castVote(input: { ideaId: string; choice: 'approve'|'reject'; turnstileToken?: string }): Promise<CastVoteResult>
```

From src/lib/newsletter/lexical-to-html.ts (Phase 5 — direct reuse for IdeaDetail body):
```typescript
renderLexicalToHtml(body: SerializedEditorState): string
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

From plan 03-05a `src/components/ui/*` (already installed): badge, progress, skeleton, button, card, alert, dropdown-menu.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: VoteButtons + VoteCountDisplay + RetractToast + TurnstileChallenge — vote interaction core</name>
  <files>src/components/idea/VoteButtons.tsx, src/components/idea/VoteCountDisplay.tsx, src/components/idea/RetractToast.tsx, src/components/idea/TurnstileChallenge.tsx</files>
  <read_first>
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S2 lines 219-339, section S3 lines 341-353, section S4 lines 356-366
    - .planning/phases/03-idea-catalog-voting/03-PATTERNS.md section "src/components/idea/VoteButtons.tsx" lines 806-890 + section "RetractToast.tsx" lines 892-921
    - .planning/phases/03-idea-catalog-voting/03-RESEARCH.md section "Pattern 7 Sonner Toast" lines 627-654 + section "Pattern 8 aria-pressed" lines 656-694
    - src/components/preferences/NewsletterToggleRow.tsx (useTransition + optimistic toast pattern)
    - src/lib/turnstile.ts (Phase 1 D-05 widget pattern + verifyTurnstile)
    - src/components/forms/RegistrationForm.tsx (existing Turnstile mount in a form — analog for inline mount)
  </read_first>
  <action>
**File 1: src/components/idea/VoteButtons.tsx** — client island.

```tsx
'use client';

import { useState, useTransition, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, OctagonX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { castVote, type CastVoteResult } from '@/app/actions/cast-vote';
import { retractVote } from '@/app/actions/retract-vote';
import { showRetractToast } from './RetractToast';
import { TurnstileChallenge } from './TurnstileChallenge';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Props = {
  ideaId: string;
  initialChoice: 'approve' | 'reject' | null;
  emailVerified: boolean;
};

export function VoteButtons({ ideaId, initialChoice, emailVerified }: Props) {
  const t = useTranslations('idea');
  const [choice, setChoice] = useState<'approve' | 'reject' | null>(initialChoice);
  const [pending, startTransition] = useTransition();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [hardError, setHardError] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const liveRegion = useRef<HTMLDivElement>(null);

  if (!emailVerified) {
    return (
      <Alert>
        <AlertDescription>
          {t('gate.unverified')}{' '}
          <a className="text-primary underline-offset-4 hover:underline" href="/login">
            {t('gate.unverifiedCta')}
          </a>
        </AlertDescription>
      </Alert>
    );
  }

  const announce = (msg: string) => {
    if (liveRegion.current) liveRegion.current.textContent = msg;
  };

  const handleVote = (next: 'approve' | 'reject', tokenOverride?: string) => {
    setNetworkError(false);
    if (choice === next) {
      // RETRACT
      const prev = choice;
      setChoice(null);
      startTransition(async () => {
        const result = await retractVote({ ideaId });
        if (!result.ok) {
          setChoice(prev);
          setNetworkError(true);
          return;
        }
        announce(t('vote.srAnnounceRetracted'));
        showRetractToast(result.voteEventLogId, prev, t);
      });
      return;
    }
    // CAST or CHANGE
    const prev = choice;
    setChoice(next); // optimistic
    startTransition(async () => {
      const result: CastVoteResult = await castVote({
        ideaId,
        choice: next,
        turnstileToken: tokenOverride ?? turnstileToken ?? undefined,
      });
      if (result.ok) {
        announce(prev === null ? t('vote.srAnnounceCast') : t(next === 'approve' ? 'vote.srAnnounceChangeApprove' : 'vote.srAnnounceChangeReject'));
        setShowCaptcha(false);
        setTurnstileToken(null);
        return;
      }
      setChoice(prev);
      switch (result.reason) {
        case 'turnstile_required':
          setShowCaptcha(true);
          break;
        case 'rate_limited':
          setHardError(true);
          window.setTimeout(() => setHardError(false), 30_000);
          break;
        case 'captcha_failed':
          setShowCaptcha(true);
          setTurnstileToken(null);
          break;
        default:
          setNetworkError(true);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Button
          variant={choice === 'approve' ? 'default' : 'outline'}
          size="lg"
          aria-pressed={choice === 'approve'}
          aria-label={choice === 'approve' ? t('vote.ariaApproveSelected') : (choice === 'reject' ? t('vote.ariaApproveChange') : t('vote.approve'))}
          aria-busy={pending}
          disabled={pending || hardError}
          className="min-h-[44px] flex-1"
          onClick={() => handleVote('approve')}
        >
          {pending && choice !== 'approve' ? null : <Check className="size-5" />}
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t('vote.approve')}
        </Button>
        <Button
          variant={choice === 'reject' ? 'default' : 'outline'}
          size="lg"
          aria-pressed={choice === 'reject'}
          aria-label={choice === 'reject' ? t('vote.ariaRejectSelected') : (choice === 'approve' ? t('vote.ariaRejectChange') : t('vote.reject'))}
          aria-busy={pending}
          disabled={pending || hardError}
          className="min-h-[44px] flex-1"
          onClick={() => handleVote('reject')}
        >
          {pending && choice !== 'reject' ? null : <X className="size-5" />}
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t('vote.reject')}
        </Button>
      </div>

      {/* Off-screen aria-live status */}
      <div ref={liveRegion} role="status" aria-live="polite" className="sr-only" />

      {showCaptcha && (
        <div className="my-4">
          <p className="mb-2 text-sm text-foreground">{t('captcha.prompt')}</p>
          <TurnstileChallenge
            onVerify={(token) => {
              setTurnstileToken(token);
              setShowCaptcha(false);
              // User must click again with token in state (simplest correct impl).
            }}
          />
        </div>
      )}

      {hardError && (
        <Alert variant="destructive">
          <OctagonX className="size-5" />
          <AlertDescription>{t('rateLimit.hardError')}</AlertDescription>
        </Alert>
      )}

      {networkError && (
        <Alert variant="destructive">
          <OctagonX className="size-5" />
          <AlertDescription>{t('error.network')}</AlertDescription>
        </Alert>
      )}

      <p className="mt-4 text-sm text-muted-foreground">{t('vote.hint')}</p>
    </div>
  );
}
```

**File 2: src/components/idea/VoteCountDisplay.tsx** — server component.

```tsx
import { useTranslations } from 'next-intl';
import { Progress } from '@/components/ui/progress';
import type { DisplayCounts } from '@/lib/voting/cache';

type Props = {
  counts: DisplayCounts;
  role: 'public' | 'member';
  variant: 'card' | 'detail';
};

export function VoteCountDisplay({ counts, role, variant }: Props) {
  const t = useTranslations('idea');
  if (!counts.revealed) {
    if (variant === 'card') {
      return (
        <p className="mt-auto text-sm text-muted-foreground">
          {t('threshold.cardShort', { N: counts.remaining })}
        </p>
      );
    }
    return (
      <p className="text-base text-muted-foreground italic text-center">
        {t('threshold.detail', { N: counts.remaining })}
      </p>
    );
  }
  return (
    <div>
      <Progress value={counts.approvePct} className="h-2 mb-3" />
      <p className="text-base [font-feature-settings:'tnum']">
        {t('count.approve', { n: counts.approve })} · {t('count.percent', { p: counts.approvePct })}
      </p>
      {role === 'member' && (
        <p className="mt-2 text-sm text-muted-foreground [font-feature-settings:'tnum']">
          {t('count.reject', { n: counts.reject })}
          <span className="ml-2 inline-flex items-center rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
            {t('count.membersOnly')}
          </span>
          <span className="sr-only"> {t('count.membersOnlySr')}</span>
        </p>
      )}
    </div>
  );
}
```

NOTE: do NOT branch on `counts.frozen` for public surfaces — D-23 explicit silent freeze. The cache returns `revealed: false` when frozen (per plan 03-07b cache.ts cross-modification).

**File 3: src/components/idea/RetractToast.tsx** — client function (helper, not a component).

```tsx
'use client';

import { toast } from 'sonner';
import { undoRetract } from '@/app/actions/undo-retract';

export function showRetractToast(
  voteEventLogId: string,
  prevChoice: 'approve' | 'reject',
  t: (key: string) => string,
) {
  toast(t('toast.retracted'), {
    duration: 5000,
    action: {
      label: t('toast.undo'),
      onClick: async () => {
        const result = await undoRetract({ voteEventLogId, prevChoice });
        if (result.ok) toast.success(t('toast.undoSuccess'));
      },
    },
  });
}
```

The function takes a `t` arg because `useTranslations` is unavailable inside a non-component (PATTERNS line 920). Caller in VoteButtons passes its `t` instance.

**File 4: src/components/idea/TurnstileChallenge.tsx** — client island that mounts the existing Turnstile widget.

Read `src/components/forms/RegistrationForm.tsx` and `src/lib/turnstile.ts` for the existing widget mount pattern. Mirror it; expose `onVerify(token: string) => void` callback. Use the same `data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}` and `data-theme="light"` per Phase 1 D-05.

If there is an existing client wrapper from Phase 1 (e.g., `src/components/forms/TurnstileWidget.tsx`), import and re-use it instead of duplicating. Otherwise inline the Cloudflare Turnstile script-load pattern (renderHTML + onload handler).
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "src/components/idea/(VoteButtons|VoteCountDisplay|RetractToast|TurnstileChallenge)\.tsx" | head -10; grep -c "aria-pressed\|aria-busy\|role=\"status\"\|sr-only" src/components/idea/VoteButtons.tsx; grep -nE '"[А-Яа-я]+' src/components/idea/VoteButtons.tsx src/components/idea/VoteCountDisplay.tsx src/components/idea/RetractToast.tsx src/components/idea/TurnstileChallenge.tsx | head -5 || echo "no inline Cyrillic"</automated>
  </verify>
  <acceptance_criteria>
    - All 4 files exist and type-check
    - VoteButtons uses aria-pressed (not color-only) per WAI-ARIA APG mandate
    - VoteCountDisplay branches on `revealed` boolean; public hides reject; member shows reject with "за членове" pill
    - RetractToast uses Sonner with `duration: 5000` (D-24 explicit)
    - TurnstileChallenge reuses existing Phase 1 widget pattern
    - All Bulgarian strings come from `useTranslations('idea')` — zero hardcoded Cyrillic in JSX
    - Final grep gate: `grep -nE '"[А-Яа-я]+' src/components/idea/VoteButtons.tsx src/components/idea/VoteCountDisplay.tsx src/components/idea/RetractToast.tsx src/components/idea/TurnstileChallenge.tsx` returns zero matches
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: IdeaDetail composition + /idei/[slug] page (with draft preview gate)</name>
  <files>src/components/idea/IdeaDetail.tsx, src/app/(frontend)/idei/[slug]/page.tsx</files>
  <read_first>
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S2 lines 219-339
    - .planning/phases/03-idea-catalog-voting/03-PATTERNS.md (IdeaDetail composition section)
    - src/components/landing/Hero.tsx (existing Hero with overlay pattern — analog for IdeaDetail hero)
    - src/lib/auth.ts + src/lib/auth/role-gate.ts
    - src/db/schema/voting.ts (just-built — votes table)
    - src/lib/newsletter/lexical-to-html.ts (Phase 5 — direct reuse)
  </read_first>
  <action>
**File 1: src/components/idea/IdeaDetail.tsx** — server component.

Per UI-SPEC §S2 lines 219-339:

```tsx
import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { renderLexicalToHtml } from '@/lib/newsletter/lexical-to-html';
import { VoteCountDisplay } from './VoteCountDisplay';
import { VoteButtons } from './VoteButtons';
import { getCachedDisplayCounts } from '@/lib/voting/cache';
import type { Idea } from '@/payload-types';

type Props = {
  idea: Idea;
  viewerRole: 'public' | 'member';
  emailVerified: boolean;
  initialChoice: 'approve' | 'reject' | null;
};

export async function IdeaDetail({ idea, viewerRole, emailVerified, initialChoice }: Props) {
  const t = await getTranslations('idea');
  const counts = await getCachedDisplayCounts(idea.id);
  const bodyHtml = renderLexicalToHtml(idea.body);
  const hero = idea.hero;
  return (
    <>
      {hero ? (
        <section className="relative w-full" style={{ height: 'clamp(280px, 50vh, 400px)' }}>
          <Image
            src={hero.url}
            alt={hero.alt || idea.title}
            fill
            priority
            sizes="(max-width: 1140px) 100vw, 1140px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[rgba(0,74,121,0.65)]" />
          <div className="container relative z-10 flex h-full flex-col items-start justify-end gap-4 pb-12">
            <Badge variant="outline" className="rounded-full border-white/40 bg-white/15 text-white backdrop-blur-sm">
              {t(`topic.${idea.topic}`)}
            </Badge>
            <h1 className="font-display text-4xl md:text-5xl text-white leading-tight text-balance">
              {idea.title}
            </h1>
          </div>
        </section>
      ) : (
        <header className="container max-w-prose pt-12">
          <Badge variant="outline" className="rounded-full bg-muted text-muted-foreground">
            {t(`topic.${idea.topic}`)}
          </Badge>
          <h1 className="mt-4 font-display text-4xl md:text-5xl text-foreground leading-tight text-balance">
            {idea.title}
          </h1>
        </header>
      )}

      <article
        className="prose prose-bg max-w-prose container pt-12"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      <section className="container max-w-prose pt-12 border-t mt-12">
        <VoteCountDisplay counts={counts} role={viewerRole} variant="detail" />
        <div className="pt-8">
          <VoteButtons ideaId={idea.id} initialChoice={initialChoice} emailVerified={emailVerified} />
        </div>
      </section>
    </>
  );
}
```

The `prose-bg` className applies the Bulgarian Cyrillic prose tokens from globals.css (Phase 2). Verify the class exists; if not, fall back to `prose` (Tailwind default) and document.

**File 2: src/app/(frontend)/idei/[slug]/page.tsx**

```tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { db } from '@/db';
import { sql, eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { IdeaDetail } from '@/components/idea/IdeaDetail';
import { votes } from '@/db/schema/voting';

type Params = { slug: string };
type SearchParams = { preview?: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const row = await db.execute(sql`SELECT title, excerpt FROM ideas WHERE slug = ${slug} AND status = 'published' LIMIT 1`);
  const idea = row.rows[0] as { title?: string; excerpt?: string } | undefined;
  if (!idea) return { title: 'Не намерено' };
  return { title: idea.title, description: idea.excerpt ?? '' };
}

export default async function IdeaDetailPage({ params, searchParams }: { params: Promise<Params>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const isDraftPreview = sp.preview === 'draft';

  const session = await auth();
  const userId = (session?.user as { id?: string; role?: string; email_verified_at?: string | null } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role ?? '';

  // Draft preview gate (D-19): editor session required
  if (isDraftPreview && !['admin', 'editor'].includes(role)) {
    notFound();
  }

  const statusFilter = isDraftPreview ? sql`status IN ('draft','published','archived')` : sql`status = 'published'`;
  const ideaRow = await db.execute(sql`
    SELECT id, title, slug, topic, excerpt, hero_id, body, is_featured, featured_order, status, display_frozen, created_at, updated_at
    FROM ideas
    WHERE slug = ${slug} AND ${statusFilter}
    LIMIT 1
  `);
  const idea = ideaRow.rows[0] as any;
  if (!idea) notFound();

  // Resolve hero (Payload media join — Phase 5 already maps `media` table)
  let hero = null;
  if (idea.hero_id) {
    const m = await db.execute(sql`SELECT id, url, alt FROM media WHERE id = ${idea.hero_id} LIMIT 1`);
    hero = (m.rows[0] as any) ?? null;
  }
  idea.hero = hero;

  // Initial vote choice for the viewer
  let initialChoice: 'approve' | 'reject' | null = null;
  let emailVerified = false;
  if (userId) {
    const me = await db.execute(sql`SELECT email_verified_at FROM users WHERE id = ${userId} LIMIT 1`);
    emailVerified = Boolean((me.rows[0] as any)?.email_verified_at);
    if (emailVerified) {
      const v = await db.select({ choice: votes.choice }).from(votes).where(and(eq(votes.user_id, userId), eq(votes.idea_id, idea.id))).limit(1);
      if (v.length > 0) initialChoice = v[0].choice as 'approve' | 'reject';
    }
  }

  const viewerRole: 'public' | 'member' = userId ? 'member' : 'public';

  return (
    <IdeaDetail
      idea={idea}
      viewerRole={viewerRole}
      emailVerified={emailVerified}
      initialChoice={initialChoice}
    />
  );
}
```
  </action>
  <verify>
    <automated>pnpm tsc --noEmit 2>&1 | grep -E "src/components/idea/IdeaDetail\.tsx|idei/\[slug\]/page\.tsx" | head -10; grep -c "notFound\|preview === 'draft'" src/app/\(frontend\)/idei/\[slug\]/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - IdeaDetail.tsx + /idei/[slug]/page.tsx exist and type-check
    - Draft preview gate enforced: editor / admin role → renders draft/archived; otherwise notFound()
    - IdeaDetail renders hero, Lexical body via renderLexicalToHtml, VoteCountDisplay, VoteButtons in section order
    - generateMetadata returns idea.title + excerpt (published only)
    - All Bulgarian copy comes through getTranslations / Badge label resolves via t(`topic.${...}`) — zero hardcoded Cyrillic
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: idea-cache-no-bust unit test (D-03 lock — applies to detail page consumers)</name>
  <files>tests/unit/idea-cache-no-bust.test.ts</files>
  <read_first>
    - .planning/phases/03-idea-catalog-voting/03-CONTEXT.md D-03 (cache-no-bust)
    - tests/unit/server-action-no-revalidate.test.ts (plan 03-01 — overlapping check)
  </read_first>
  <action>
**File: tests/unit/idea-cache-no-bust.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Phase 3 D-03 — display-count cache no-bust on vote write', () => {
  it('castVote / retractVote / undoRetract source contains zero revalidate calls', () => {
    for (const f of ['cast-vote','retract-vote','undo-retract']) {
      const src = readFileSync(`src/app/actions/${f}.ts`, 'utf8');
      expect(src).not.toMatch(/revalidatePath|revalidateTag/);
      expect(src).not.toMatch(/from ['"]next\/cache['"]/);
    }
  });

  it('getCachedDisplayCounts uses revalidate=300 (5-min TTL per D-03)', () => {
    const src = readFileSync('src/lib/voting/cache.ts', 'utf8');
    expect(src).toMatch(/revalidate:\s*300/);
  });
});
```

(Overlaps with `tests/unit/server-action-no-revalidate.test.ts` from plan 03-01 — that's intentional; this test ALSO confirms the `getCachedDisplayCounts` TTL is 300.)
  </action>
  <verify>
    <automated>pnpm test:unit -- tests/unit/idea-cache-no-bust.test.ts --run 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - tests/unit/idea-cache-no-bust.test.ts GREEN (no revalidate calls anywhere; cache TTL=300)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: Playwright e2e — vote round-trip, retract+undo, rate-limit, layered display</name>
  <files>tests/e2e/idea-vote.spec.ts, tests/e2e/retract-undo.spec.ts, tests/e2e/vote-rate-limit.spec.ts, tests/e2e/vote-display.spec.ts</files>
  <read_first>
    - playwright.config.ts (existing config)
    - tests/e2e/ existing spec files (Phase 1 / Phase 5 — for fixture + helper patterns)
    - .planning/phases/03-idea-catalog-voting/03-RESEARCH.md section "Phase Requirements → Test Map" lines 1264-1298
    - .planning/phases/03-idea-catalog-voting/03-UI-SPEC.md section S2 + S3
  </read_first>
  <action>
Use existing Playwright fixture pattern (`loginAsVerifiedMember` from Phase 1 / 5).

**File 1: tests/e2e/idea-vote.spec.ts** — IDEA-03 cast / change with aria-pressed.

```typescript
import { test, expect } from '@playwright/test';
import { loginAsVerifiedMember } from './helpers/auth-helpers';

test.describe('IDEA-03 — vote cast / change', () => {
  test('verified member casts approve; aria-pressed flips', async ({ page }) => {
    await loginAsVerifiedMember(page);
    await page.goto('/idei/test-idea-fixture'); // assumes fixture idea slug
    const approve = page.getByRole('button', { name: 'Одобрявам' });
    const reject = page.getByRole('button', { name: 'Не одобрявам' });
    await expect(approve).toHaveAttribute('aria-pressed', 'false');
    await approve.click();
    await expect(approve).toHaveAttribute('aria-pressed', 'true');
    await expect(reject).toHaveAttribute('aria-pressed', 'false');
  });

  test('change vote shows toast Гласът ти е променен', async ({ page }) => {
    await loginAsVerifiedMember(page);
    await page.goto('/idei/test-idea-fixture');
    await page.getByRole('button', { name: 'Одобрявам' }).click();
    await page.getByRole('button', { name: 'Не одобрявам' }).click();
    await expect(page.getByText('Гласът ти е променен.')).toBeVisible();
  });
});
```

**File 2: tests/e2e/retract-undo.spec.ts** — IDEA-05 5-sec Sonner undo.

```typescript
import { test, expect } from '@playwright/test';
import { loginAsVerifiedMember } from './helpers/auth-helpers';

test('retract → toast → click Отмени within 5s → restored', async ({ page }) => {
  await loginAsVerifiedMember(page);
  await page.goto('/idei/test-idea-fixture');
  await page.getByRole('button', { name: 'Одобрявам' }).click();
  await page.getByRole('button', { name: 'Одобрявам' }).click(); // click current = retract
  await expect(page.getByText('Гласът ти е оттеглен.')).toBeVisible();
  await page.getByRole('button', { name: 'Отмени' }).click();
  await expect(page.getByText('Възстановен.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Одобрявам' })).toHaveAttribute('aria-pressed', 'true');
});

test('retract → wait 5s → toast disappears; vote stays retracted', async ({ page }) => {
  await loginAsVerifiedMember(page);
  await page.goto('/idei/test-idea-fixture');
  await page.getByRole('button', { name: 'Одобрявам' }).click();
  await page.getByRole('button', { name: 'Одобрявам' }).click();
  await page.waitForTimeout(5500);
  await expect(page.getByRole('button', { name: 'Одобрявам' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Не одобрявам' })).toHaveAttribute('aria-pressed', 'false');
});
```

**File 3: tests/e2e/vote-rate-limit.spec.ts** — IDEA-06.

```typescript
import { test, expect } from '@playwright/test';
import { loginAsVerifiedMember } from './helpers/auth-helpers';

test('soft rate-limit triggers Turnstile widget', async ({ page }) => {
  await loginAsVerifiedMember(page);
  await page.goto('/idei/test-idea-fixture');
  for (let i = 0; i < 6; i++) {
    await page.getByRole('button', { name: 'Одобрявам' }).click();
  }
  await expect(page.getByText('Моля потвърди, че не си бот.')).toBeVisible();
});

test('hard rate-limit shows destructive Alert', async ({ page }) => {
  await loginAsVerifiedMember(page);
  await page.goto('/idei/test-idea-fixture');
  for (let i = 0; i < 25; i++) {
    await page.getByRole('button', { name: 'Одобрявам' }).click({ trial: false }).catch(() => {});
  }
  await expect(page.getByText(/Превишаваш допустимата честота на гласуване/)).toBeVisible();
});
```

If LOAD_TEST_BYPASS_RATE_LIMIT=true is set in the e2e env (BYPASS pattern from plan 03-02), the hard-block test SKIPS gracefully. Document the env requirement in 03-05b-SUMMARY.md.

**File 4: tests/e2e/vote-display.spec.ts** — IDEA-08 layered display.

Three test cases:
1. Pre-threshold: empty-state copy "Гласуването е в ход — резултатите ще се покажат след първите 20 гласа." visible to all viewers.
2. Post-threshold + anonymous: approve count + percent visible; reject count NOT visible.
3. Post-threshold + member: approve + reject + "за членове" pill visible.

```typescript
import { test, expect } from '@playwright/test';
import { loginAsVerifiedMember } from './helpers/auth-helpers';

test('pre-threshold: copy "Гласуването е в ход" visible to anonymous', async ({ page }) => {
  await page.goto('/idei/pre-threshold-fixture');
  await expect(page.getByText(/Гласуването е в ход/)).toBeVisible();
});

test('post-threshold + anonymous: approve% visible, reject NOT visible', async ({ page }) => {
  await page.goto('/idei/post-threshold-fixture');
  await expect(page.getByText(/% одобрение/)).toBeVisible();
  await expect(page.getByText('за членове')).not.toBeVisible();
});

test('post-threshold + member: reject + "за членове" pill visible', async ({ page }) => {
  await loginAsVerifiedMember(page);
  await page.goto('/idei/post-threshold-fixture');
  await expect(page.getByText(/% одобрение/)).toBeVisible();
  await expect(page.getByText('за членове')).toBeVisible();
});
```

Each test seeds the votes count by inserting fixture rows directly via a test helper. If the fixture infrastructure isn't ready, mark these tests `test.skip()` with a TODO comment pointing at the missing helper. The unit tests cover the SQL-level invariants; e2e is the integration layer.
  </action>
  <verify>
    <automated>pnpm test:e2e tests/e2e/idea-vote.spec.ts tests/e2e/retract-undo.spec.ts --reporter=list 2>&1 | tail -25</automated>
  </verify>
  <acceptance_criteria>
    - All 4 e2e specs exist
    - idea-vote.spec.ts GREEN (vote / change / aria-pressed)
    - retract-undo.spec.ts GREEN (toast undo within 5s)
    - vote-rate-limit.spec.ts GREEN or SKIPPED with documented env requirement
    - vote-display.spec.ts GREEN or SKIPPED with documented fixture helper TODO
  </acceptance_criteria>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → /idei/[slug] page | slug is user-controlled; Drizzle parameterizes via `WHERE slug = ${slug}` (template literal — Drizzle escapes) |
| Browser → VoteButtons client island | Vote action passes through plan 03-04's hardened Server Action |
| Lexical body render | Content authored by editor; allowed-blocks whitelist (D-17) prevents raw HTML / code injection |
| `?preview=draft` query param | Draft visibility gated on `['admin', 'editor'].includes(role)` from auth() session |

## STRIDE Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation Plan |
|-----------|----------|-----------|----------|-------------|-----------------|
| T-03-05b-01 | XSS | Lexical body renders raw HTML | HIGH | mitigate | renderLexicalToHtml only handles whitelisted node types; no custom blocks; D-17 banned features absent (asserted by tests/unit/ideas-lexical-config.test.ts in plan 03-01) |
| T-03-05b-02 | Information Disclosure | Public surface leaks reject count | HIGH | mitigate | VoteCountDisplay role='public' branch omits reject; tests/e2e/vote-display.spec.ts asserts NOT visible to anonymous |
| T-03-05b-03 | Information Disclosure | Draft preview leaks via /idei/[slug]?preview=draft to anyone | HIGH | mitigate | page.tsx role check via auth(); non-editor → notFound(); tests/e2e cover via editor-vs-anonymous fixture |
| T-03-05b-04 | Spoofing | Vote impersonation via stolen session cookie | HIGH | mitigate | Inherited from Phase 1 D-06 hardened cookie posture; this plan does not introduce new auth surface |

T-03-05b-01 — T-03-05b-03 mitigated within this plan.
T-03-05b-04 inherited from Phase 1.
</threat_model>

<verification>
- /idei/{slug} renders Lexical body, hero (when present), VoteCountDisplay, VoteButtons
- Anonymous viewer sees pre-threshold empty-state OR post-threshold approve%; never reject count
- Verified-member sees ALSO reject count with "за членове" pill
- Vote round-trip works (cast → change → retract → undo) with correct toast strings
- Rate-limit two-tier triggers correct UI states (Turnstile inline / destructive Alert)
- /idei/[slug]?preview=draft 404s for anonymous; renders for editor session
- pnpm tsc --noEmit emits zero new errors
- All unit tests in this plan GREEN
- Final grep gate: `grep -nE '"[А-Яа-я]+' src/components/idea/VoteButtons.tsx src/components/idea/VoteCountDisplay.tsx src/components/idea/IdeaDetail.tsx src/app/(frontend)/idei/[slug]/page.tsx` returns zero matches (per Phase 1 D-27)
</verification>

<success_criteria>
- IDEA-03 (vote cast / change) end-to-end demonstrable
- IDEA-05 (retract + undo) end-to-end demonstrable
- IDEA-06 (rate-limit + Turnstile) demonstrable in e2e (or documented skip)
- IDEA-08 (layered display + threshold gate + members-only reject) demonstrable in e2e + unit tests
- D-23 silent display-freeze preserved (no banner anywhere on public surfaces)
- All Bulgarian copy via next-intl (no hardcoded Cyrillic in JSX)
</success_criteria>

<output>
After completion, create `.planning/phases/03-idea-catalog-voting/03-05b-SUMMARY.md` documenting:
- All 4 e2e specs + status (GREEN / SKIP)
- Fixture helper status (if test.skip used, document the missing helper)
- Auto-retry-after-Turnstile UX choice (one-shot store-token vs auto-retry-via-pendingChoiceRef)
- Confirmation that prose-bg class exists or fallback to plain prose
- Pointer to plan 03-08 which extends fixture helpers + sets up integration profile if absent
</output>
</content>
</invoke>