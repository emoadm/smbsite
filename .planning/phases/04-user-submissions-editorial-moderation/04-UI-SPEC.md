---
phase: 4
slug: user-submissions-editorial-moderation
status: approved
reviewed_at: 2026-05-10
review_dimensions: 6/6 PASS
shadcn_initialized: true
preset: existing-project (style=new-york, baseColor=slate, cssVariables=true, iconLibrary=lucide)
created: 2026-05-10
revised: 2026-05-10
revision_reason: "UI checker BLOCK on Dimension 4 (3-weight inheritance), FLAG fixes on Dimension 1 (dismiss labels, CTA explicitness) and Dimension 2 (focal point declarations)"
---

# Phase 4 — UI Design Contract: User Submissions + Editorial Moderation

> Visual and interaction contract for `/предложения` (public proposals page), `/проблеми` (public problem heat-map), `/member/предложения` and `/member/сигнали` (member status views), the submission forms (`/member/предложи` and `/member/сигнализирай`), and `/admin/views/moderation-queue` (editorial queue inside Payload admin).
>
> **Locked decisions from CONTEXT.md D-A1, D-A2, D-B1, D-C1, D-D1, D-D2 are NOT re-debated here.** This document encodes them visually. All Phase 2 + Phase 3 design tokens are inherited without modification — Phase 4 introduces zero new CSS custom properties.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized — Phase 1 plan 01-04) |
| Preset | existing-project: `style=new-york`, `baseColor=slate`, `cssVariables=true`, `prefix=""`, `tsx=true`, `rsc=true` (`components.json`) |
| Component library | Radix UI (via shadcn/ui copies under `@/components/ui`) |
| Icon library | `lucide-react` (Phase 1 standard — `iconLibrary=lucide` in `components.json`) |
| Font | Gilroy ExtraBold for display/headlines (`--font-display`); Roboto for body (`--font-sans`); both loaded via `next/font` in `src/lib/fonts.ts` (Phase 2 plan 02-01) |
| Token source | `src/styles/globals.css` `@theme` block — DO NOT add new custom properties |
| Brand inheritance | Phase 2 Sinya tokens (primary navy `#004A79`, cyan `#3AC7FF`, white/slate neutrals). **NO new tokens in Phase 4.** |

**Pre-installed shadcn components reused (no new installs needed):**

`accordion`, `alert`, `button`, `card`, `checkbox`, `dialog`, `form`, `input`, `label`, `radio-group`, `select`, `sonner` (Toaster), `switch`, `tabs`, `tooltip`

**New shadcn components to add (official registry only — no third-party registries):**

- `badge` — `npx shadcn@latest add badge` — status badges on submission cards (Изчаква / Одобрено / Отхвърлено), topic tags on proposal cards, oblast label chips on heat-map table. **Note:** Phase 3 plan 03-01 also installs `badge`; if Phase 3 has not shipped, Phase 4 installs it. If Phase 3 shipped first, skip reinstall.
- `separator` — `npx shadcn@latest add separator` — dividers between submission form sections and between moderation queue action groups.
- `skeleton` — `npx shadcn@latest add skeleton` — loading fallback for submission status lists and queue table rows. **Phase 3 also adds this; same conditional.**
- `table` — `npx shadcn@latest add table` — moderation queue table, problem-report oblast breakdown table on `/проблеми`. **Phase 2.1 attribution view may have already added this (`/admin/views/attribution`); verify before re-adding.**
- `textarea` — `npx shadcn@latest add textarea` — proposal body field and moderator rejection note field.

> Registry safety: ALL components listed are from the official shadcn registry at `ui.shadcn.com`. No third-party registries are declared for Phase 4. Vetting gate is **not applicable**.

---

## Layout and Container Strategy

| Surface | Container token | Max width | Notes |
|---------|-----------------|-----------|-------|
| `/предложения` (public proposals) | `--container-page` (`max-w-[1140px]`) | 1140px | Same as landing page and `/idei` |
| `/проблеми` (public heat-map) | `--container-page` (`max-w-[1140px]`) | 1140px | Map SVG + breakdown table side by side on desktop |
| `/member/предложения` (my submissions status) | `--container-prose` (`max-w-[768px]`) | 768px | Narrow list; matches `/member` profile width |
| `/member/сигнали` (my problem reports status) | `--container-prose` (`max-w-[768px]`) | 768px | Same |
| `/member/предложи` (submit proposal form) | `--container-form` (`max-w-[480px]`) | 480px | Matches registration form width (Phase 1) |
| `/member/сигнализирай` (submit problem report form) | `--container-form` (`max-w-[480px]`) | 480px | Same |
| `/admin/views/moderation-queue` | Inherits Payload `Gutter` | Payload default | Matches Phase 2.1 attribution view pattern |

Existing Phase 2 chrome (Header, Footer, `MainContainer` with `landing` and `prose` variants) is reused without modification.

---

## Spacing Scale

Inherited from Phase 2 UI-SPEC §3.2 and Phase 3 UI-SPEC §Spacing. Restated here for checker validation:

| Token | Value | Usage in Phase 4 |
|-------|-------|------------------|
| xs | 4px | Status badge inner gap; form field icon-to-label gap; table cell left-padding compensation |
| sm | 8px | Proposal card internal padding-y; form field group gap; rejection note label-to-textarea gap |
| md | 16px | Default spacing between form fields; card padding-x; submission status list row height compensation |
| lg | 24px | Grid gap between proposal cards; vertical spacing between form sections; heat-map table row padding |
| xl | 32px | Spacing between page sections (`/предложения` heading → notice → grid); `/проблеми` map + table gap |
| 2xl | 48px | Page top padding (below sticky 80px header); submission form page-top padding |
| 3xl | 64px | Page-level padding-y on every Phase 4 route |

Exceptions:
- **Form submission button minimum touch target:** `44px` height via `min-h-[44px]` on `<Button size="lg">`. WCAG 2.5.5. Same pattern as Phase 3 vote buttons.
- **Oblast selector touch target on mobile:** `<Select>` native dropdown — inherits OS touch sizing, adequate by default. No override needed.

---

## Typography

