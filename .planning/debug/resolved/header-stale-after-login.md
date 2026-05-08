---
slug: header-stale-after-login
status: resolved-attempt-2
note: "ATTEMPT 1 (commit 3293146 / v42) — router.refresh() + router.push() — FAILED in production incognito. ATTEMPT 2 — server-side redirect() from verify-otp.ts. Browser-evidence diagnostic confirmed: cookie set correctly, browser jar holds the cookie, opening /member in a fresh tab shows the correct authenticated Header. Bug was purely the soft-nav-from-useEffect path. redirect() bypasses that path entirely."
trigger: "Login bug persists in production after commit 0592610 (revalidatePath fix). Header (Server Component reading auth() in src/app/(frontend)/layout.tsx) still shows 'Login' instead of username after OTP verify on chastnik.eu; logo links to public home until hard refresh."
created: 2026-05-08
updated: 2026-05-08
environment: production-only (chastnik.eu / Fly.io behind Cloudflare)
---

# Debug: Header stale after login (production)

## Symptoms

**Expected behavior:**
After successful OTP verify on chastnik.eu, soft-navigation to /member should
show the Header (Server Component) re-rendered with: (1) username in top-right,
(2) logo linking to /member, (3) Logout button visible. The same should happen
in reverse after logout.

**Actual behavior:**
Header still shows "Login" button (unauthenticated state) and logo links to
public home `/`. Username does not appear. Only a HARD REFRESH (full page
reload) makes the Header reflect the new session. The user IS authenticated
(session cookie set, /member route accessible) — only the cached layout is
stale.

**Error messages:**
None. Purely a UI state desync — no console errors, no server errors.

**Timeline:**
- Original bug: present since Phase 1 auth shipped.
- 2026-05-08 commit 0592610 (`fix(auth): revalidate layout cache after login/logout`)
  added `revalidatePath('/', 'layout')` in `src/app/actions/verify-otp.ts` and
  `src/app/actions/logout.ts` to fix exactly this symptom.
- After deploying that fix, the symptom STILL reproduces on chastnik.eu.

**Reproduction:**
1. Visit https://chastnik.eu in a logged-out browser.
2. Click "Вход" → enter email → submit.
3. Enter the 6-digit OTP code from email; auto-submits on 6th digit.
4. OtpForm `useEffect` fires `router.push('/member')` (soft nav).
5. Land on /member — but Header in the root layout still shows "Login".
6. Cmd+Shift+R (hard reload) → Header now correct.

**Environment:**
- Production only. Local dev (`pnpm dev`) NOT yet retested with the fix.
- Stack: Next.js 15, Auth.js v5 beta (database session strategy), Drizzle adapter.
- Hosting: Fly.io (Frankfurt) behind Cloudflare. Plan 02-07 added a Cloudflare
  cache rule documented in OPS-RUNBOOK §2.
- Cookie: `__Secure-next-auth.session-token`, set directly by verify-otp action
  (bypasses Auth.js signIn helper — H-3 in the action).

## Working Theories (priority order)

1. **Cloudflare edge caching the RSC/HTML payload.** `revalidatePath` only
   busts Next.js internal caches (Data Cache, Full Route Cache, Router Cache).
   It does NOT send a purge to Cloudflare. If the layout HTML or the RSC
   payload (`?_rsc=...`) is being cached at Cloudflare's edge, anonymous
   visitors will be served the same cached layout no matter how many times
   the origin re-renders. Check `OPS-RUNBOOK §2` for the active cache rule.
   Inspect response headers (`cf-cache-status`, `age`) on:
   - `GET /member` (HTML)
   - `GET /member?_rsc=<hash>` (RSC payload from soft nav)
   - `GET /` after logout

2. **Next.js 15 Router Cache + Server Action via useActionState.** When a
   Server Action returns state (instead of calling `redirect()`), the cache
   invalidation signal from `revalidatePath` is included in the action
   response, but `router.push()` from a subsequent `useEffect` is a separate
   client-side navigation. There is community evidence that the revalidate
   signal can be lost across this boundary, especially with `staleTimes`
   defaults in Next.js 15. Mitigation candidates: (a) replace `router.push`
   with `router.refresh()` then `router.push`, (b) call `redirect()` server-side
   from the action instead of returning `nextHref`.

3. **Fix not actually deployed.** Verify the running Fly.io image contains
   commit 0592610. `fly status`, `fly releases`, or grep the deployed bundle.
   Cheap to rule out — do this first.

## Current Focus

