---
phase: 6
slug: gdpr-self-service-hardening
status: draft
created: 2026-05-15
shadcn_initialized: true
preset: existing-project (style=new-york, baseColor=slate, cssVariables=true, iconLibrary=lucide)
---

# Phase 6 — UI Design Contract: GDPR Self-Service + Hardening

> Visual and interaction contract for the **member-facing GDPR self-service surfaces**: the new "Права върху данните" section appended to `/member/preferences`, the typed-confirm account-deletion modal, the deletion-grace lockout page `/account-pending-deletion`, the OTP-protected cancel-deletion flow, and the toast/inline feedback states for data-export requests.
>
> **Locked decisions from `06-CONTEXT.md` D-01..D-12 are NOT re-debated here.** This document encodes them visually. All Phase 2 + Phase 3 + Phase 4 design tokens are inherited without modification — **Phase 6 introduces zero new CSS custom properties, zero new color tokens, zero new typography sizes, and zero new spacing values.**

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (initialized — see `components.json`) |
| Preset | `style=new-york`, `baseColor=slate`, `cssVariables=true`, `prefix=""`, `tsx=true`, `rsc=true` |
| Component library | Radix UI (via shadcn/ui copies under `@/components/ui`) |
| Icon library | `lucide-react` |
| Font | Gilroy ExtraBold display (`--font-display`); Roboto body (`--font-sans`) — both loaded via `next/font` in `src/lib/fonts.ts` |
| Token source | `src/styles/theme.css` `@theme` block — DO NOT add new tokens |
| Brand inheritance | Phase 2 Sinya tokens (primary navy `#004A79`, cyan `#3AC7FF`, white/slate neutrals). **NO new tokens in Phase 6.** |

**Pre-installed shadcn components reused (no new installs needed):**

`alert`, `button`, `card`, `dialog`, `form`, `input`, `label`, `separator`, `sonner` (Toaster), `tooltip`

**New shadcn components to add (official registry only):**

- **None.** Phase 6 surfaces are buildable entirely from the existing component set. The typed-confirm pattern uses the existing `Dialog` primitive (NOT `alert-dialog` — Dialog has the dismissible escape semantics we want for a non-blocking destructive flow; `AlertDialog` would force keyboard-trap-without-escape semantics that misalign with a destructive UX where the user must be free to abort easily).

> Registry safety: zero new third-party registries declared for Phase 6. Vetting gate is **not applicable**.

---

## Layout and Container Strategy

| Surface | Container token | Max width | Notes |
|---------|-----------------|-----------|-------|
| `/member/preferences` "Права върху данните" section | `--container-prose` (existing — inherited from current page; `MainContainer width="legal"`) | 768px | Extends existing preferences page — no container change |
| Typed-confirm deletion `<Dialog>` | shadcn `DialogContent` default | `sm:max-w-lg` (existing default ≈512px) | Modal centered overlay — no override |
| `/account-pending-deletion` lockout page | `--container-form` via `MainContainer width="form"` | 480px | Mirrors `/suspended` page width contract |
| Cancel-deletion OTP entry page (post-CTA-click) | `--container-form` via `MainContainer width="form"` | 480px | Reuses Phase 1 OTP entry form layout |

Existing Phase 2 chrome (`Header`, `Footer`, `MainContainer`) is reused without modification. **The locked-out user does NOT see the standard Header navigation** — the `/account-pending-deletion` route renders a minimal layout (logo + footer only) so the user cannot wander into authenticated surfaces while a deletion is pending. See S3 below.

---

## Spacing Scale

Inherited from Phase 2 UI-SPEC §3.2 and re-stated in Phase 4 UI-SPEC §Spacing. Restated here for checker validation:

| Token | Value | Usage in Phase 6 |
|-------|-------|------------------|
| xs | 4px | Icon-to-text gap in destructive button label; helper-text margin-top under inputs |
| sm | 8px | Spacing between consecutive `<p>` blocks in legal explanation copy; modal label-to-input gap |
| md | 16px | Default field-to-field gap in deletion modal; card content padding-x |
| lg | 24px | Vertical spacing between preferences cards (existing); space between explainer block and destructive action block in Права-върху-данните card |
| xl | 32px | Spacing between Page H1 and first card (existing); spacing between Права-върху-данните card and adjacent preferences cards |
| 2xl | 48px | Page top padding below sticky 80px header (existing) |
| 3xl | 64px | Page-level padding-y on `/account-pending-deletion` (mirrors `/suspended` rhythm) |

Exceptions:
- **Destructive button minimum touch target:** `44px` height via `min-h-[44px]` on `<Button variant="destructive" size="lg">` for the "Изтрий акаунта" trigger and the modal-confirm button. WCAG 2.5.5. Same pattern as Phase 3 vote buttons + Phase 4 submission buttons.
- **Typed-confirm `<Input>` height:** keep default `h-9` (36px) — input is keyboard-only entry, no fat-finger risk. Label provides 44px effective touch target when tapping to focus.

---

## Typography

> **INHERITED CONTRACT — LOCKED.** Phase 6 uses the project-wide 3-weight system: **400 Roboto regular**, **600 Roboto semibold**, **800 Gilroy ExtraBold** (display). Phase 2 + Phase 3 + Phase 4 UI-SPECs all approved this system at 6/6 PASS. Phase 6 introduces **zero new weights**.

All roles use sizes already declared in `theme.css` `@theme`. Phase 6 picks from the existing 8-size ramp; **NO new sizes**.

| Role | Size | Token | Weight | Line Height | Used For (Phase 6) |
|------|------|-------|--------|-------------|--------------------|
| Body | 16px | `--text-base` (1rem) | 400 Roboto regular | 1.5 (`--leading-normal`) | Legal explainer paragraphs in Права-върху-данните card; modal description body; lockout page body copy; helper text under typed-confirm input |
| Label | 14px | `--text-sm` (0.875rem) | 600 Roboto semibold | 1.5 (`--leading-normal`) | "Тип запис: JSON" mini-detail; "Последно искане: {timestamp}" line; typed-confirm input `<Label>` |
| Caption | 12px | `--text-xs` (0.75rem) | 400 Roboto regular | 1.5 | Helper text under typed-confirm input ("Чувствително към главни букви и кирилица"); helper text under "Изтегли данните" button ("Връзката ще пристигне по имейл и важи 7 дни"); date format on grace-period page |
| Heading | 24px | `--text-2xl` (1.5rem) | 800 Gilroy ExtraBold (`--font-display`) | 1.2 (`--leading-snug`) | Card title "Права върху данните"; modal `DialogTitle` "Изтриване на акаунта"; grace-period page H1 "Акаунтът ви е насрочен за изтриване" |
| Display | 36px | `--text-4xl` (2.25rem) | 800 Gilroy ExtraBold | 1.15 (`--leading-tight`) | NOT used in Phase 6 — all Phase 6 surfaces are sub-page sections or modal contexts; no Phase 6 surface owns a top-level page H1 of its own except `/account-pending-deletion`, which uses heading-24 to match the muted-gravity tone of the `/suspended` precedent rather than display-36 |