> **INHERITED CONTRACT — LOCKED**
>
> Phase 4 uses a 3-weight system: **400 (Roboto regular)**, **600 (Roboto semibold)**, and **800 (Gilroy ExtraBold)**. This is NOT a Phase 4 choice — it is the project-wide typography contract established and checker-approved across prior phases:
>
> - **Phase 02 UI-SPEC** (`02-public-surface-pre-warmup/02-UI-SPEC.md`, `status: approved`, `review_dimensions: 6/6 PASS`) declares the full typographic ramp at §3.2 with weights 400 (Roboto body/label/caption), 600 (Roboto semibold for labels, form fields, heading 3), and 800 (Gilroy ExtraBold for display, h1, h2). Gilroy Light (300) is declared forward-compat only and is NOT used. D-07 explicitly locks Gilroy 800 + Roboto 400/600.
> - **Phase 03 UI-SPEC** (`03-idea-catalog-voting/03-UI-SPEC.md`, `status: approved`) inherits Phase 2's system and re-declares the same 3-weight table explicitly: "Declared roles (4 sizes, 2 weights)" — note that the Phase 3 header says "2 weights" but the table enumerates 400, 600, and 800 across its 4 roles. The checker approved this without blocking on the 800/Gilroy role because it is part of the approved cross-phase display-font contract.
>
> **Phase 4 introduces zero new weights.** The 3 weights (400, 600, 800) are inherited verbatim. Any checker tool evaluating Phase 4 in isolation and blocking on "3 weights exceeds maximum 2" is applying a single-phase rule to a cross-phase inherited system. The correct disposition is: **inherited-system pass — no new weights introduced**.

All roles use sizes already declared in `globals.css` `@theme`. Phase 4 picks from the existing 8-size ramp; NO new sizes.

| Role | Size | Token | Weight | Line Height | Used For |
|------|------|-------|--------|-------------|----------|
| Body | 16px | `--text-base` (1rem) | 400 Roboto regular | 1.5 (`--leading-normal`) | Proposal card excerpt; problem heat-map explanatory copy; submission form field descriptions; moderator rejection note text; moderation queue row body text |
| Label | 14px | `--text-sm` (0.875rem) | 600 Roboto semibold | 1.5 (`--leading-normal`) | Status badge text (Изчаква / Одобрено / Отхвърлено); form field labels; table column headers; submission date/time stamps; "Анонимен сигнал" / "Член на коалицията" attribution labels; oblast chip text on heat-map table |
| Heading | 24px | `--text-2xl` (1.5rem) | 800 Gilroy ExtraBold (`--font-display`) | 1.2 (`--leading-snug`) | Proposal card title (public page); submission form section titles; moderation queue page heading inside Payload admin |
| Display | 36px | `--text-4xl` (2.25rem) | 800 Gilroy ExtraBold (`--font-display`) | 1.15 (`--leading-tight`) | `/предложения` H1; `/проблеми` H1; `/member/предложения` H1; `/member/предложи` H1 |

Cyrillic rules (inherited from Phase 3, apply identically):
- **No `letter-spacing` adjustments** on Bulgarian text.
- **`hyphens: manual` only** on body prose (do NOT use `hyphens: auto` — unreliable for Bulgarian).
- **`text-wrap: balance`** on proposal card titles (prevents single-word orphans on Bulgarian multi-word titles).
- **`font-feature-settings: "tnum"`** on all numeric counts (submission counts, problem report oblast counts, moderation queue totals).

---

## Color (60/30/10 — inherited from Phase 2)

Phase 2 shipped the Sinya palette. Phase 4 inherits without redefinition.

| Role | Token | Hex | Usage in Phase 4 |
|------|-------|-----|------------------|
| Dominant 60% | `--color-background` / `--color-surface` / `--color-muted` | `#FFFFFF` / `#F1F5F9` | Page background; proposal card bg; form page bg; queue table bg; heat-map page bg |
| Secondary 30% | `--color-secondary` / `--color-border` / `--color-muted-foreground` | `#3AC7FF` / `#E2E8F0` / `#475569` | Card hover ring; separator lines; oblast chip bg (inactive); queue row zebra stripe; submission date text; map county fill (non-highlighted) |
| Accent 10% | `--color-primary` | `#004A79` | **See reserved-for list below — exhaustive** |
| Destructive | `--color-destructive` | `#DC2626` | Suspend member action (confirmation dialog CTA + alert); reject submission action button (in confirmation dialog only — the queue row action is `variant="outline"` until confirmed) |
| Success | `--color-success` | `#059669` | "Одобрено" status badge background; success toast after approval action; submission approved status icon |
| Warning | `--color-warning` | `#D97706` | "Изчаква преглед" status badge background; moderation queue age indicator when item is older than 72 hours |

### Accent (`--color-primary` `#004A79`) reserved-for list — EXHAUSTIVE

Phase 4 uses the Sinya navy accent ONLY for:

1. **Primary form submission CTA buttons:** "Изпрати предложение" and "Изпрати сигнал" — `<Button variant="default" size="lg">`.
2. **Active pagination indicator** on `/предложения` grid (when paginated) — `<PaginationLink isActive>` → `bg-primary`.
3. **Heat-map oblast density fill — highest tier:** oblasts with the most problem reports use `bg-primary` fill on the SVG map. Lower density tiers use `bg-secondary/40` → `bg-secondary/70` → `bg-primary/60` → `bg-primary` (4-step scale, see S5 Heat-map spec).
4. **"Гласуването скоро" notice border-left accent** on `/предложения` — `border-l-4 border-primary` on the `<Alert>` info box.
5. **Moderation queue "Одобри" action button (confirmed state)** — `<Button variant="default">` inside the confirmation `<Dialog>`.
6. **Active tab indicator** in member submission status pages (if tabbed interface is used for Proposals vs Reports — planner discretion on whether to use `<Tabs>` or separate pages; if `<Tabs>`, `TabsTrigger` active state uses `bg-primary text-primary-foreground`).
7. **"Нов сигнал" / "Ново предложение" call-to-action links** from `/member/предложения` and `/member/сигнали` empty states.

**Explicitly NOT accent:** card hover ring (use `hover:ring-1 hover:ring-secondary/50`), status badge for "Отхвърлено" (use `bg-destructive/10 text-destructive border-destructive/20`), map county fill in the 0 or suppressed state (use `bg-muted`).

---

## Surface-by-Surface Visual Spec

### S1 — `/предложения` Public Proposals Page (PROP-04, D-B1)

