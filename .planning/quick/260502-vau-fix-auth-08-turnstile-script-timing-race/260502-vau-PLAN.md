---
phase: quick-260502-vau
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(frontend)/(auth)/register/page.tsx
  - src/components/forms/TurnstileWidget.tsx
autonomous: true
requirements:
  - AUTH-08
  - D-CI-app-failures-Cause-4

must_haves:
  truths:
    - "On /register, the Cloudflare Turnstile api.js <script> tag is present in the initial SSR HTML response (visible in document HTML at goto-completion, before any JS executes)."
    - "On /login, the Cloudflare Turnstile api.js <script> tag is NOT present (asymmetry preserved — only /register mounts the widget)."
    - "TurnstileWidget still renders the widget, still resolves to status='ready' on success, still surfaces 'error' status on api.js load failure / sitekey-missing / 12s timeout, still re-resets to 'loading' on expired-callback."
    - "AUTH-08 positive spec (anti-abuse.spec.ts:25) passes on FIRST attempt locally (no retry) when run via `pnpm exec playwright test tests/e2e/anti-abuse.spec.ts --project=chromium-desktop`."
    - "AUTH-08 negative spec (anti-abuse.spec.ts:31) continues to pass — script count on /login remains 0."
    - "AUTH-10 disposable-email spec (anti-abuse.spec.ts:5) continues to pass — Turnstile resolves so the form submit fires."
  artifacts:
    - path: "src/app/(frontend)/(auth)/register/page.tsx"
      provides: "Server Component that emits the Cloudflare Turnstile api.js <script> tag in the initial SSR HTML"
      contains: 'src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"'
    - path: "src/components/forms/TurnstileWidget.tsx"
      provides: "Client component that renders the Turnstile widget by polling for window.turnstile (no next/script wrapper)"
      contains: "window.turnstile"
  key_links:
    - from: "src/app/(frontend)/(auth)/register/page.tsx"
      to: "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
      via: "raw <script async defer> tag in Server Component JSX"
      pattern: "challenges\\.cloudflare\\.com/turnstile/v0/api\\.js"
    - from: "src/components/forms/TurnstileWidget.tsx"
      to: "window.turnstile"
      via: "polling interval / load listener that calls renderWidget() once window.turnstile is defined"
      pattern: "window\\.turnstile"
---