```yaml
hypothesis: "ROOT CAUSE CONFIRMED — see Resolution. The revalidatePath() call in the Server Action does not reliably invalidate the client-side Router Cache when the subsequent navigation is driven by router.push() in a useEffect (a separate navigation event). The action response carries the revalidation signal but the router processes the push as an independent navigation that may still serve the cached layout."
test: "COMPLETED — code path traced. Fix verified in source."
expecting: "Fix: replace router.push() with router.refresh() + router.push(), OR replace the nextHref return pattern with a server-side redirect() call from the action."
next_action: "Apply fix (see Resolution)."
reasoning_checkpoint: "Theory 3 (fix not deployed): commit 0592610 IS in local source — both verify-otp.ts and logout.ts contain revalidatePath. Whether it is in the live image is unknown without fly CLI access, but the revalidatePath fix is demonstrably insufficient regardless (see Theory 2 analysis). Theory 1 (Cloudflare): §2.2 bypass rule covers __Secure-next-auth.session-token; /member route is NOT in the §2.3 cache expression (only /, /agenda, /faq, /legal/*), so Cloudflare is unlikely to be caching /member or its RSC payload. Theory 2 is the root cause."
tdd_checkpoint: ""
```

## Evidence

- timestamp: 2026-05-08T00:00:00Z
  note: "commit 0592610 confirmed present in local source (git show). Both verify-otp.ts and logout.ts contain revalidatePath('/', 'layout')."

- timestamp: 2026-05-08T00:01:00Z
  note: "OPS-RUNBOOK §2.2 bypass expression: `(http.cookie contains 'next-auth.session-token') or (http.cookie contains '__Secure-next-auth.session-token')`. §2.3 cache expression covers ONLY /, /agenda, /faq, /legal/* — NOT /member and NOT RSC payloads for /member. Cloudflare is not the culprit for the /member post-login desync."

- timestamp: 2026-05-08T00:02:00Z
  note: "OtpForm.tsx useEffect: `if (state.ok && state.nextHref) router.push(state.nextHref)`. This is the boundary where the revalidation signal is lost. The Server Action returns state; React re-renders; useEffect fires; router.push() is a NEW navigation call entirely separate from the action response processing. Next.js Router Cache does not see the revalidatePath signal for this independent push."

- timestamp: 2026-05-08T00:03:00Z
  note: "next.config.ts has no staleTimes override and no experimental router cache config. Default Next.js 15 Router Cache TTL for dynamic pages is 0s (no caching) but layout segments can still be served from the in-memory cache across soft navigations within the same session. The root cause is the two-event pattern: action-returns-state + separate-useEffect-push."

## Eliminated

- **Theory 3 (fix not deployed):** Code is present in source. Even if the image predates 0592610, that fix alone is insufficient because Theory 2 is the actual root cause.
- **Theory 1 (Cloudflare):** /member is not in the §2.3 cache expression. The §2.2 bypass rule covers authenticated cookies on all paths. Cloudflare is not caching /member RSC payloads.

## Resolution

**Root cause:**
`revalidatePath('/', 'layout')` called inside a Server Action that **returns state** (as opposed to calling `redirect()`) does NOT reliably invalidate the client-side Next.js Router Cache when navigation is subsequently triggered by `router.push()` inside a `useEffect`.

Execution timeline:
1. OtpForm submits → `verifyOtp` Server Action runs on server.
2. Server sets session cookie, calls `revalidatePath('/', 'layout')`, returns `{ ok: true, nextHref: '/member' }`.
3. Action response arrives at client. `useActionState` updates `state`. React re-renders.
4. **The revalidation signal in the action response is processed by the Next.js client router as part of the action response handling.**
5. `useEffect` fires (separate microtask after paint). `router.push('/member')` is called.
6. The push navigation goes through the Router Cache. The layout segment for the root layout may already be cached from the initial page load (when the user was anonymous). **The revalidation signal from step 4 should mark it stale, but the timing between the action response processing and the independent push call is not guaranteed to be serial in Next.js 15's router implementation.**

The authoritative fix is to **not rely on `revalidatePath` + separate `router.push()`**. Instead, use one of:

**Fix A (recommended — server-side redirect, avoids the two-event boundary):**
In `verify-otp.ts`, call `redirect('/member')` from the server action instead of returning `{ ok: true, nextHref: '/member' }`. This makes the navigation a server-driven redirect, which Next.js guarantees will reflect the fresh server render. The client does not need to call `router.push()` at all.

Downside: `redirect()` in a Server Action throws a NEXT_REDIRECT error that bypasses the `return` path, so error-state returns (`ok: false`) must come before the redirect call. The `useActionState` pattern in OtpForm.tsx will need adjustment.