**Focal point:** H1 display heading "Предложения от общността" + the first row of ProposalCards immediately below. The eye should land on the headline and immediately resolve into content cards — the voting-soon `<Alert>` notice is secondary context above the grid.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header (Phase 2 reuse)                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│   pt-12 (3xl)                                                            │
│   <h1 display 36px>        Предложения от общността                     │
│   <p body muted-fg>        Одобрените предложения на членовете           │
│                            на коалицията (1 sentence — bg.json key)     │
│                                                                          │
│   pt-8 (xl)                                                              │
│   ┌─── Alert info — border-l-4 border-primary bg-primary/5 ───────────┐  │
│   │ ℹ  Гласуването по предложенията предстои. Следете за обновления.   │  │
│   │    (exact copy locked — bg.json key submission.proposals.votingSoon)│  │
│   └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│   pt-8 (xl)                                                              │
│   ┌── grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ────────┐    │
│   │  ProposalCard  ProposalCard  ProposalCard                        │    │
│   │  ProposalCard  ProposalCard  ProposalCard                        │    │
│   └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   pt-12 (3xl)                                                            │
│   <Pagination> (when total > 12)                                         │
│   pb-16                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Footer (Phase 2 reuse)                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**`<ProposalCard>`:**

```
┌────────────────────────────────────┐
│  [Badge "Икономика"]               │  ← topic badge, top-left, muted variant
│                                    │
│  Намаляване на ДДС за малки        │  ← title: heading 24px Gilroy ExtraBold,
│  предприятия в сектора             │    text-wrap: balance, line-clamp-3
│                                    │
│  Кратко описание на предложението  │  ← excerpt: body 16/1.5, line-clamp-2,
│  в две-три реда…                   │    muted-foreground
│                                    │
│  ──────────────────────────────── │  ← border-t divider
│  Член на коалицията · 14 май 2026  │  ← attribution + date: label 14px muted-fg
└────────────────────────────────────┘
```

- Card component: `<Card className="flex flex-col gap-4 rounded-xl border bg-card p-6 hover:ring-1 hover:ring-secondary/50 transition-shadow">`. NOT a link wrapper — proposals have no detail page in Phase 4 (detail page is out of scope; card is read-only).
- Topic badge: `<Badge variant="outline" className="self-start text-xs">` with topic label from the curated topic list. Muted bg, not accent.
- Attribution line: fixed string `"Член на коалицията"` per D-C1 — never member name, initials, sector, or oblast. Date is the approval date (not submission date). Separator: `·` (middle dot). 14px Roboto semibold, `--color-muted-foreground`.
- The card is NOT clickable/navigable — no `<Link>` wrapper, no `cursor-pointer`. This differs from Phase 3 IdeaCard which links to a detail page.
- **Card focusability:** since it is not interactive, no `tabIndex` on the card itself. Screen readers read the card content naturally in document order.

**Pagination (when total approved proposals > 12):**

12 per page, same pattern as Phase 3 `/idei` pagination. Uses shadcn `<Pagination>` component (Phase 3 adds this; Phase 4 reuses). URL param: `?strana=N` (Bulgarian URL param key — consistent with D-25 style; final param name is planner's discretion per CONTEXT.md Claude's Discretion).

**Empty state (zero approved proposals):**

Full-width `<Card>` (no grid), centered, max-w-prose, p-12. Heading display 36px: "Предложенията скоро ще се появят тук." Body 16px muted-fg: "Бъди първият — изпрати предложение за политическо решение." Primary CTA `<Button asChild><Link href="/member/предложи">`: "Предложи идея" (icon: `LightbulbIcon` lucide, size-4).

Only shown to logged-in members (the CTA links to a gated member route). Anonymous visitors see the same heading + body without the CTA button.

---

### S2 — `/проблеми` Public Heat-Map Page (PROB-01..04, D-D1, D-D2)

**Focal point:** SVG Bulgaria oblast choropleth map — the colored density map is the dominant visual that communicates the heat-map concept immediately. The right-side breakdown `<Table>` is supporting detail.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header (Phase 2 reuse)                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│   pt-12 (3xl)                                                            │
│   <h1 display 36px>        Сигнали за проблеми                          │
│   <p body muted-fg>        Агрегирани сигнали на членовете               │
│                            (1-sentence description — bg.json key)        │
│                                                                          │
│   pt-8 (xl)                                                              │
│   ┌── lg:grid lg:grid-cols-[1fr_320px] gap-8 ──────────────────────────┐ │
│   │                                                                      │ │
│   │  ┌─── SVG Bulgaria map (oblast choropleth) ───────────────────────┐ │ │
│   │  │                                                                 │ │ │
│   │  │   Each oblast = SVG <path> element.                            │ │ │
│   │  │   Hover shows <Tooltip> with oblast name + count.              │ │ │
│   │  │   Suppressed (N<5): muted fill, no tooltip count.             │ │ │
│   │  └─────────────────────────────────────────────────────────────── │ │ │
│   │                                                                      │ │
│   │  ┌─── Top oblast breakdown <Table> ───────────────────────────────┐ │ │
│   │  │  Oblast         │ Сигнали │ Топ тема                           │ │ │
│   │  │  ─────────────  │ ─────── │ ────────────                       │ │ │
│   │  │  Пловдив        │   42    │ Данъчна тежест                     │ │ │
│   │  │  София-град     │   38    │ Административни пречки              │ │ │
│   │  │  Варна          │   27    │ Трудов пазар                        │ │ │
│   │  │  …                                                              │ │ │
│   │  └──────────────────────────────────────────────────────────────── │ │ │
│   │                                                                      │ │
│   └────────────────────────────────────────────────────────────────────┘ │
│   pb-16                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ Footer (Phase 2 reuse)                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Oblast SVG map:**

- Reuses the SVG oblast outline already present in Phase 2.1 attribution dashboard (`/admin/views/attribution`) — same map source, different fill logic.
- Each oblast `<path>` receives a `fill` class driven by a density tier (4 tiers + suppressed):
  - **Suppressed (N<5 or zero):** `fill-muted` (`#F1F5F9`) — no count visible. Renders identically for N=0 and N<5 to avoid inferring small counts.
  - **Tier 1 (lowest density above N≥5):** `fill-secondary/40` (cyan at 40% opacity).
  - **Tier 2:** `fill-secondary/70`.
  - **Tier 3:** `fill-primary/60` (navy at 60%).
  - **Tier 4 (highest density):** `fill-primary` (full navy).
- Tier boundaries: planner determines thresholds based on actual data distribution at implementation time — use quartiles of the non-suppressed oblasts. No hardcoded pixel thresholds in this spec.
- `<Tooltip>` on hover/focus: `<TooltipContent>` shows `"${oblastName}: ${count} сигнала"` (or `"${oblastName}: данните са недостатъчни"` for suppressed). Tooltip is positioned above the hovered path.
- Keyboard: each `<path>` must be `focusable` (`tabIndex={0}`, `role="img"`, `aria-label="${oblastName}: ${count} сигнала"`) for keyboard accessibility.
- Mobile (<768px): map renders full-width; breakdown table moves BELOW map (stacked). The `lg:grid` collapses to block.