<objective>
Fix AUTH-08 spec flake (CI run 25256644902 — fails first attempt, passes on retry #1) caused by `next/script` `afterInteractive` strategy injecting the Cloudflare Turnstile `<script>` tag post-hydration, racing Playwright's immediate `page.locator('script[src*="challenges.cloudflare.com"]').count()`.

Purpose: First-time-green CI on main is a Phase 1 sign-off prerequisite. AUTH-08 must pass on first attempt without test retries. Also makes Turnstile load slightly sooner in production (initial HTML vs post-hydration injection).

Output: SSR-emitted Turnstile script tag on /register only; TurnstileWidget refactored to drop `next/script` and consume `window.turnstile` once api.js (loaded via the Server-Component-rendered tag) populates it.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/debug/d-ci-app-failures.md
@CLAUDE.md

<interfaces>
<!-- Existing TurnstileWidget public API — MUST be preserved. -->

```typescript
// src/components/forms/TurnstileWidget.tsx (current public surface)
export type TurnstileStatus = 'loading' | 'ready' | 'error';

export function TurnstileWidget(props: {
  onStatusChange?: (s: TurnstileStatus) => void;
}): JSX.Element;

// window typing (already declared in this file — keep it)
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (code?: string) => void;
          'expired-callback'?: () => void;
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ) => string;
      reset: (id: string) => void;
    };
  }
}
```

Consumers of TurnstileWidget that MUST keep working unchanged:
- `src/components/forms/RegistrationForm.tsx` — passes `onStatusChange` and gates submit on `turnstileStatus === 'ready'`.
- The button stays disabled while `status === 'loading' | 'error'` and enables on `'ready'`. This contract is unchanged.
</interfaces>

<turnstile_api_reference>
Cloudflare Turnstile loads via:
`<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer></script>`

When loaded, it sets `window.turnstile` with `render(el, opts)` and `reset(id)`. `?render=explicit` disables auto-rendering of any `.cf-turnstile` div — we always call `window.turnstile.render()` ourselves so React state captures the token via `callback`. This contract is unchanged.

The `onload` callback is also supported via a query param (`onload=fnName`) but it requires a globally named function — the polling approach is simpler and avoids leaking a window-level callback.
</turnstile_api_reference>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Render Turnstile api.js as a raw <script> tag in the /register Server Component (SSR HTML)</name>
  <files>src/app/(frontend)/(auth)/register/page.tsx</files>
  <action>
Add a raw `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />` tag directly in the JSX of `RegisterPage` (it's already an `async function` Server Component — the tag will ship in the initial SSR HTML, present at `page.goto` completion).

Placement: render the `<script>` as a sibling of `<MainContainer>` (NOT inside `<head>` — Next.js App Router Server Components can emit `<script>` tags in body and they still execute; placing it as the first child of the returned fragment keeps the patch minimal and avoids any metadata/Head API plumbing).

Concrete shape:

```tsx
export default async function RegisterPage() {
  const t = await getTranslations('auth.register');
  const formStamp = signFormStamp();
  return (
    <>
      {/*
        Loaded as raw <script> (NOT next/script) so it ships in initial SSR HTML.
        next/script's default `afterInteractive` strategy injects post-hydration,
        which races Playwright AUTH-08 (anti-abuse.spec.ts:25) — see
        .planning/debug/d-ci-app-failures.md Cause 4. This page is the ONLY route
        where the Turnstile widget is mounted; keeping the script here (not in a
        layout) preserves the AUTH-08 negative spec (anti-abuse.spec.ts:31) which
        asserts /login does NOT load the script.
      */}
      <script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        async
        defer
      />
      <MainContainer width="form">
        <Card>
          <CardHeader>
            <h1 className="font-display text-3xl">{t('title')}</h1>
          </CardHeader>
          <CardContent>
            <RegistrationForm formStamp={formStamp} />
          </CardContent>
        </Card>
      </MainContainer>
    </>
  );
}
```

DO NOT:
- Move the script into a shared layout (`(auth)/layout.tsx` or root layout) — that would put it on /login too and break the negative spec.
- Use `next/script` here — the whole point is to bypass `afterInteractive` injection.
- Add an `onload=` query param or named global — the widget will poll for `window.turnstile` instead (Task 2).
- Add `crossOrigin` / `integrity` / `nonce` attributes — Cloudflare's api.js URL is unversioned (`/v0/`), no SRI hash to pin against; CSP nonce isn't currently used in this project.
  </action>
  <verify>
    <automated>grep -c 'challenges\.cloudflare\.com/turnstile/v0/api\.js' src/app/\(frontend\)/\(auth\)/register/page.tsx | grep -v '^0$'</automated>
  </verify>
  <done>
- `src/app/(frontend)/(auth)/register/page.tsx` contains a literal `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" async defer />` tag.
- The `<h1>` and `<RegistrationForm />` are still rendered (other auth-page specs continue to pass).
- File still type-checks (`pnpm tsc --noEmit` clean for this file's diff).
  </done>
</task>

<task type="auto">
  <name>Task 2: Refactor TurnstileWidget to drop next/script and poll window.turnstile until defined</name>
  <files>src/components/forms/TurnstileWidget.tsx</files>
  <action>
Remove the `<Script>` JSX element and the `import Script from 'next/script';` line. The api.js script is now loaded by the Server Component (Task 1). The widget's responsibility shrinks to: wait for `window.turnstile` to become available, then call `renderWidget()`.

Replace the Script-wired `onReady` mechanism with an interval-based poll inside a new `useEffect`. Keep ALL existing behavior intact:
- `renderWidget()` callback (lines 49-67) — UNCHANGED, including sitekey-missing defensive check, `appearance: 'interaction-only'`, `callback` → `setStatus('ready')`, `error-callback` → `setStatus('error')`, `expired-callback` → `setStatus('loading')`.
- The "already cached and ready before mount" effect at line 70-72 — UNCHANGED (still useful: if api.js was cached from a prior visit, `window.turnstile` is defined immediately on mount).
- The 12s fail-loud timeout (lines 77-83) — UNCHANGED.
- The `onStatusChange` callback effect (lines 45-47) — UNCHANGED.
- The `Window.turnstile` global declaration block (lines 6-22) — UNCHANGED.
- The doc comment at lines 26-35 — UPDATE to reflect that api.js is now loaded by the parent Server Component, not via next/script in this widget.

Add a new `useEffect` that polls `window.turnstile` every 100ms and calls `renderWidget()` once it's defined, then clears the interval. Bail out if the widget is already rendered (`idRef.current` set). Cap poll attempts at 120 (12s — matches the existing fail-loud timeout) to avoid leaking the interval if api.js never loads.

Concrete shape (replacing lines 85-100):

```tsx
// api.js is loaded by the parent Server Component (see src/app/(frontend)/(auth)/register/page.tsx).
// Poll for window.turnstile until the script finishes executing and exposes the global.
useEffect(() => {
  if (idRef.current || window.turnstile) {
    renderWidget();
    return;
  }
  let attempts = 0;
  const interval = setInterval(() => {
    attempts += 1;
    if (window.turnstile) {
      clearInterval(interval);
      renderWidget();
    } else if (attempts >= 120) {
      // 12s — matches the existing fail-loud timeout effect below.
      clearInterval(interval);
      // status will flip to 'error' via the timeout effect.
    }
  }, 100);
  return () => clearInterval(interval);
}, [renderWidget]);

return <div ref={ref} />;
```

Then delete the `<>` fragment + `<Script ... />` JSX. The component now returns a single `<div ref={ref} />`.

Doc-comment update (lines 26-35) — replace with:

```tsx
/**
 * api.js is loaded with `?render=explicit` by the Server Component at
 * `src/app/(frontend)/(auth)/register/page.tsx` (raw <script async defer>).
 * That ensures the script tag is in the initial SSR HTML, which (a) loads
 * earlier than next/script's post-hydration injection in production, and
 * (b) makes AUTH-08 (Playwright spec asserting script presence on /register)
 * pass on first attempt without retries — see
 * .planning/debug/d-ci-app-failures.md Cause 4.
 *
 * We always call `window.turnstile.render()` ourselves (`?render=explicit`
 * disables auto-render) — that is the only reliable way to wire `callback`
 * and `error-callback` into React state. We poll `window.turnstile` until
 * api.js finishes executing.
 *
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` must be inlined at build time — see
 * Dockerfile builder stage and scripts/deploy-fly.sh for how it's passed
 * via Docker build args.
 */
```

DO NOT:
- Change the `TurnstileWidget` props signature or `TurnstileStatus` type export — RegistrationForm consumes both.
- Remove the cached-script effect at lines 70-72 (it's a fast path for navigating back to /register after the script is already cached — still relevant).
- Change the 12s timeout duration or the `appearance: 'interaction-only'` mode (those are tuned per .planning/debug/resolved/registration-flow-cascade.md).
- Add a `<script>` tag inside this component as a "fallback" — that would re-introduce client-side script injection and re-create the race in any future component using this widget.
- Use `addEventListener('load', ...)` on `window` — the api.js `async` execution is not gated on `window.load`; polling is simpler and works in all cases (including HMR remounts in dev).
  </action>
  <verify>
    <automated>! grep -E "from 'next/script'|<Script " src/components/forms/TurnstileWidget.tsx</automated>
  </verify>
  <done>
- `src/components/forms/TurnstileWidget.tsx` no longer imports from `next/script` and contains no `<Script ... />` JSX.
- The component contains `window.turnstile` reference inside a polling `useEffect`.
- All existing behavior preserved: `onStatusChange` callback effect, `renderWidget` defensive sitekey check, error-callback / expired-callback wiring, 12s fail-loud timeout effect.
- File type-checks clean (`pnpm tsc --noEmit` for this file's diff).
- Doc comment updated to reflect new architecture.
  </done>
</task>

<task type="auto">
  <name>Task 3: Verify AUTH-08 passes first-attempt locally + negative + AUTH-10 still pass</name>
  <files>(no source edits — verification only)</files>
  <action>
Run the anti-abuse spec file against a fresh local Next.js server. Assert:

1. AUTH-08 positive (`anti-abuse.spec.ts:25` — script present on /register) passes on FIRST attempt, NOT after retry.
2. AUTH-08 negative (`anti-abuse.spec.ts:31` — script absent on /login) passes.
3. AUTH-10 (`anti-abuse.spec.ts:5` — disposable email) still passes (regression check — Turnstile must still resolve so the submit button enables).

Command:

```bash
pnpm exec playwright test tests/e2e/anti-abuse.spec.ts --project=chromium-desktop --reporter=list
```

The Playwright config (`playwright.config.ts`) auto-starts the Next.js webServer using `.env.test`, so no manual server boot is needed. Test sitekey `1x00000000000000000000AA` always passes Turnstile, so AUTH-10 will reach submit-time.

To prove the FIRST-attempt requirement (no retry), inspect the report output for `retry #` markers. The default Playwright config retries on failure; we want all three tests to show `retry #0` only (i.e. green on first run). If any test green only after `retry #1`, the fix is incomplete.

Alternative explicit check — run with `--retries=0`:

```bash
pnpm exec playwright test tests/e2e/anti-abuse.spec.ts --project=chromium-desktop --reporter=list --retries=0
```

If all 3 specs green with `--retries=0`, the timing race is fixed.

DO NOT:
- Edit `tests/e2e/anti-abuse.spec.ts` (out of scope per CLAUDE.md guardrails).
- Adjust playwright.config.ts retries or timeouts (we want to prove the source fix works under the existing config).
- Skip the negative spec — confirming /login is unaffected is the asymmetry guarantee in the constraints.

If a spec fails:
- AUTH-08 positive failing on first attempt → SSR script tag is not actually shipping; re-check Task 1 (look for `<script>` in `view-source:http://localhost:3000/register`).
- AUTH-08 negative failing (script appears on /login) → verify Task 1 placed the tag in `/register/page.tsx` ONLY, not in any layout.
- AUTH-10 failing → Turnstile didn't resolve; check console for `[turnstile]` errors, likely a regression in the polling logic from Task 2.
  </action>
  <verify>
    <automated>pnpm exec playwright test tests/e2e/anti-abuse.spec.ts --project=chromium-desktop --reporter=list --retries=0</automated>
  </verify>
  <done>
- All 3 anti-abuse specs (AUTH-10, AUTH-08 positive, AUTH-08 negative) pass on first attempt with `--retries=0`.
- No `retry #1` markers in test output.
- Console output shows `3 passed` (or matching count if Playwright reports it as `3 passed (Xs)`).
  </done>
</task>

</tasks>

<verification>
**Manual cross-checks (after automated tasks pass):**

1. View source on `/register` (browser or `curl -s http://localhost:3000/register | grep challenges.cloudflare`) — confirms the `<script>` tag is in the initial HTML, not injected later.
2. View source on `/login` — must NOT contain `challenges.cloudflare.com`.
3. Open `/register` in a browser, watch DevTools Network tab — `api.js` request fires immediately on navigation, not after a delay.
4. The submit button on `/register` becomes enabled (Turnstile resolves) within ~3 seconds — the user-flow regression test.
5. Confirm no `next/script` import remains in `TurnstileWidget.tsx`:
   ```bash
   grep -n "next/script" src/components/forms/TurnstileWidget.tsx
   ```
   Expected: 0 matches.

**Type check:**
```bash
pnpm tsc --noEmit
```
Expected: 0 errors related to the two changed files.
</verification>

<success_criteria>
- [ ] `src/app/(frontend)/(auth)/register/page.tsx` emits `<script src=".../api.js?render=explicit" async defer />` in SSR HTML.
- [ ] `src/components/forms/TurnstileWidget.tsx` no longer imports `next/script`.
- [ ] `src/components/forms/TurnstileWidget.tsx` polls `window.turnstile` and calls `renderWidget()` once defined.
- [ ] `pnpm exec playwright test tests/e2e/anti-abuse.spec.ts --project=chromium-desktop --retries=0` reports `3 passed`.
- [ ] AUTH-08 negative spec on `/login` still asserts `script count = 0` and passes.
- [ ] No regression in AUTH-10 (Turnstile still resolves so submit fires).
- [ ] `pnpm tsc --noEmit` clean for the two modified files.
- [ ] No edits to `tests/e2e/anti-abuse.spec.ts`, no edits to any layout, no edits to `/login` or `/auth/otp` pages.
</success_criteria>

<output>
After completion, create `.planning/quick/260502-vau-fix-auth-08-turnstile-script-timing-race/260502-vau-SUMMARY.md` documenting:
- The two file changes (paths + brief diff narrative).
- Confirmation that `--retries=0` run was green for all 3 anti-abuse specs.
- Note that this resolves Cause 4 of `.planning/debug/d-ci-app-failures.md` (one of 4 root causes; the other 3 are tracked separately).
- Hand-off note: orchestrator handles git commit + STATE.md update + d-ci-app-failures.md status flip.
</output>