Cyrillic rules (inherited verbatim from Phase 3):
- **No `letter-spacing` adjustments** on Bulgarian text — apply nowhere in Phase 6 surfaces.
- **`hyphens: manual` only** on legal explainer paragraphs in the Права-върху-данните card.
- **`text-wrap: balance`** on the grace-period page H1 only (it's a longer Bulgarian sentence).
- **`font-feature-settings: "tnum"`** on the deletion date string and "Последно искане" timestamp.

---

## Color (60/30/10 — inherited from Phase 2)

Phase 2 shipped the Sinya palette. Phase 6 inherits without redefinition.

| Role | Token | Hex | Usage in Phase 6 |
|------|-------|-----|------------------|
| Dominant 60% | `--color-background` / `--color-surface` / `--color-muted` | `#FFFFFF` / `#F1F5F9` | Preferences page bg (existing); Права-върху-данните card bg; modal bg; lockout page bg |
| Secondary 30% | `--color-secondary` / `--color-border` / `--color-muted-foreground` | `#3AC7FF` / `#E2E8F0` / `#475569` | Card border + separator inside card; helper-text muted-fg; "Последно искане" timestamp |
| Accent 10% | `--color-primary` | `#004A79` | **See reserved-for list below — exhaustive** |
| Destructive | `--color-destructive` | `#DC2626` | "Изтрий акаунта" trigger button (variant=destructive); "Изтрий завинаги" confirmation button inside modal; grace-period page H1 color; modal warning bullets icon color; deletion-pending alert border + foreground |

### Accent (`--color-primary` `#004A79`) reserved-for list — EXHAUSTIVE

Phase 6 uses the Sinya navy accent ONLY for:

1. **"Заявка за извличане на данни" CTA button** in the Права-върху-данните card — `<Button variant="default" size="default">`. This is the constructive (non-destructive) primary action.
2. **"Отказване на изтриването" CTA button** on the `/account-pending-deletion` lockout page — `<Button variant="default" size="lg">`. Despite being on a destructive-context page, the cancel-deletion action itself is constructive (restoring the account), so it earns the primary accent.
3. **Body-copy `<Link>` to privacy policy** inside the Права-върху-данните card explanation — `text-primary underline-offset-4 hover:underline` (same pattern as existing preferences page links).

**Explicitly NOT accent:**
- "Изтрий акаунта" trigger button: uses `variant="destructive"` (red), NOT primary.
- "Изтрий завинаги" confirmation button inside the modal: uses `variant="destructive"` (red).
- Typed-confirm input border in default state: uses default `border-input`, NOT primary.
- Cancel button inside deletion modal: uses `variant="outline"` (neutral border), NOT primary — pulling away from a destructive action should not feel rewarded with the brand color.

---

## Surface-by-Surface Visual Spec

### S1 — `/member/preferences` "Права върху данните" Section (D-01, D-04)

**Focal point:** The card title "Права върху данните" + the explainer paragraph immediately below. The user reads "this is where my data rights live", then resolves to two clearly-differentiated action zones — a constructive zone (export) and a destructive zone (delete). The eye should NOT land on the red button first; the explainer establishes legitimacy and informed consent before action.

This section is **appended to the bottom of `/member/preferences`**, after the existing "Език" card and before the bottom links row. It is the LAST card on the page so the destructive action is at the end of a deliberate scroll-and-read flow — not adjacent to less-consequential newsletter toggles.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ (existing Header + page chrome)                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  (existing eyebrow + H1 + lead — unchanged)                              │
│  (existing Email card — unchanged)                                       │
│  (existing Channel card — unchanged)                                     │
│  (existing Language card — unchanged)                                    │
│                                                                          │
│  pt-8 (xl)                                                               │
│   ┌─── Card "Права върху данните" ─────────────────────────────────────┐ │
│   │                                                                     │ │
│   │  <CardHeader>                                                       │ │
│   │    <CardTitle> Права върху данните                                  │ │
│   │    <CardDescription> Управлявайте личните си данни според GDPR.    │ │
│   │  </CardHeader>                                                      │ │
│   │                                                                     │ │
│   │  <CardContent className="space-y-6">                                │ │
│   │                                                                     │ │
│   │    {/* Explainer block — informed consent context */}              │ │
│   │    <p body 16/1.5>                                                  │ │
│   │      Имате право да изтеглите всички ваши лични данни или да       │ │
│   │      изтриете акаунта си. Подробности за това какво пазим и за     │ │
│   │      колко време — в [политиката за поверителност](/privacy).     │ │
│   │    </p>                                                             │ │
│   │                                                                     │ │
│   │    <Separator />                                                    │ │
│   │                                                                     │ │
│   │    {/* Constructive zone — Data Export */}                         │ │
│   │    <div className="space-y-3">                                      │ │
│   │      <h3 label 14/1.5 font-semibold> Извличане на данните          │ │
│   │      <p body 16/1.5 muted-fg>                                      │ │
│   │        Ще получите по имейл линк за изтегляне на всички ваши       │ │
│   │        данни в JSON формат. Линкът важи 7 дни.                    │ │
│   │      </p>                                                          │ │
│   │      <Button variant="default" size="default">                     │ │
│   │        Заявка за извличане на данни                                │ │
│   │      </Button>                                                     │ │
│   │      {/* If a previous export request exists: */}                  │ │
│   │      <p caption 12/1.5 muted-fg>                                   │ │
│   │        Последно искане: {formattedDate}                            │ │
│   │      </p>                                                          │ │
│   │    </div>                                                          │ │
│   │                                                                     │ │
│   │    <Separator />                                                    │ │
│   │                                                                     │ │
│   │    {/* Destructive zone — Account Deletion */}                     │ │
│   │    <div className="space-y-3">                                      │ │
│   │      <h3 label 14/1.5 font-semibold text-destructive>              │ │
│   │        Изтриване на акаунта                                         │ │
│   │      </h3>                                                          │ │
│   │      <p body 16/1.5 muted-fg>                                      │ │
│   │        След потвърждение акаунтът ви ще бъде заключен за 30 дни   │ │
│   │        и след това изтрит. През този период можете да отмените     │ │
│   │        изтриването с вход в системата.                             │ │
│   │      </p>                                                          │ │
│   │      <Button variant="destructive" size="lg" min-h-[44px]>         │ │
│   │        Изтрий акаунта                                              │ │
│   │      </Button>                                                     │ │
│   │    </div>                                                           │ │
│   │                                                                     │ │
│   │  </CardContent>                                                     │ │
│   │                                                                     │ │
│   └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  (existing bottom links row — unchanged)                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Behavior — Data export:**

- Click "Заявка за извличане на данни" → fires Server Action that enqueues a BullMQ `data-export` job (D-01) → server returns success → toast appears (Sonner, `role="status"`): "Заявката е изпратена. Ще получите имейл с линк за изтегляне до 30 минути."
- Button becomes `disabled` for 5 minutes after success (anti-double-fire); shows label "Заявката е изпратена" with `<CheckCircle2 className="size-4" />` icon prefix. After 5 minutes the button re-enables with the original label so re-requesting is possible (e.g., email lost).
- The "Последно искане: {timestamp}" line is rendered server-side based on the latest `users.export_requested_at` value. On a fresh page where no prior request exists, this line is omitted entirely.
- If the user's most recent export download URL expired AND a new request has not yet been made (a state surfaced via a `users.last_export_expired_at IS NOT NULL` flag the worker sets when the signed URL expires), an inline `<Alert>` appears below the button: "Връзката от предишното изтегляне е изтекла. Заявете ново извличане за нов линк." — caption 12/1.5, `text-muted-foreground`, no destructive variant (this is informational, not an error).

**Behavior — Account deletion trigger:**

- Click "Изтрий акаунта" → opens the typed-confirm `<Dialog>` (S2).
- Button is NOT `disabled` based on any state — every authenticated active member can initiate deletion. (If the user is already in `pending_deletion` status, they cannot reach this page at all — the lockout redirect from S3 fires first.)

**Empty / loading states:**

- This section renders **always** for an authenticated active member — there is no empty state at the card level.
- Server reads `users.export_requested_at` server-side; no client-side fetch, no skeleton needed.

---

### S2 — Typed-Confirm Deletion Modal (D-04)

**Focal point:** The bold "ИЗТРИЙТЕ" target string inside the typed-confirm input area. The user's eye flows: title ("Изтриване на акаунта") → warning bullets (what will happen) → labeled instruction ("Въведете точно `ИЗТРИЙТЕ` за потвърждение") → empty input field with a clear "type-this-here" affordance → the destructive confirm button (disabled until match). Friction is deliberate: re-reading the consequences before any button enables.

This modal opens from the S1 "Изтрий акаунта" trigger. Component: shadcn `Dialog` (NOT `AlertDialog`). Rationale: a destructive action MUST be cancelable trivially (Escape, click-outside, close-button) without keyboard-trap pressure, because a misclicked open-trigger should be effortlessly recoverable.

```
┌─── Dialog (max-w-lg, centered) ───────────────────────────────────────┐
│                                                                        │
│   ✕ Close (top-right, existing DialogContent default)                 │
│                                                                        │
│   <DialogHeader>                                                       │
│     <DialogTitle heading 24/1.2 text-destructive>                      │
│       Изтриване на акаунта                                              │
│     </DialogTitle>                                                     │
│     <DialogDescription body 16/1.5 muted-fg>                          │
│       Това действие стартира 30-дневен период преди окончателно       │
│       изтриване. Прочетете внимателно какво се случва.                │
│     </DialogDescription>                                              │
│   </DialogHeader>                                                      │
│                                                                        │
│   {/* Warning bullets — body 16/1.5 */}                                │
│   <ul role="list" className="space-y-2 mt-2">                          │
│     • Акаунтът ви ще бъде заключен веднага.                            │
│     • Имате 30 дни да отмените изтриването при вход в системата.      │
│     • След 30 дни личните ви данни (име, имейл, телефон, област) се  │
│       изтриват необратимо.                                             │
│     • Вашите подадени предложения и сигнали остават като анонимни,    │
│       за да се запазят гласовете на общността.                         │
│     • Ще получите имейл потвърждение след заявката.                    │
│   </ul>                                                                │
│                                                                        │
│   <Separator className="my-4" />                                       │
│                                                                        │
│   {/* Typed-confirm zone */}                                            │
│   <div className="space-y-2">                                          │
│     <Label htmlFor="delete-confirm">                                   │
│       За потвърждение въведете точно <code>ИЗТРИЙТЕ</code>            │
│     </Label>                                                           │
│     <Input id="delete-confirm" autoComplete="off"                      │
│       autoCorrect="off" autoCapitalize="off" spellCheck="false"        │
│       inputMode="text" />                                              │
│     <p caption 12/1.5 muted-fg>                                        │
│       Чувствително към главни букви и кирилица.                       │
│     </p>                                                               │
│   </div>                                                               │
│                                                                        │
│   <DialogFooter className="mt-4 flex gap-3 justify-end">              │
│     <Button variant="outline" onClick={close}>                         │
│       Откажи                                                            │
│     </Button>                                                          │
│     <Button variant="destructive" min-h-[44px]                         │
│       disabled={inputTrimmed !== "ИЗТРИЙТЕ"}                          │
│       onClick={submitDelete}>                                          │
│       Изтрий завинаги                                                  │
│     </Button>                                                          │
│   </DialogFooter>                                                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

**Match logic (D-04 — exact):**

- Target string: `ИЗТРИЙТЕ` (Cyrillic, uppercase, 8 characters, NO spaces, NO punctuation).
- Match check: `input.trim() === "ИЗТРИЙТЕ"` — leading/trailing whitespace is stripped before comparison so a stray space at end of paste doesn't lock the user out. Internal spaces are NOT stripped (the target has none anyway).
- Match is **case-sensitive**: lowercase `изтрийте` does NOT match. This is a deliberate barrier — a user who can't reach uppercase Cyrillic is being asked to slow down.
- Match is **script-sensitive**: Latin `IZTRIYTE` does NOT match. The Cyrillic-only constraint is part of the Bulgarian formal-respectful contract (Phase 1 D-27).
- While the input does not match: confirm button has `disabled` + `aria-disabled="true"` and visually shows `opacity-50`. The button label stays "Изтрий завинаги" — do NOT change to "Напишете ИЗТРИЙТЕ" or similar. The label is stable; affordance comes from the disabled state + the inline instruction `<Label>`.
- On match: button enables, no animation flash (a flash could mis-cue a click). Cursor change to pointer is the only visual feedback.

**Submit behavior:**

- Click "Изтрий завинаги" while enabled → Server Action runs:
  1. Set `users.status = 'pending_deletion'`
  2. Set `users.deletion_requested_at = now()`
  3. Enqueue email `account-deletion-pending` (Phase 5 worker — Pattern P6)
  4. Invalidate session (Auth.js `signOut` on the server)
- Button becomes `disabled` + shows `<Loader2 className="size-4 animate-spin" />` icon prefix, label stays "Изтрий завинаги". `aria-busy="true"` on the dialog content.
- On Server Action success: modal closes (no toast — the next navigation to `/account-pending-deletion` IS the confirmation). Server returns a redirect response that lands the user on `/account-pending-deletion`.
- On Server Action failure: modal stays open; an inline `<Alert variant="destructive">` appears ABOVE the DialogFooter: "Не успяхме да обработим заявката. Опитайте отново или се свържете с екипа." `role="alert"`. The typed-confirm input retains its value so the user does not retype `ИЗТРИЙТЕ`.

**Dismissal behavior:**

- "Откажи" button, Escape key, click on overlay, and ✕ close button ALL dismiss the modal without any state change to `users`. After dismissal the user is back on `/member/preferences` with the section card unchanged.
- Dismissal during a pending Server Action (i.e., after clicking "Изтрий завинаги") is BLOCKED — Escape and overlay-click are disabled (`onEscapeKeyDown={(e) => e.preventDefault()}`, `onPointerDownOutside={(e) => e.preventDefault()}`) and the close ✕ button is hidden (`showCloseButton={false}`) until the Server Action resolves. This prevents a half-completed deletion from leaving the user uncertain about state.

**Focus management:**

- On open: focus moves to the typed-confirm `<Input>` (NOT the destructive button — focus on the destructive button would invite a stray Enter keystroke). Radix `Dialog` autoFocus handling — set `autoFocus` on the `<Input>` element or pass it as the focused element to `<DialogContent onOpenAutoFocus>`.
- On close: focus returns to the "Изтрий акаунта" trigger button on `/member/preferences` (Radix default).

---

### S3 — `/account-pending-deletion` Grace-Period Lockout Page (D-05)

**Focal point:** The H1 "Акаунтът ви е насрочено за изтриване" in destructive color, followed immediately by the exact deletion date in large readable text. The user must know *what* and *when* before *how to undo*. The "Отказване на изтриването" CTA is visually subordinate to the date — recovery is offered but not pre-clicked.

This page is reached via a server-side redirect from the middleware whenever an authenticated request from a user with `status = 'pending_deletion'` hits any route. Decision: **new dedicated route `/account-pending-deletion`** (NOT reusing `/suspended`). Rationale: `/suspended` is the editor-suspension surface and has copy that says "временно спрян от редакционния екип" — wrong for a self-initiated deletion. A user who self-deletes must not see editor-blame copy. We reuse the **shell pattern** (`MainContainer width="form"` + `<Card>` + `font-display text-3xl font-extrabold text-destructive`) but with new copy + a different action (cancel-deletion CTA + logout, instead of just logout).

```
┌────────────────────────────────────────────────────────────────────────┐
│ Header — MINIMAL (logo only, NO nav links)                            │
│                                                                        │
│ Rationale: a user in pending_deletion must not be tempted to nav     │
│ into /member, /agenda, etc. The middleware redirects them back here  │
│ anyway, but the chrome should not advertise navigation.               │
├────────────────────────────────────────────────────────────────────────┤
│   MainContainer width="form" (max-w-[480px]) py-16                    │
│                                                                        │
│   <Card>                                                               │
│     <CardHeader>                                                       │
│       <h1 font-display text-3xl font-extrabold text-destructive>      │
│         text-wrap-balance>                                             │
│         Акаунтът ви е насрочено за изтриване                          │
│       </h1>                                                           │
│     </CardHeader>                                                      │
│     <CardContent className="space-y-4">                               │
│                                                                        │
│       <p body 16/1.5>                                                  │
│         Изтриването е насрочено за                                    │
│         <strong className="font-feature-settings-tnum">                │
│           {formatBulgarianDate(deletion_requested_at + 30days)}        │
│         </strong>.                                                     │
│         До тази дата можете да отмените действието и да възстановите  │
│         акаунта си.                                                    │
│       </p>                                                             │
│                                                                        │
│       <p body 16/1.5 muted-fg>                                         │
│         След тази дата вашите лични данни се изтриват необратимо.    │
│         Подадените от вас предложения и сигнали ще останат като       │
│         анонимни, за да се запазят гласовете на общността.            │
│       </p>                                                             │
│                                                                        │
│       <div className="flex flex-col gap-3 pt-2 sm:flex-row">          │
│         <form action={cancelDeletionAction}>                          │
│           <Button type="submit" variant="default" size="lg"           │
│             className="w-full sm:w-auto min-h-[44px]">                │
│             Отказване на изтриването                                  │
│           </Button>                                                    │
│         </form>                                                        │
│         <form action={logoutAction}>                                  │
│           <Button type="submit" variant="outline" size="lg"          │
│             className="w-full sm:w-auto">                             │
│             Изход                                                      │
│           </Button>                                                    │
│         </form>                                                        │
│       </div>                                                          │
│                                                                        │
│     </CardContent>                                                     │
│   </Card>                                                              │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│ Footer (Phase 2 reuse — full footer is OK; footer has no auth surfaces)│
└────────────────────────────────────────────────────────────────────────┘
```

**Server-side gating + redirect contract:**

- Middleware (`src/middleware.ts`) reads the session. If `session.user.status === 'pending_deletion'` AND the requested path is NOT `/account-pending-deletion` AND NOT `/api/auth/*` (Auth.js must work for logout) AND NOT `/cancel-deletion/verify` (the OTP step in S4), redirect to `/account-pending-deletion`.
- A user attempting to log in while in `pending_deletion` status authenticates successfully (Auth.js doesn't know about the lockout) and then is immediately redirected to `/account-pending-deletion`.
- Authenticated requests to `/account-pending-deletion` from a user whose status is `active` or anything else → redirect to `/member` (this prevents the lockout page from being seen by users who don't belong there).
- Unauthenticated requests to `/account-pending-deletion` → redirect to `/auth/login` with the standard returnTo flow.

**"Отказване на изтриването" behavior (initiates S4):**

- Click → Server Action that:
  1. Verifies the user is still in `pending_deletion` status (defense in depth)
  2. Sends an OTP code to the user's email via Brevo (Phase 1 OTP infra; new email-kind `account-deletion-cancel-otp`)
  3. Returns a redirect to `/cancel-deletion/verify`
- During the brief Server Action delay: button shows `<Loader2>` spinner and label stays "Отказване на изтриването". `aria-busy="true"` on the form.

**"Изход" behavior:**

- Standard Auth.js `signOut({ redirectTo: '/' })` — same as `/suspended/page.tsx`.
- After logout the user can re-login anytime within the grace window; the lockout redirect fires again and they're back on this page.

**Empty / loading / error states:**

- No empty state — the page only renders when a deletion is pending.
- Loading: not applicable (server-rendered with session data).
- Error during cancel-deletion submit: redirect to `/account-pending-deletion?error=cancel-failed`; an `<Alert variant="destructive">` renders ABOVE the action buttons with copy "Не успяхме да изпратим код за потвърждение. Опитайте отново." Server Action retries are safe (idempotent OTP issuance with 1-per-minute rate limit reuses Phase 1 pattern).

---

### S4 — Cancel-Deletion OTP Verify Page

**Focal point:** The OTP input slot — this is the only action on the page. Page H1 contextualises ("Потвърдете отказването от изтриване"), then the user reads "имейл с код пристигна на …", then enters the 6-digit code.

Implementation: **reuse the existing OTP entry form** from Phase 1 (`src/components/forms/OtpVerifyForm.tsx` or equivalent — planner to confirm path). The only changes from the standard login OTP flow are:
- Page H1: "Потвърдете отказването от изтриване" (NOT "Влезте в системата")
- Page lead: "Изпратихме код за потвърждение на {maskedEmail}. Въведете го, за да възстановите акаунта си."
- Resend cooldown text: same as login OTP (60s + the same rate-limit copy).
- Success behavior: Server Action verifies the OTP → flips `users.status = 'active'`, clears `users.deletion_requested_at`, enqueues email `account-deletion-cancelled` (D-05 + Pattern P6) → redirect to `/member` with a Sonner toast: "Изтриването е отказано. Акаунтът ви е активен."

**No new design contract for this surface.** It is a reuse of the Phase 1 OTP form with copy-only deltas. The planner enumerates the new bg.json keys (see Copywriting Contract §) but does not produce new components.

**Layout:** `MainContainer width="form"` (480px), same as login. Minimal header (logo only) for visual consistency with S3 — the user is still in a privileged-recovery state, not standard browsing.

---

### S5 — Data-Export Inline Feedback States (within S1)

These are not stand-alone surfaces; they are the inline state variants of the S1 Права-върху-данните card. Documented separately so the executor knows exactly what to render in each case.

| State | Trigger | Visual |
|-------|---------|--------|
| **Default — no prior request** | `users.export_requested_at IS NULL` | Button "Заявка за извличане на данни" enabled. NO "Последно искане" line. NO alert. |
| **Default — prior request exists, no expiry flag** | `users.export_requested_at IS NOT NULL` AND `users.last_export_expired_at IS NULL` | Button enabled (re-request allowed). "Последно искане: {formattedDate}" caption visible below button. NO alert. |
| **Default — prior link expired, no fresh request** | `users.last_export_expired_at IS NOT NULL` AND `users.last_export_expired_at > users.export_requested_at` | Button enabled. "Последно искане: {formattedDate}" caption visible. Inline `<Alert>` below button (NOT destructive variant — informational): "Връзката от предишното изтегляне е изтекла. Заявете ново извличане за нов линк." |
| **Loading — request in flight** | Server Action pending | Button `disabled` + `<Loader2 className="size-4 animate-spin" />` icon prefix. Label unchanged. `aria-busy="true"` on the form. |
| **Success — just submitted** | Server Action returned success in last 5 minutes | Button `disabled` + `<CheckCircle2 className="size-4" />` icon prefix + label "Заявката е изпратена". `<Toaster>` already showed the toast on submit (`role="status"`): "Заявката е изпратена. Ще получите имейл с линк за изтегляне до 30 минути." After 5 minutes button re-enables with original label. |
| **Error — server failed** | Server Action returned error | Button stays enabled (so retry is possible). Inline `<Alert variant="destructive" role="alert">` below button: "Не успяхме да обработим заявката. Опитайте отново." Toast not shown for errors (the inline alert is the durable surface). |
| **Rate-limited (Upstash)** | Server Action returned 429 | Button `disabled` + label unchanged. Inline `<Alert variant="destructive" role="alert">` below button: "Превишена честота на заявките. Опитайте отново след {n} минути." Button auto-re-enables after rate window expires (client-side timer, optimistic — server enforces). |

**Cooldown rationale (5-minute disabled-after-success):** The export job takes minutes to run. Allowing the user to submit again 1 second later creates duplicate jobs and confusing duplicate emails. 5 minutes is short enough that "I clicked twice by accident" is invisibly handled, and long enough that the worker has typically completed by then.

---

### S6 — Cancel-Deletion Success Toast (post-S4)

After S4 OTP verification succeeds, the user lands on `/member`. A Sonner toast renders:

- Variant: success (default Sonner success — no destructive coloring).
- Copy: "Изтриването е отказано. Акаунтът ви е активен."
- Duration: 6 seconds (longer than the standard 5s — this is a recovery from a heavy action; the user should see the confirmation comfortably).
- `role="status"` + `aria-live="polite"` (Sonner default).
- Icon: `<CheckCircle2 />` (Sonner default for success).
- After dismiss / timeout: no further action; the user is on `/member` as normal.

---

## Copywriting Contract

All strings below are **working drafts**. Final strings MUST be locked into `messages/bg.json` under stable namespaces BEFORE source-file authoring, per the D-25 string-lock pattern.

**Namespaces used in Phase 6:**
- `member.preferences.dataRights.*` — the Права-върху-данните card on `/member/preferences`
- `member.deleteAccount.*` — the typed-confirm modal
- `accountPendingDeletion.*` — the grace-period lockout page at `/account-pending-deletion`
- `cancelDeletion.*` — the OTP verify page at `/cancel-deletion/verify`

Existing namespaces are NOT re-keyed: `member.preferences.eyebrow/heading/lead`, `admin.suspended.*`, `member.welcome.*` remain as shipped.

### Права-върху-данните card (S1)

| Element | Copy | bg.json key |
|---------|------|-------------|
| Card title | "Права върху данните" | `member.preferences.dataRights.title` |
| Card description | "Управлявайте личните си данни според GDPR." | `member.preferences.dataRights.description` |
| Top explainer paragraph | "Имате право да изтеглите всички ваши лични данни или да изтриете акаунта си. Подробности за това какво пазим и за колко време — в политиката за поверителност." | `member.preferences.dataRights.explainer` |
| Privacy policy link text (inside explainer) | "политиката за поверителност" | `member.preferences.dataRights.privacyPolicyLinkText` |
| Export sub-section heading | "Извличане на данните" | `member.preferences.dataRights.export.heading` |
| Export description | "Ще получите по имейл линк за изтегляне на всички ваши данни в JSON формат. Линкът важи 7 дни." | `member.preferences.dataRights.export.description` |
| Export CTA button | "Заявка за извличане на данни" | `member.preferences.dataRights.export.cta` |
| Export CTA — in-flight label (visual only — icon swap; same text) | "Заявка за извличане на данни" | (same key, no separate label) |
| Export CTA — success label (5-min cooldown) | "Заявката е изпратена" | `member.preferences.dataRights.export.ctaSent` |
| Export — "Last request" caption | "Последно искане: {date}" | `member.preferences.dataRights.export.lastRequest` |
| Export — link expired alert | "Връзката от предишното изтегляне е изтекла. Заявете ново извличане за нов линк." | `member.preferences.dataRights.export.expiredAlert` |
| Export success toast | "Заявката е изпратена. Ще получите имейл с линк за изтегляне до 30 минути." | `member.preferences.dataRights.export.successToast` |
| Export server-error alert | "Не успяхме да обработим заявката. Опитайте отново." | `member.preferences.dataRights.export.errorAlert` |
| Export rate-limit alert | "Превишена честота на заявките. Опитайте отново след {n} минути." | `member.preferences.dataRights.export.rateLimitAlert` |
| Delete sub-section heading | "Изтриване на акаунта" | `member.preferences.dataRights.delete.heading` |
| Delete description | "След потвърждение акаунтът ви ще бъде заключен за 30 дни и след това изтрит. През този период можете да отмените изтриването с вход в системата." | `member.preferences.dataRights.delete.description` |
| Delete trigger CTA | "Изтрий акаунта" | `member.preferences.dataRights.delete.cta` |

### Typed-confirm deletion modal (S2)

| Element | Copy | bg.json key |
|---------|------|-------------|
| Dialog title | "Изтриване на акаунта" | `member.deleteAccount.title` |
| Dialog description | "Това действие стартира 30-дневен период преди окончателно изтриване. Прочетете внимателно какво се случва." | `member.deleteAccount.description` |
| Warning bullet 1 | "Акаунтът ви ще бъде заключен веднага." | `member.deleteAccount.bullets.0` |
| Warning bullet 2 | "Имате 30 дни да отмените изтриването при вход в системата." | `member.deleteAccount.bullets.1` |
| Warning bullet 3 | "След 30 дни личните ви данни (име, имейл, телефон, област) се изтриват необратимо." | `member.deleteAccount.bullets.2` |
| Warning bullet 4 | "Вашите подадени предложения и сигнали остават като анонимни, за да се запазят гласовете на общността." | `member.deleteAccount.bullets.3` |
| Warning bullet 5 | "Ще получите имейл потвърждение след заявката." | `member.deleteAccount.bullets.4` |
| Typed-confirm Label | "За потвърждение въведете точно <code>ИЗТРИЙТЕ</code>" | `member.deleteAccount.typedConfirmLabel` |
| Typed-confirm target string | `ИЗТРИЙТЕ` | `member.deleteAccount.typedConfirmTarget` |
| Typed-confirm helper text | "Чувствително към главни букви и кирилица." | `member.deleteAccount.typedConfirmHelp` |
| Dismiss button (action-specific per Phase 4 contract) | "Откажи" | `member.deleteAccount.dismissCta` |
| Confirm button | "Изтрий завинаги" | `member.deleteAccount.confirmCta` |
| Submit-error alert | "Не успяхме да обработим заявката. Опитайте отново или се свържете с екипа." | `member.deleteAccount.submitError` |

> **Dismiss-label contract note:** Phase 4 §"Confirmation dialog dismiss label" prescribed action-specific dismiss labels ("Не одобрявай", "Не отхвърляй", etc.). For Phase 6 the dismiss copy is "Откажи" (generic) NOT "Не изтривай" — rationale: this dialog is the user-self-action context (user is acting on their own data), unlike the admin moderation dialogs (editor acting on someone else's submission). In the self-action context, "Откажи" reads as a respectful "I changed my mind" rather than the editor's deliberate "do not perform action X." The Phase 4 contract explicitly scoped to moderation dialogs; the Phase 6 self-service context warrants the lighter dismiss. This is intentional precedent, captured here.

### Grace-period lockout page (S3)

| Element | Copy | bg.json key |
|---------|------|-------------|
| Page metadata title | "Изтриване насрочено" | `accountPendingDeletion.pageTitle` |
| H1 | "Акаунтът ви е насрочено за изтриване" | `accountPendingDeletion.heading` |
| Body paragraph 1 | "Изтриването е насрочено за {date}. До тази дата можете да отмените действието и да възстановите акаунта си." | `accountPendingDeletion.body` |
| Body paragraph 2 (consequences) | "След тази дата вашите лични данни се изтриват необратимо. Подадените от вас предложения и сигнали ще останат като анонимни, за да се запазят гласовете на общността." | `accountPendingDeletion.consequences` |
| Cancel CTA | "Отказване на изтриването" | `accountPendingDeletion.cancelCta` |
| Logout CTA | "Изход" | `accountPendingDeletion.logoutLabel` |
| Cancel-failed alert | "Не успяхме да изпратим код за потвърждение. Опитайте отново." | `accountPendingDeletion.cancelError` |

### Cancel-deletion OTP verify page (S4)

| Element | Copy | bg.json key |
|---------|------|-------------|
| Page metadata title | "Потвърдете отказването от изтриване" | `cancelDeletion.pageTitle` |
| H1 | "Потвърдете отказването от изтриване" | `cancelDeletion.heading` |
| Lead | "Изпратихме код за потвърждение на {maskedEmail}. Въведете го, за да възстановите акаунта си." | `cancelDeletion.lead` |
| OTP submit CTA | "Възстанови акаунта" | `cancelDeletion.submitCta` |
| OTP resend trigger label | "Изпрати кода отново" | `cancelDeletion.resendCta` |
| OTP resend cooldown text | "Можете да поискате нов код след {seconds} сек." | `cancelDeletion.resendCooldown` |
| OTP wrong-code error | "Грешен код. Опитайте отново." | `cancelDeletion.wrongCode` |
| Success toast (lands on /member) | "Изтриването е отказано. Акаунтът ви е активен." | `cancelDeletion.successToast` |

### Bulgarian formal-respectful tone notes (Phase 1 D-27)

- All Phase 6 user-facing copy uses formal "Вие" address (ви/вашия/вашата/възстановите). Do NOT use informal "ти" — even though the Phase 4 admin moderation copy uses "ти" for editor-facing strings, Phase 6 surfaces are user-facing and the politeness contract is Phase 1 D-27 formal.
- The destructive-action button labels are **imperative verb + direct object** (Изтрий акаунта, Изтрий завинаги) — a deliberate departure from "Вие" politeness because button labels universally use imperative across the site (Phase 4 "Изпрати предложение", "Изпрати сигнал"). The body copy around the button reverts to formal "Вие".

---

## Components Inventory

### New member-facing components (create in `src/components/`)

| Component | Path | shadcn primitives used | Notes |
|-----------|------|------------------------|-------|
| `DataRightsCard` | `src/components/preferences/DataRightsCard.tsx` | `card`, `button`, `separator`, `alert` | RSC server-side wrapper. Reads `users.export_requested_at` + `users.last_export_expired_at`. Imports the two interactive sub-components. |
| `DataExportRequestButton` | `src/components/preferences/DataExportRequestButton.tsx` | `button`, `sonner` (toast) | Client component. Owns the in-flight + success + cooldown UI states. Wraps Server Action call. |
| `DeleteAccountDialog` | `src/components/preferences/DeleteAccountDialog.tsx` | `dialog`, `input`, `label`, `button`, `separator`, `alert` | Client component. Owns typed-confirm state, match-checking, submit lifecycle. Trigger is its own `<DialogTrigger>` child — DataRightsCard renders `<DeleteAccountDialog />` and the dialog provides the trigger button visually. |
| `CancelDeletionForm` | `src/components/forms/CancelDeletionForm.tsx` | `button` | Client component. Single-button form on `/account-pending-deletion`. Calls Server Action that fires OTP + redirects to `/cancel-deletion/verify`. |
| `CancelDeletionVerifyForm` | `src/components/forms/CancelDeletionVerifyForm.tsx` | Reuses existing Phase 1 OTP slot primitives | Mostly delta-only over Phase 1 — different submit endpoint, different success toast, different copy keys. |

### New page-level routes

| Route | File | Notes |
|-------|------|-------|
| `/account-pending-deletion` | `src/app/(frontend)/account-pending-deletion/page.tsx` | RSC server component. Reads session; if user is not in `pending_deletion`, redirects to `/member`. Renders the lockout card (S3). |
| `/cancel-deletion/verify` | `src/app/(frontend)/cancel-deletion/verify/page.tsx` | RSC. Reads session; if user is not in `pending_deletion` OR no pending OTP exists, redirects to `/account-pending-deletion`. Renders the OTP verify form (S4). |

### Routes modified, not created

- `src/app/(frontend)/member/preferences/page.tsx` — adds the `<DataRightsCard />` import + render at the bottom of the existing card stack.
- `src/middleware.ts` — adds the `pending_deletion` status-check + redirect rule (server-side enforcement of S3 gating).

### Layout reuse note

The `/account-pending-deletion` route uses a **minimal layout**: full Phase 2 `Footer` + a stripped-down `Header` (logo-only, no nav links). The executor implements this as either:
- a route-segment `layout.tsx` at `src/app/(frontend)/account-pending-deletion/layout.tsx` overriding the parent `(frontend)/layout.tsx` chrome, OR
- a prop on the existing Header component (`<Header variant="minimal" />`) that hides nav links.

Planner picks. The constraint: a user in `pending_deletion` MUST NOT see Header navigation that would tempt them to click into authenticated surfaces (every such click would just bounce them back here, but the visual invitation should not exist).

---

## Interaction States Reference

| State | Visual | ARIA |
|-------|--------|------|
| Data-export button — default | `<Button variant="default">` enabled | — |
| Data-export button — in flight | `disabled` + `<Loader2 className="size-4 animate-spin">` prefix | `aria-busy="true"` on form |
| Data-export button — success (5-min cooldown) | `disabled` + `<CheckCircle2 />` prefix + label change to "Заявката е изпратена" | — |
| Data-export success toast | Sonner success toast top-right, 5s | `role="status"`, `aria-live="polite"` (Sonner default) |
| Data-export error alert | `<Alert variant="destructive">` below button; button stays enabled | `role="alert"`, `aria-live="assertive"` |
| Delete-trigger button | `<Button variant="destructive" size="lg" min-h-[44px]>` always enabled for active members | — |
| Delete modal — open | `<Dialog open>` with overlay; focus on typed-confirm `<Input>` | `aria-modal="true"`, `aria-labelledby={dialogTitleId}`, `aria-describedby={dialogDescriptionId}` |
| Typed-confirm input — empty | Default `<Input>` border | `aria-describedby={helperTextId}` |
| Typed-confirm input — non-matching | Default border (NOT destructive — the user is mid-typing, not erring) | unchanged |
| Typed-confirm input — matching | Default border (no celebratory styling); confirm button enables | `aria-disabled="false"` on confirm button |
| Delete confirm button — disabled | `opacity-50 cursor-not-allowed` | `aria-disabled="true"` |
| Delete confirm button — submitting | `disabled` + `<Loader2 animate-spin>` prefix; close button hidden; Escape/overlay-click blocked | `aria-busy="true"` on DialogContent |
| Delete modal — submit error | `<Alert variant="destructive">` above DialogFooter; modal stays open; input retains value | `role="alert"` |
| Grace-period page load | Full server render; no client interactivity beyond the two action forms | H1 has `role="heading"` `aria-level="1"` (native h1) |
| Cancel-deletion submit — in flight | "Отказване на изтриването" button `disabled` + `<Loader2 animate-spin>` prefix | `aria-busy="true"` on form |
| Cancel-deletion submit — error | `<Alert variant="destructive">` above the action buttons row | `role="alert"` |
| Cancel-deletion OTP verify | Phase 1 OTP component states | inherited |
| Cancel-deletion success toast | Sonner success on `/member`, 6s | `role="status"`, `aria-live="polite"` |

---

## Accessibility Requirements (WCAG 2.1 AA — applied to Phase 6 surfaces)

These are the WCAG contract surfaces for the four Phase 6 surfaces above. They are the contract the `tests/e2e/a11y/*.spec.ts` axe-core specs (D-11) MUST verify, and are part of the D-12 "6 core flows" audit scope (specifically the `/member` flow extension and the new lockout flow).

### Universal (applies to all Phase 6 surfaces)

- All form `<input>` and `<textarea>` elements have explicit `<Label htmlFor>` association — NO placeholder-only labels.
- All interactive elements (buttons, inputs, links) are keyboard-reachable in document order via Tab.
- All interactive elements have a visible `focus-visible` ring — the existing shadcn `focus-visible:ring-ring/50 ring-[3px]` is sufficient and meets WCAG 2.4.7 Focus Visible.
- Color is NEVER the only differentiator: every destructive button has a textual label ("Изтрий акаунта" / "Изтрий завинаги") in addition to the red color. The typed-confirm input does NOT use a red border to signal "you haven't typed it yet" — that would conflate "not yet matched" with "error", which is a WCAG 1.4.1 Use of Color violation.
- All toast messages have `role="status"` (Sonner default) so screen readers announce them via `aria-live="polite"`.
- All inline alerts have `role="alert"` and `aria-live="assertive"` (or use `<Alert role="alert">`).
- Bulgarian text is the document language — the root `<html lang="bg">` is already set by Phase 1; Phase 6 surfaces inherit this.
- All text meets WCAG 1.4.3 Contrast (Minimum) at 4.5:1 for body, 3:1 for large text. The Phase 2 Sinya palette already satisfies this for all the role combinations Phase 6 uses (`--color-foreground` on `--color-background` = navy-on-white = >12:1; `--color-destructive` `#DC2626` on `--color-background` = ~5.7:1, passes 4.5:1 for body and 3:1 for large text). The executor MUST NOT introduce custom colors that have not been contrast-checked.

### S1 Права-върху-данните card — specific

- The "Заявка за извличане на данни" button label is action-specific (verb + object) per the Phase 4 explicit-CTA contract — NOT a generic "Извлечи" or "Заявка". This is WCAG 2.4.6 Headings and Labels.
- The "Последно искане: {date}" caption is `<p>` not `<time>` (planner discretion to upgrade to `<time datetime={iso}>` for richer machine-readable semantics — recommended but not required for AA).
- The privacy-policy link uses descriptive link text ("политиката за поверителност") rather than "тук" or "натиснете" — WCAG 2.4.4 Link Purpose.
- The destructive sub-section heading "Изтриване на акаунта" uses `text-destructive` color, but is paired with the textual label — color is not the only signal — WCAG 1.4.1.

### S2 Typed-confirm deletion modal — specific

- Modal has `role="dialog"` + `aria-modal="true"` (Radix Dialog default).
- Modal has `aria-labelledby={dialogTitleId}` pointing to the DialogTitle, and `aria-describedby={dialogDescriptionId}` pointing to the DialogDescription — Radix wires these automatically.
- Focus is moved into the modal on open (Radix default) and restored to the trigger on close (Radix default).
- Focus is trapped inside the modal while open (Radix default) — Tab and Shift-Tab cycle within the modal.
- During in-flight submission, the modal becomes **non-dismissible** (Escape blocked, overlay-click blocked, close button hidden) — this is a deliberate accessibility trade-off. The WCAG 2.1.2 No Keyboard Trap clause requires that focus can be moved away from a component via standard navigation — submission state is transient (seconds at most) and is a common-pattern Radix usage (e.g., during a destructive Server Action). The `aria-busy="true"` on the DialogContent communicates the state. This trade-off is explicitly documented; the executor MUST NOT block dismissal in any state other than the in-flight Server Action.
- The typed-confirm `<Label>` is associated with the `<Input>` via `htmlFor` — WCAG 1.3.1 Info and Relationships.
- The helper text "Чувствително към главни букви и кирилица." is associated to the input via `aria-describedby` — WCAG 3.3.2 Labels or Instructions.
- The disabled "Изтрий завинаги" button has `aria-disabled="true"` (in addition to the native `disabled` attribute) — Radix Button handles this.
- Bullet list inside modal uses `<ul role="list">` (the `role="list"` is defensive against the WebKit CSS `list-style: none` bug that strips list semantics — apply it).
- The `<code>ИЗТРИЙТЕ</code>` inside the Label MUST have sufficient contrast and is NOT styled with a background fill that reduces contrast below 4.5:1. Use `font-mono font-semibold` for visual distinction without background.

### S3 Grace-period lockout page — specific

- H1 is a proper `<h1>` (semantic), uses `font-display` + `text-3xl` + `font-extrabold` + `text-destructive`. Contrast: `#DC2626` on `#FFFFFF` background = ~5.7:1, passes 3:1 for large text (this is 30px+ bold so qualifies as "large text" per WCAG 1.4.3).
- The deletion date inside the body paragraph is wrapped in `<strong className="font-feature-settings-tnum">` for both semantic emphasis AND consistent digit width — WCAG 1.3.1.
- Both action buttons ("Отказване на изтриването" + "Изход") are keyboard-reachable; `Отказване` comes first in tab order (it is the primary recovery affordance).
- Minimal Header (logo-only) MUST retain the logo as a link to `/`, so unauthenticated public surfaces remain reachable for a user who logs out — WCAG 2.4.5 Multiple Ways.
- The Header MUST NOT render a hidden-but-tab-reachable nav menu — the minimal variant means the nav links are NOT present in the DOM, NOT just CSS-hidden. (CSS-hidden links remain tab-focusable and pollute screen-reader navigation.)

### S4 Cancel-deletion OTP verify page — specific

- Inherits all Phase 1 OTP form accessibility (`autocomplete="one-time-code"`, individual OTP slot labels, OTP slot focus management).
- The `{maskedEmail}` in the lead paragraph should be rendered with the email visually masked (e.g., `i****@example.com`) — Phase 1 already provides this helper. Confirm reuse.
- The "Изпрати кода отново" link has `aria-disabled="true"` during the cooldown window, plus the cooldown counter text is in `<span aria-live="polite">` so screen readers announce the count-down progress at a polite cadence (not assertively — that would be obnoxious).

### S5 Toast feedback states — specific

- Sonner toasts use `role="status"` + `aria-live="polite"` by default. Phase 6 does NOT change this.
- Toast copy is full sentences with end punctuation so the screen-reader announcement is grammatically complete.
- Toast duration: 5s for success, 6s for the cancel-deletion success (deliberately longer — see S6 rationale).

### What the a11y audit (D-12) MUST verify

Per D-12, the Phase 6 a11y scope adds the **`/account-pending-deletion`** flow to the 6 core flows. The new Playwright spec at `tests/e2e/a11y/account-pending-deletion.spec.ts` MUST cover:

1. Page render with axe-core scan, zero critical or serious findings.
2. Keyboard-only navigation reaches both action buttons in document order.
3. The minimal Header does NOT contain tab-focusable hidden nav links.
4. The H1 is a single `<h1>` (no h1 duplication or h2-only).
5. Color contrast of all rendered text against background ≥4.5:1 (or 3:1 for >24px text or >18.66px bold).

Additionally, `tests/e2e/a11y/preferences-data-rights.spec.ts` MUST cover:

1. The Права-върху-данните card renders inside the existing `/member/preferences` page with zero new critical/serious axe findings.
2. Opening the typed-confirm modal via keyboard (focus the trigger, press Enter) moves focus into the modal.
3. The typed-confirm input is reachable by Tab from the modal title; the helper text is wired via `aria-describedby`.
4. The "Изтрий завинаги" button has `aria-disabled="true"` when input does NOT match `ИЗТРИЙТЕ`, and `aria-disabled="false"` when it does.
5. Escape key closes the modal (when no Server Action is in flight) and returns focus to the trigger.

The cancel-deletion OTP page reuses the Phase 1 OTP a11y spec — no new spec required.

---

## Registry Safety

| Registry | Components Declared | Safety Gate |
|----------|---------------------|-------------|
| shadcn official (`ui.shadcn.com`) | None added in Phase 6 — all reused | Not required (zero new components) |
| Third-party | None | Not applicable |

---

## Pre-population Sources

| Decision / Value | Source |
|-----------------|--------|
| Design system (shadcn new-york, slate, lucide) | `components.json` (verified 2026-05-15) |
| Color tokens (all) | `src/styles/theme.css` `@theme` block |
| Spacing scale | Phase 2 UI-SPEC §3.2 (locked) + Phase 4 UI-SPEC §Spacing |
| Typography scale (3 weights: 400/600/800) | Phase 2 UI-SPEC §3.2 (approved 6/6) + Phase 3 + Phase 4 UI-SPEC §Typography |
| Container tokens | `theme.css` `@theme` (`--container-form`, `--container-prose`, `--container-page`) |
| 44px touch target exception | Phase 1 + Phase 3 + Phase 4 pattern |
| Cyrillic typography rules | Phase 3 UI-SPEC §Typography |
| Bulgarian formal-respectful tone | Phase 1 D-27 |
| Typed-confirm pattern + `ИЗТРИЙТЕ` target string | 06-CONTEXT.md D-04 |
| 30-day grace period | 06-CONTEXT.md D-05 |
| Anonymize-and-preserve on deletion | 06-CONTEXT.md D-06 (informs warning bullet 4 copy) |
| Async export via Bunny.net signed URL (7-day TTL) | 06-CONTEXT.md D-01 |
| `/suspended` page shell reuse pattern | 06-CONTEXT.md `<specifics>` + verified `src/app/(frontend)/suspended/page.tsx` |
| Phase 1 OTP infra reuse for cancel-deletion | 06-CONTEXT.md D-05 |
| WCAG 2.1 AA target + 6 core flows scope | 06-CONTEXT.md D-11 + D-12 |
| Existing `member.preferences.*` bg.json namespace | `messages/bg.json:96-148` (verified 2026-05-15) |
| Existing `admin.suspended.*` bg.json keys (for comparison/disambiguation) | `messages/bg.json:527-531` (verified 2026-05-15) |
| Action-specific dismiss labels (Phase 4 contract) | Phase 4 UI-SPEC §Copywriting Contract — explicitly scoped to admin moderation; Phase 6 self-service context warrants lighter "Откажи" dismiss; see contract note in §Copywriting |
| Pattern P6 (Button asChild Link with whitespace-normal override for mobile) | Quick 260514-q3u — not invoked in Phase 6 (no Phase 6 button is a Link wrapper; Phase 6 buttons are all `<button type="submit">` inside forms) |

---

## Cross-Phase Compatibility Notes

- **Phase 4 admin moderation suspend action** writes to `users.status = 'suspended'`. **Phase 6 deletion** writes to `users.status = 'pending_deletion'`. These are distinct enum values; the middleware redirect rule MUST handle both: `suspended` → `/suspended`, `pending_deletion` → `/account-pending-deletion`. The two surfaces visually mirror each other (same `MainContainer width="form"` + `<Card>` + `text-destructive` H1) but render different copy and different action affordances.
- **Phase 5 email template patterns** (Pattern P6 — `render(element, { plainText: true })`) are reused for the three new email kinds: `data-export-ready`, `account-deletion-pending`, `account-deletion-cancelled`, `account-deletion-cancel-otp`. Email-template visual contracts are NOT in Phase 6 UI-SPEC scope (per `<scope>` directive — covered by Phase 5 pattern).
- **Phase 1 OTP infrastructure** is reused verbatim for the cancel-deletion OTP step. No new OTP component is created; the existing form is rendered with new copy via the `cancelDeletion.*` bg.json namespace.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS (inherited 3-weight system — Phase 2/3/4 approved; Phase 6 introduces zero new weights)
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS (zero new components, zero new registries)

**Approval:** pending