**Oblast breakdown `<Table>`:**

- Columns: Oblast | Сигнали | Топ тема.
- Sorted descending by count.
- Suppressed oblasts (N<5) are completely absent from the table — no row, no placeholder. D-D2.
- National-level reports: rendered as a pinned row at the top of the table with label "Централно ниво" instead of an oblast name.
- Topic string in "Топ тема" column: the single most frequent approved topic within that oblast's problem reports. If no topic breakdown available (suppressed per D-D2 rule applied at topic level), shows "—".
- Table uses `<TableRow className="hover:bg-muted/50">` zebra-free (clean background); dividers via `border-b border-border`.
- **No clickable rows** — the table is read-only.

**Empty state (zero non-suppressed oblasts):**

Single centered paragraph below the map placeholder: "Все още нямаме достатъчно сигнали за показване. Изпрати сигнал и помогни да картографираме проблемите на МСП сектора." CTA `<Button asChild><Link href="/member/сигнализирай">`: "Изпрати сигнал" (member-only; hide for anonymous).

---

### S3 — `/member/предложи` Proposal Submission Form (PROP-01, PROP-02)

**Focal point:** Form card — specifically the "Заглавие" `<Input>` field as the first interactive element. The user's attention should flow H1 → subheading → form card → title field.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header                                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│   max-w-[480px] mx-auto pt-12 pb-16                                      │
│                                                                          │
│   <h1 display 36px>    Предложи политическо решение                     │
│   <p body muted-fg>    Предложенията минават модерация и след одобрение   │
│                        стават видими за всички членове.                   │
│                        (bg.json key submission.proposal.formDescription) │
│                                                                          │
│   pt-8 (xl)                                                              │
│   ┌─── <form> ─────────────────────────────────────────────────────────┐ │
│   │                                                                     │ │
│   │  <Label> Заглавие *                                                 │ │
│   │  <Input placeholder="Опиши предложението накратко...">              │ │
│   │  <p text-sm muted-fg> Макс. 120 знака                               │ │
│   │                                                                     │ │
│   │  <Separator className="my-4">                                       │ │
│   │                                                                     │ │
│   │  <Label> Описание *                                                 │ │
│   │  <Textarea rows={6} placeholder="Опиши проблема, предложеното      │ │
│   │   решение и очаквания ефект за МСП сектора...">                     │ │
│   │  <p text-sm muted-fg> Мин. 50 знака, макс. 2 000 знака             │ │
│   │                                                                     │ │
│   │  <Separator className="my-4">                                       │ │
│   │                                                                     │ │
│   │  <Label> Тема *                                                     │ │
│   │  <Select placeholder="Избери тема...">                              │ │
│   │    [Данъчна тежест | Административни пречки | Достъп до финансиране │ │
│   │     | Трудов пазар | Цифровизация | Енергийни разходи | Друго]      │ │
│   │  </Select>                                                          │ │
│   │                                                                     │ │
│   │  <Separator className="my-4">                                       │ │
│   │                                                                     │ │
│   │  <TurnstileWidget> (invisible by default)                           │ │
│   │                                                                     │ │
│   │  <Button variant="default" size="lg" className="w-full min-h-[44px]"│ │
│   │          type="submit">                                             │ │
│   │    Изпрати предложение                                              │ │
│   │  </Button>                                                          │ │
│   │                                                                     │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│ Footer                                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Form behavior:**

- Server Action with Zod validation + Turnstile verification (same anti-abuse pattern as registration — Phase 1 / Phase 02.x).
- Inline Zod errors via React Hook Form + `<Form>` shadcn primitives — same pattern as `RegistrationForm.tsx`. Error text: 14px `text-destructive` below the relevant field.
- Rate limit: same Upstash rate-limit pattern as registration. On hard rate-limit: `<Alert variant="destructive">` replaces the submit button area with "Превишаваш допустимата честота на подаване. Опитай отново след [N] минути."
- On success: redirect to `/member/предложения` (my submissions list) with a Sonner toast: "Предложението е изпратено за преглед." (success variant, 5-sec).
- Character counter on title and description fields: `<p className="text-xs text-muted-foreground text-right">{current}/{max}</p>` rendered live via RHF watch. Counter text turns `text-destructive` at 90% capacity.
- Topic options: 7 predefined categories (see select above) + "Друго". Exact labels locked into `messages/bg.json` under `submission.topics.*` keys. Planner finalizes the exact list; these 7 are placeholders — must be aligned with the problem report topic list for cross-surface consistency.

**Gating:**

Route is under `/member/` — server-side session check. Non-authenticated visitors redirect to `/auth`. Unverified members (email not confirmed) see an `<Alert>` in place of the form: "Потвърди имейла си, за да подаваш предложения." with a `<Button asChild><Link href="/auth">` "Обнови статуса" link.

---

### S4 — `/member/сигнализирай` Problem Report Submission Form (PROB-01..03)

**Focal point:** Form card — specifically the "Описание" `<Textarea>` as the primary input. The H1 establishes context; the textarea is the primary action area.

Same layout shell as S3 (`max-w-[480px]`, same header pattern, same footer, same submit button spec). Differences only:

```
<h1>         Сигнализирай за проблем
<p muted-fg> Сигналите минават модерация. Публично се показват само
             агрегирано по области — без лично идентифициране.
             (bg.json key submission.problem.formDescription)

Fields:
  1. <Label> Описание *
     <Textarea rows={6} placeholder="Опиши конкретния проблем и
               неговото въздействие върху твоя бизнес...">
     Min 30 / max 1 000 chars

  2. <Label> Тема *
     <Select>  [same 7 topic options + Друго as proposals form]

  3. <Label> Ниво *
     <RadioGroup>
       <RadioGroupItem value="local">  Местно ниво
       <RadioGroupItem value="national"> Централно ниво

  4. [Conditional — shown only when "Местно ниво" is selected]
     <Label> Област / Община *
     <Select placeholder="Избери област...">
       [28 Bulgarian oblast names from messages/bg.json oblast.* keys]
     </Select>
     (Server-side: IP → GeoLite2 → oblast auto-suggestion.
      The <Select> pre-populates with the GeoIP-derived suggestion.
      Member confirms or overrides.
      Implementation note: server returns the suggestion as a prop;
      client sets the initial Select value — NO live geolocation fetch.)

  5. <TurnstileWidget> (invisible)
  6. <Button> Изпрати сигнал
```

**Level selector (RadioGroup) behavior:**