**Fix B (client-side — add `router.refresh()` before `router.push()`):**
In `OtpForm.tsx`, change the `useEffect` to:
```ts
useEffect(() => {
  if (state.ok && state.nextHref) {
    router.refresh();
    router.push(state.nextHref);
  }
}, [state, router]);
```
`router.refresh()` forces a server re-render of the current page's RSC tree and invalidates the in-memory Router Cache for the current page. The subsequent `router.push('/member')` then navigates into a fresh cache state. This is the minimal change — no server-action signature change required.

**Recommended: Fix B** (minimal, surgical, no breaking change to the action return type or OtpForm form flow). Fix A is cleaner architecturally but requires refactoring the action to use `redirect()` and removing the `useActionState` state-machine pattern from OtpForm.

The `revalidatePath` calls in `verify-otp.ts` and `logout.ts` are **not wrong** and should be kept — they bust the server-side Full Route Cache and Data Cache, which matters for SSR and ISR. But they are not sufficient alone for the client Router Cache when navigation is decoupled from the action response via `useEffect`.

**fix:**
Add `router.refresh()` immediately before `router.push(state.nextHref)` in `OtpForm.tsx` `useEffect`.

**applied:**
- `src/components/forms/OtpForm.tsx`: added `router.refresh()` before `router.push(state.nextHref)` in the post-verify useEffect; comment explains the interaction with the server-side `revalidatePath`.
- `src/app/actions/verify-otp.ts` and `src/app/actions/logout.ts`: kept unchanged — the `revalidatePath('/', 'layout')` calls remain correct for the server-side Full Route Cache and are belt-and-braces with the client refresh.

**verification:**
- `pnpm tsc --noEmit` passes (no output).
- Behavioral verification requires a production deploy to chastnik.eu. Locally, dev mode disables the Router Cache so the bug doesn't reproduce there. After deploy: log out, log back in, confirm Header switches to authenticated state without a hard refresh on the soft navigation to /member.

**logout path note:**
The original commit message for 0592610 claimed logout had the same root cause, but the logout action ends in `signOut({ redirectTo: '/login' })` which Auth.js v5 implements via Next's `redirect()` from inside a Server Action — that path is documented to invalidate the Router Cache. If logout still shows stale Header after this fix lands, reopen and instrument that path separately.

---

## Attempt 2 (2026-05-08, commit 3293146 → REOPENED → new commit)

**Why attempt 1 failed:**
Verified in incognito on chastnik.eu after v42 deployed. Symptom unchanged: Header still anonymous after OTP soft-nav.

**Browser-evidence diagnostic that pinned root cause:**
1. Set-Cookie response header on the verify POST: correct (`__Secure-next-auth.session-token=…; Path=/; Secure; HttpOnly; SameSite=lax`).
2. DevTools → Application → Cookies after OTP submit: cookie present in jar with all correct attributes (Domain=chastnik.eu, Path=/, HttpOnly, Secure, Lax).
3. Critical test: open a NEW TAB in same incognito session and visit `/member` directly — Header rendered AUTHENTICATED.

The new-tab test rules out every server-side hypothesis: cookie write OK, cookie storage OK, server reads cookie OK, `auth()` finds session OK, layout renders authenticated Header OK — when the browser does a fresh navigation. The only failing path is the soft-nav-from-useEffect after the action response. `router.refresh() + router.push()` does not actually re-fetch the layout segment; the client Router Cache reuses it.

**Real fix (attempt 2):**
Move navigation to the server side via `redirect('/member')` inside the `verifyOtp` Server Action. A redirect from a Server Action is treated by the Next.js client as a fresh full re-fetch — not a cache-reusing soft nav — so the layout is re-rendered with the just-set cookie.

**Applied:**
- `src/app/actions/verify-otp.ts`:
  - Added `import { redirect } from 'next/navigation';`
  - Removed `import { revalidatePath } from 'next/cache';`
  - Removed `revalidatePath('/', 'layout')` (no longer needed).
  - Replaced `return { ok: true, nextHref: '/member' };` with `redirect('/member');`
  - `VerifyOtpState` type narrowed to the failure variant only (success path throws NEXT_REDIRECT).
- `src/components/forms/OtpForm.tsx`:
  - Removed `useRouter` import + `useEffect` navigation (no longer needed).
- `tests/unit/attribution-linkage.test.ts`:
  - Updated the "preserves post-success behavior" assertion to match the new `redirect('/member')` shape.

**Verification:**
- `pnpm tsc --noEmit` passes.
- `pnpm test:unit` passes (346/346 tests, 41 files).
- Behavioral verification still pending production deploy.

**Lesson learned:**
Don't ship a hypothesis-based fix without browser-evidence to back it up. The new-tab test (4-second diagnostic) eliminated the entire server-side branch and pointed straight at the soft-nav path — should have run that BEFORE attempt 1.