- Default selected: "Местно ниво" (most common case for MSP sector problems per business logic assumption).
- When "Централно ниво" selected: oblast/municipality `<Select>` unmounts (or becomes `aria-hidden` + `disabled`) with a smooth CSS transition (`transition-opacity duration-200`). No layout shift — the space collapses via `grid-rows` animation if using CSS grid for the field list.
- When "Местно ниво" selected: oblast `<Select>` mounts/shows.
- `aria-required` and `aria-describedby` on the oblast `<Select>` must be conditional on "Местно ниво" being active.

---

### S5 — `/member/предложения` Member Submission Status List (PROP-03)

**Focal point:** Status badges in the most-recent (top) `SubmissionStatusCard` row. The badge communicates the outcome of the latest submission immediately; the member's attention should resolve to the status indicator first, then the card title.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header                                                                   │
├──────────────────────────────────────────────────────────────────────────┤
│   max-w-[768px] mx-auto pt-12 pb-16                                      │
│                                                                          │
│   <h1 display 36px>    Мои предложения                                  │
│   <Button asChild size="sm" className="mt-4">                            │
│     <Link href="/member/предложи"> + Ново предложение </Link>            │
│   </Button>                                                              │
│                                                                          │
│   pt-8 (xl)                                                              │
│   ┌─── submission status list ─────────────────────────────────────────┐ │
│   │                                                                     │ │
│   │  ┌── SubmissionStatusCard ──────────────────────────────────────┐  │ │
│   │  │  [Badge "Изчаква преглед" warning]   14 май 2026             │  │ │
│   │  │                                                               │  │ │
│   │  │  Намаляване на ДДС за малки предприятия                      │  │ │
│   │  │  (title, heading 24px)                                        │  │ │
│   │  │                                                               │  │ │
│   │  │  Тема: Данъчна тежест                                         │  │ │
│   │  └────────────────────────────────────────────────────────────── │  │ │
│   │                                                                     │ │
│   │  ┌── SubmissionStatusCard ──────────────────────────────────────┐  │ │
│   │  │  [Badge "Одобрено" success]           11 май 2026            │  │ │
│   │  │                                                               │  │ │
│   │  │  Намаляване на административни такси за старт-ъпи            │  │ │
│   │  │  (title, heading 24px)                                        │  │ │
│   │  │                                                               │  │ │
│   │  │  Тема: Административни пречки                                 │  │ │
│   │  └────────────────────────────────────────────────────────────── │  │ │
│   │                                                                     │ │
│   │  ┌── SubmissionStatusCard (rejected) ───────────────────────────┐  │ │
│   │  │  [Badge "Отхвърлено" destructive]     09 май 2026            │  │ │
│   │  │                                                               │  │ │
│   │  │  Отпускане на субсидии за…                                    │  │ │
│   │  │  (title, heading 24px)                                        │  │ │
│   │  │                                                               │  │ │
│   │  │  Тема: Достъп до финансиране                                  │  │ │
│   │  │  ──────────────────────────────                               │  │ │
│   │  │  Бележка от редактора:                                        │  │ │
│   │  │  "Предложението не отговаря на насоките…"                     │  │ │
│   │  │  (italic, body 16px, border-l-2 border-muted pl-3)           │  │ │
│   │  └────────────────────────────────────────────────────────────── │  │ │
│   │                                                                     │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────────────┤
│ Footer                                                                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**Status badge variants:**

| Status | Badge classes | Icon |
|--------|---------------|------|
| pending | `bg-warning/10 text-warning border border-warning/20` | `Clock` lucide, size-3 |
| approved | `bg-success/10 text-success border border-success/20` | `CheckCircle2` lucide, size-3 |
| rejected | `bg-destructive/10 text-destructive border border-destructive/20` | `XCircle` lucide, size-3 |

Status badge copy (locked — add to `messages/bg.json` under `submission.status.*`):
- `pending`: "Изчаква преглед"
- `approved`: "Одобрено"
- `rejected`: "Отхвърлено"

**Rejection note display:**

Only visible when `status === 'rejected'` AND a non-empty moderator note exists. Rendered as a blockquote-style element: `<div className="mt-3 border-l-2 border-muted pl-3 text-sm text-muted-foreground italic">`. Prefix label "Бележка от редактора:" in `font-semibold not-italic` then the note text in italic. If moderator submitted no note, the section is absent (not "Без бележка" — just omitted).

**Empty state (no submissions yet):**

Centered, py-16. Heading 24px: "Все още нямаш подадени предложения." Body 16px muted-fg: "Подай своето първо предложение за политическо решение." Primary CTA `<Button asChild><Link href="/member/предложи">`: "Предложи идея".

---

### S6 — `/member/сигнали` Member Problem Report Status List (PROB-05)

**Focal point:** Status badges in the most-recent (top) card row — same pattern as S5. The badge communicates the moderation outcome before the member reads the excerpt.

Mirrors S5 structure with these differences:
- H1: "Мои сигнали"
- "+" button: `<Link href="/member/сигнализирай">` "+ Нов сигнал"
- Card shows: status badge + date + excerpt of description (first 80 chars, ellipsized) + level tag ("Местно — Пловдив" or "Централно ниво") + topic.
- Rejection note: same pattern as S5.
- Empty state heading: "Все още нямаш подадени сигнали." Body: "Сигнализирай за проблем, засягащ твоя бизнес." CTA: "Изпрати сигнал".

---

### S7 — `/admin/views/moderation-queue` Editorial Queue (EDIT-04, EDIT-05, EDIT-06)

**Focal point:** Queue `<Table>` top row — the oldest/most-urgent pending item. The editor's attention should resolve to the table immediately, with the pending-count summary in the H1 subtext as orientation. The Tabs (Предложения / Сигнали) are secondary navigation.

This view lives inside Payload Admin and follows the Payload `Gutter` layout — same pattern as Phase 2.1's `/admin/views/attribution`. It is NOT a Next.js frontend route.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Payload Admin shell (left nav, header)                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ <Gutter>                                                                    │
│                                                                             │
│   <h1 heading 24px>  Опашка за модерация                                   │
│   <p body muted-fg>  Изчакващи преглед: {pendingCount} предложения,         │
│                      {pendingProbCount} сигнала                             │
│                                                                             │
│   pt-6 (lg)                                                                 │
│   ┌─── <Tabs defaultValue="proposals"> ──────────────────────────────────┐  │
│   │  [Предложения ({n})]  [Сигнали ({n})]                                │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│   ┌─── Queue <Table> ───────────────────────────────────────────────────┐  │
│   │  Подадено    │  Тип       │  Заглавие / Откъс  │  Подател   │  Действие │
│   │  ──────────  │  ──────── │  ─────────────────  │  ─────────  │  ────────│
│   │  14 май 9:03 │  Предл.   │  Намаляване на ДДС… │  Иван И.   │  [Прегл.]│
│   │  14 май 8:41 │  Сигнал   │  Административни …  │  Мария П.  │  [Прегл.]│
│   └────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│   [Pending only by default; toggle to show All / Approved / Rejected]      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Queue table columns:**

- **Подадено:** `createdAt` timestamp, formatted as "14 май 09:03". 14px muted-fg. Rows older than 72 hours display the date in `text-warning` to signal stale items.
- **Тип:** "Предложение" or "Сигнал" as a `<Badge variant="outline">` chip (no color distinction — type is informational, not a status signal).
- **Заглавие / Откъс:** first 100 chars of title (proposals) or description (problem reports), ellipsized. Body 16px. Clicking opens the inline review panel (see below).
- **Подател:** `full_name` of the submitting member. 16px. This is the editor-facing identity surface per D-C1 — editors see full name. NOT shown on any public surface.
- **Действие:** `<Button variant="outline" size="sm">` "Прегледай заявката" — opens the review drawer/dialog. The explicit noun-phrase label (not "Прегледай" alone) is required in the table context where the button must convey its object: the submission being reviewed, not a generic review action.

**Filter toggle (status filter):**

Row of `<Button variant="ghost">` filters: "Изчаква (N)" | "Одобрени" | "Отхвърлени" | "Всички". Active filter: `variant="default"` (filled navy). Positioned above the table, right-aligned.

**Review Panel (opens on "Прегледай заявката" click):**

Implemented as a `<Dialog>` (not a drawer — modal is cleaner in Payload admin context; drawers risk Payload nav collision). `max-w-2xl`.

```
┌─── Dialog ─────────────────────────────────────────────────────┐
│  Преглед на [предложение / сигнал]          [✕ Close]           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  === SUBMITTER (internal only — D-C1) ===                      │
│  Подател: Иван Иванов (ivan@example.com)                       │
│  Регистриран: 2026-04-10 · Канал: имейл                        │
│  Роля: Собственик, Сектор: ИТ                                  │
│  Източник: QR-кампания / Пловдив                               │
│  (Small text, muted, behind collapsible <Accordion>            │
│   "Виж подробности за подателя" — hidden by default)           │
│                                                                │
│  === SUBMISSION CONTENT ===                                    │
│  Заглавие: Намаляване на ДДС за малки предприятия             │
│  Тема: Данъчна тежест                                          │
│  Описание:                                                     │
│    [Full text of proposal body — rendered as plain text,       │
│     NOT Lexical rich text — submissions are plain text         │
│     input from the member form]                                │
│                                                                │
│  [For problem reports only:]                                   │
│  Ниво: Местно — Пловдив                                       │
│                                                                │
│  ─────────────────────────────────────────────────            │
│                                                                │
│  === MODERATION ACTION ===                                     │
│  <Label> Бележка (задължителна при отхвърляне)                │
│  <Textarea rows={3} placeholder="Причина за решението...">    │
│                                                                │
│  <div className="flex gap-3 justify-end mt-4">                │
│    <Button variant="destructive" onClick={openRejectConfirm}> │
│      Отхвърли                                                  │
│    </Button>                                                   │
│    <Button variant="default" onClick={openApproveConfirm}>    │
│      Одобри                                                    │
│    </Button>                                                   │
│  </div>                                                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Submitter identity accordion (D-C1 internal privacy gradient):**

Collapsed by default — editor must explicitly open "Виж подробности за подателя" to see full identity. This satisfies the "explicit-action-with-audit-log" model mentioned in CONTEXT.md Claude's Discretion. The accordion expand action does NOT generate a `moderation_log` entry (opening the panel is not itself a moderation action). Only approve/reject/suspend generate log entries.

**Approve confirmation `<Dialog>` (nested, opened from review panel):**

Simple 2-button confirm: Heading "Одобри предложението?" Body: "Предложението ще стане видимо публично на страница /предложения." Actions: `<Button variant="outline">` "Не одобрявай" + `<Button variant="default">` "Одобри".

> Dismiss label is action-specific ("Не одобрявай") — not generic "Отказ" — so the editor's intent is unambiguous: clicking the outline button explicitly cancels the approve action, not some other action.

**Reject confirmation `<Dialog>` (nested):**

Heading "Отхвърли предложението?" Body: "Членът ще види статус 'Отхвърлено' и бележката ти." Validates that `moderatorNote` is non-empty before enabling the confirm button — server-side Zod also enforces this. Actions: `<Button variant="outline">` "Не отхвърляй" + `<Button variant="destructive">` "Отхвърли".

> Dismiss label is action-specific ("Не отхвърляй") — not generic "Отказ" — so the editor clearly understands the outline button cancels the rejection, not the review session.

**Suspend member action (EDIT-06):**

Exposed only to `editor` and `super_editor` roles. Located in the submitter identity accordion section — a `<Button variant="destructive" size="sm">` "Спри акаунта" at the bottom of the accordion. Opens a separate `<Dialog>`:

Heading: "Спри акаунта на {full_name}?" Body: "Посочи причина — тя ще бъде записана в журнала на модерацията." `<Textarea rows={2} required>`. Actions: `<Button variant="outline">` "Не спирай акаунта" + `<Button variant="destructive">` "Спри акаунта". Reason is mandatory (server Zod enforces `minLength(10)`).

> Dismiss label is action-specific ("Не спирай акаунта") — not generic "Отказ" — consistent with the approve and reject confirmation dialog pattern.

**Super-editor override action:**

For a submission that is already `approved` or `rejected`, `super_editor` sees an additional `<Button variant="ghost" size="sm" className="text-muted-foreground">` "Промени решението" inside the review panel. Opens a dialog: "Сигурен ли си? Ще трябва да добавиш бележка за причината." With a required `<Textarea>`. This overrides the prior decision and writes to `moderation_log` with `action=super_editor_override`.

---

## Member Dashboard Integration (MEMB-01)

Phase 3 plans a `/member` dashboard with "My Activity" panel (MEMB-01). Phase 4 extends it with:

- **"Мои предложения" card:** count badge + link to `/member/предложения`. If no submissions: "Предложи идея →" CTA link. Card uses the same `<Card>` component and layout as the Phase 3 My Activity panel additions.
- **"Мои сигнали" card:** count badge + link to `/member/сигнали`. If no reports: "Сигнализирай →" CTA link.

Since Phase 3's member dashboard may not have shipped when Phase 4 executes (Phase 3 is blocked), the planner must handle two cases:
1. Phase 3 dashboard exists: add the two new cards to the existing grid.
2. Phase 3 dashboard does not exist: create a minimal `/member` extension with just the two new cards in the Phase 3 reserved grid slot. Do NOT redesign the full `/member` page — use the Phase 3 UI-SPEC §S4 container and card pattern as the guide.

---

## Copywriting Contract

All strings below are working drafts. Final strings MUST be locked into `messages/bg.json` under stable namespaces BEFORE source file authoring, per the D-25 string-lock pattern (Phase 3 plan 03-01 precedent). Namespaces: `submission.*`, `problem.*`, `admin.queue.*`, `admin.moderation.*`.

| Element | Copy | bg.json key |
|---------|------|-------------|
| `/предложения` H1 | "Предложения от общността" | `submission.proposals.pageTitle` |
| `/предложения` subheading | "Одобрените предложения на членовете на коалицията." | `submission.proposals.pageDescription` |
| Voting-soon notice | "Гласуването по предложенията предстои. Следете за обновления." | `submission.proposals.votingSoon` |
| Proposal card attribution | "Член на коалицията" | `submission.proposals.anonymousByline` |
| `/предложения` empty state H | "Предложенията скоро ще се появят тук." | `submission.proposals.emptyHeading` |
| `/предложения` empty state body | "Бъди първият — изпрати предложение за политическо решение." | `submission.proposals.emptyBody` |
| `/предложения` empty CTA | "Предложи идея" | `submission.proposals.emptyCta` |
| `/проблеми` H1 | "Сигнали за проблеми" | `problem.heatmap.pageTitle` |
| `/проблеми` subheading | "Агрегирани сигнали на членовете на коалицията по области." | `problem.heatmap.pageDescription` |
| `/проблеми` suppressed tooltip | "данните са недостатъчни" | `problem.heatmap.suppressed` |
| `/проблеми` empty state | "Все още нямаме достатъчно сигнали за показване. Изпрати сигнал и помогни да картографираме проблемите на МСП сектора." | `problem.heatmap.emptyBody` |
| Proposal form H1 | "Предложи политическо решение" | `submission.proposal.formTitle` |
| Proposal form description | "Предложенията минават модерация и след одобрение стават видими за всички членове." | `submission.proposal.formDescription` |
| Proposal form CTA | "Изпрати предложение" | `submission.proposal.submitCta` |
| Problem form H1 | "Сигнализирай за проблем" | `submission.problem.formTitle` |
| Problem form description | "Сигналите минават модерация. Публично се показват само агрегирано по области — без лично идентифициране." | `submission.problem.formDescription` |
| Problem form CTA | "Изпрати сигнал" | `submission.problem.submitCta` |
| Status: pending | "Изчаква преглед" | `submission.status.pending` |
| Status: approved | "Одобрено" | `submission.status.approved` |
| Status: rejected | "Отхвърлено" | `submission.status.rejected` |
| Rejection note prefix | "Бележка от редактора:" | `submission.status.rejectionNotePrefix` |
| My proposals H1 | "Мои предложения" | `submission.myProposals.pageTitle` |
| My proposals empty H | "Все още нямаш подадени предложения." | `submission.myProposals.emptyHeading` |
| My proposals empty body | "Подай своето първо предложение за политическо решение." | `submission.myProposals.emptyBody` |
| My problems H1 | "Мои сигнали" | `submission.myProblems.pageTitle` |
| My problems empty H | "Все още нямаш подадени сигнали." | `submission.myProblems.emptyHeading` |
| My problems empty body | "Сигнализирай за проблем, засягащ твоя бизнес." | `submission.myProblems.emptyBody` |
| Success toast (proposal) | "Предложението е изпратено за преглед." | `submission.proposal.successToast` |
| Success toast (problem) | "Сигналът е изпратен за преглед." | `submission.problem.successToast` |
| Rate limit error | "Превишаваш допустимата честота на подаване. Опитай отново след {n} минути." | `submission.error.rateLimit` |
| Unverified member gate | "Потвърди имейла си, за да подаваш предложения." | `submission.gate.unverified` |
| Admin queue H1 | "Опашка за модерация" | `admin.queue.pageTitle` |
| Admin queue pending summary | "Изчакващи преглед: {proposals} предложения, {problems} сигнала" | `admin.queue.pendingSummary` |
| Admin queue tab: proposals | "Предложения" | `admin.queue.tabProposals` |
| Admin queue tab: problems | "Сигнали" | `admin.queue.tabProblems` |
| Admin queue action button | "Прегледай заявката" | `admin.queue.reviewAction` |
| Admin approve confirm heading | "Одобри предложението?" | `admin.moderation.approveHeading` |
| Admin approve body | "Предложението ще стане видимо публично на страница /предложения." | `admin.moderation.approveBody` |
| Admin approve dismiss | "Не одобрявай" | `admin.moderation.approveDismiss` |
| Admin reject confirm heading | "Отхвърли предложението?" | `admin.moderation.rejectHeading` |
| Admin reject body | "Членът ще види статус 'Отхвърлено' и бележката ти." | `admin.moderation.rejectBody` |
| Admin reject dismiss | "Не отхвърляй" | `admin.moderation.rejectDismiss` |
| Admin suspend confirm heading | "Спри акаунта на {name}?" | `admin.moderation.suspendHeading` |
| Admin suspend body | "Посочи причина — тя ще бъде записана в журнала на модерацията." | `admin.moderation.suspendBody` |
| Admin suspend dismiss | "Не спирай акаунта" | `admin.moderation.suspendDismiss` |
| Admin action button: approve | "Одобри" | `admin.moderation.approveAction` |
| Admin action button: reject | "Отхвърли" | `admin.moderation.rejectAction` |
| Admin action button: suspend | "Спри акаунта" | `admin.moderation.suspendAction` |
| Anonymous problem byline | "Анонимен сигнал" | `problem.anonymousByline` |

**Canonical attribution strings (D-C1 — do NOT introduce variants):**

- Public proposals byline: `"Член на коалицията"` — this exact string only.
- Public problem reports: `"Анонимен сигнал"` — this exact string only.
- Variants like "Анонимен член", "Гражданин", "Потребител" are prohibited.

**Confirmation dialog dismiss label contract:**

Each destructive-or-irreversible confirmation dialog uses an action-specific dismiss label — never the generic "Отказ":

| Dialog | Confirm CTA | Dismiss label | Rationale |
|--------|-------------|---------------|-----------|
| Approve confirmation | "Одобри" | "Не одобрявай" | Mirrors the action verb; editor knows exactly what is being cancelled |
| Reject confirmation | "Отхвърли" | "Не отхвърляй" | Same pattern |
| Suspend confirmation | "Спри акаунта" | "Не спирай акаунта" | Same pattern; the lengthier label is warranted for the highest-impact action |

---

## Components Inventory

### New member-facing components (create in `src/components/`)

| Component | Path | shadcn primitives used |
|-----------|------|------------------------|
| `ProposalCard` | `src/components/proposals/ProposalCard.tsx` | `card`, `badge` |
| `SubmissionStatusCard` | `src/components/submissions/SubmissionStatusCard.tsx` | `card`, `badge` |
| `ProposalForm` | `src/components/forms/ProposalForm.tsx` | `form`, `input`, `textarea`, `select`, `button`, `separator` |
| `ProblemReportForm` | `src/components/forms/ProblemReportForm.tsx` | `form`, `textarea`, `select`, `radio-group`, `button`, `separator` |
| `OblastMap` | `src/components/problems/OblastMap.tsx` | `tooltip` (Radix via shadcn) |
| `OblastBreakdownTable` | `src/components/problems/OblastBreakdownTable.tsx` | `table` |

### New admin components (create in `src/app/(payload)/admin/views/moderation-queue/`)

| Component | Notes |
|-----------|-------|
| `ModerationQueueView.tsx` | RSC root; role gate; fetches queue data |
| `QueueTable.tsx` | Client component; uses shadcn `table`, `tabs`, `badge`, `button` |
| `ReviewDialog.tsx` | Client modal; uses `dialog`, `accordion`, `textarea`, `button` |
| `ConfirmActionDialog.tsx` | Reusable nested confirm; used for approve / reject / suspend; accepts `confirmLabel`, `dismissLabel`, `heading`, `body` props — enforces action-specific dismiss label contract at component level |

---

## Interaction States Reference

| State | Visual | Aria |
|-------|--------|------|
| Form submitting | Submit button `disabled` + `<Loader2 className="size-4 animate-spin mr-2">` prefix inside button; label unchanged | `aria-busy="true"` on form |
| Form field error | Red `text-destructive` message below field; field gets `aria-invalid="true"` + `aria-describedby` pointing to error | `role="alert"` on first error |
| Rate limited | `<Alert variant="destructive">` replaces submit button area (button hidden, not just disabled); auto-dismisses after rate window expires | `role="alert"`, `aria-live="polite"` |
| Submission success | Redirect to status list + Sonner success toast | Toast has `role="status"` |
| Moderation action pending | Dialog action buttons `disabled` + spinner; table row becomes `opacity-50` | `aria-busy="true"` on confirm button |
| Admin page loading | `<Skeleton>` rows in table (same height as real rows) | `aria-busy="true"` on table container |
| Queue empty | Empty state card (centered, py-16) | Heading with `role="status"` if count just changed to zero |
| Suspended account form gate | `<Alert>` "Акаунтът ти е временно спрян. За въпроси се свържи с нас." — replaces submission form entirely | `role="alert"` |

---

## Accessibility Requirements

- All form fields have explicit `<Label htmlFor>` association — no placeholder-only labels.
- `<Select>` for oblast uses `aria-label="Избери област"` when `<Label>` is conditionally hidden.
- `<RadioGroup>` for level selector has `aria-required="true"` on the group and a visible group label.
- SVG map paths: `role="img"` + `aria-label="${oblastName}: ${count} сигнала"` (or suppressed copy) + `tabIndex={0}` for keyboard focus. Map container has `role="group"` + `aria-label="Карта на сигналите по области"`.
- Color is never the ONLY differentiator for status — badge text always includes the status word in addition to color.
- Moderation dialog has `aria-labelledby` pointing to the dialog heading.
- Reduced motion: the conditional show/hide of the oblast `<Select>` uses `transition-opacity duration-200` — under `prefers-reduced-motion: reduce` (already in `globals.css`), this resolves to `0.01ms` per the existing rule.

---

## Registry Safety

| Registry | Components Declared | Safety Gate |
|----------|---------------------|-------------|
| shadcn official (`ui.shadcn.com`) | `badge`, `separator`, `skeleton`, `table`, `textarea` | Not required — official registry |
| Third-party | None | Not applicable |

---

## Pre-population Sources

| Decision / Value | Source |
|-----------------|--------|
| Design system (shadcn new-york, slate, lucide) | `components.json` + Phase 1 plan 01-04 |
| Color tokens (all) | `src/styles/globals.css` `@theme` block |
| Spacing scale | Phase 2 UI-SPEC §3.2 (locked) |
| Typography scale (3 weights: 400/600/800) | Phase 2 UI-SPEC §3.2 (approved, 6/6 PASS) + Phase 3 UI-SPEC §Typography (approved) |
| Container tokens | `globals.css` `@theme` (`--container-form`, `--container-prose`, `--container-page`) |
| 44px touch target exception | Phase 1 + Phase 3 pattern |
| Cyrillic typography rules | Phase 3 UI-SPEC §Typography |
| Anonymous byline strings | 04-CONTEXT.md D-C1 + 04-DISCUSSION-LOG.md |
| Heat-map approach | 04-CONTEXT.md D-D1 + D-D2 |
| N<5 suppression | 04-CONTEXT.md D-D2 |
| Voting-soon notice on `/предложения` | 04-CONTEXT.md D-B1 |
| Two roles (editor / super_editor) | 04-CONTEXT.md D-A2 |
| Public page slug `/предложения` working slug | 04-CONTEXT.md D-B1 |
| Public page slug `/проблеми` working slug | 04-CONTEXT.md D-D1 |
| Turnstile + Upstash rate-limit pattern | 04-CONTEXT.md code_context + Phase 1 |
| D-25 string-lock contract | 04-CONTEXT.md + Phase 3 plan 03-01 precedent |
| Admin view pattern (Payload Gutter + RSC) | Phase 2.1 attribution view pattern |
| Oblast names source | `messages/bg.json` `oblast.*` (Phase 2.1) |
| Action-specific dismiss labels (confirm dialogs) | Checker FLAG Dimension 1 — applied 2026-05-10 revision |
| "Прегледай заявката" explicit CTA in queue | Checker FLAG Dimension 1 — applied 2026-05-10 revision |
| Focal point declarations per surface | Checker FLAG Dimension 2 — applied 2026-05-10 revision |
| 3-weight inherited-contract callout | Checker BLOCK Dimension 4 — resolved 2026-05-10 revision |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS (inherited 3-weight system — Phase 2 approved + Phase 3 approved; Phase 4 introduces zero new weights)
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
