---
slug: registration-flow-cascade
status: resolved
trigger: registration flow on https://chastnik.eu broken end-to-end — Turnstile, OTP page, email worker, OTP input all had distinct bugs that hid each other
created: 2026-05-01
updated: 2026-05-02
resolved: 2026-05-02
supersedes:
  - .planning/debug/turnstile-button-stuck-disabled.md
---

# Debug Session: registration-flow-cascade

## Final state

End-to-end flow works in production: registration form submits → redirects to /auth/otp → OTP code arrives via email → user types code → form submits → user logged in.

## Bug 1 — Turnstile widget stuck (`Проверката за бот не премина`)

### Initial layered symptoms
- (Iteration A) Cloudflare auto-rendered widget on page load. Manual checkbox click "passed" but form stayed disabled.
- (Iteration B, after first fix) Widget invisible. Red error appeared 12s after page load regardless of interaction.
- (Iteration C, with diagnostic logging) Browser console: `Uncaught TurnstileError: ... parameter "sitekey", expected "string", got "undefined"`.

### Wrong turn (kept for future-debugger reference)
First diagnosis assumed a server-side `verifyTurnstile()` rejection (site/secret mismatch, hostname not whitelisted). Added diagnostic logging in `src/lib/turnstile.ts` — never fired because the submit button was disabled, so the server action never ran. Logging kept (cheap, useful for future siteverify failures).

### Real root cause
`NEXT_PUBLIC_TURNSTILE_SITE_KEY` was `undefined` in the deployed client bundle. Three converging facts:
1. `Dockerfile` builder stage ran `pnpm build` with no `NEXT_PUBLIC_*` env vars in scope.
2. `.env.production.local` had the values locally, but `.dockerignore:12` excludes it from the build context.
3. Fly secrets only inject at runtime, not into the build container.

`next build` inlined the literal `undefined` into the JS bundle. At runtime, `window.turnstile.render(div, { sitekey: undefined, ... })` threw → no callbacks → 12s widget timeout fired → red error.

The TypeScript `!` non-null assertion on `process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!` masked it at compile time.

### Fix
- `Dockerfile` — added `ARG` + `ENV` for `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_COOKIEYES_SITE_KEY` in the builder stage so `next build` sees them.
- `scripts/deploy-fly.sh` (NEW) — wrapper reads `.env.production.local` and forwards values via `flyctl deploy --build-arg`. Avoids long shell commands; values never echoed to terminal.
- `.github/workflows/deploy.yml` — same args sourced from GitHub repo secrets so `git push main` builds correctly. **Repo secrets must be set**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_COOKIEYES_SITE_KEY`.
- `src/components/forms/TurnstileWidget.tsx` — defensive check for missing sitekey (logs a console error rather than letting `TurnstileError` throw silently). Also rewrote the script-loading logic with `?render=explicit` + `Script.onReady` to remove a separate race-condition bug exposed during diagnosis.

## Bug 2 — Pre-populated "code invalid" error on OTP page

`src/components/forms/OtpForm.tsx:13` had `const initial: VerifyOtpState = { ok: false, error: 'auth.otp.invalid' };` as the `useActionState` initial value, so the red error was always rendered before the user typed anything.

### Fix
- `src/app/actions/verify-otp.ts` — widened type so `error` is optional in the `ok: false` variant.
- `src/components/forms/OtpForm.tsx` — changed initial state to `{ ok: false }` (no error).

## Bug 3 — Email worker crashing on `React is not defined`

Fly worker logs: `[worker] failed N register-otp React is not defined`.

`src/lib/email/worker.tsx` and the React Email templates (`OtpEmail.tsx`, `LoginOtpEmail.tsx`, `WelcomeEmail.tsx`) use JSX. The worker process is run via `tsx scripts/start-worker.ts` (separate Fly process group `worker`). `tsx` uses esbuild's classic JSX transform — JSX compiles to `React.createElement(...)`, which requires `React` to be in scope.

`tsconfig.json` has `"jsx": "preserve"` — correct for Next's SWC (which uses the automatic runtime), but esbuild defaults to classic. Next.js webpages worked because Next compiles JSX itself; the worker bypasses Next.

### Fix
- Added `import React from 'react'` to `worker.tsx` and the three template files. Harmless under Next's automatic runtime; required by esbuild's classic transform.

## Bug 4 — Resend button silently fails (nested forms)

After clicking "Изпрати нов код": no pending state, no text change, no URL change. Action never fired.

`OtpForm.tsx` had:
```tsx
<form action={verifyOtp}>           ← outer form
  ...
  <ResendButton ... />
    └─ <form action={requestOtp}>   ← inner form (nested HTML — invalid)
         <Button type="submit">
       </form>
</form>
```

Nested `<form>` elements are invalid HTML. Browsers behave inconsistently and React's `useActionState` form submission silently fails to fire on the inner form.

### Fix
- Restructured `OtpForm.tsx` so the verify form and the resend form are siblings (wrapped in a plain `<div>` for layout) rather than nested.
- Added a success indicator on the resend form (`auth.otp.sent` message) so the user gets visible feedback when the action succeeds.

## Bug 5 — OTP input boxes don't accept typing (input-otp / React 19 incompat)

User could see the 6 OTP boxes but nothing happened when typing. Browser DevTools showed no `<input>` element inside the OTP container.

`input-otp@1.4.2` is the latest published version. Its `peerDependencies.react: "^18.2.0"` excludes React 19 entirely, and the component fails to render its underlying `<input>` element under React 19's stricter hydration rules. No console error — silent failure.

### Fix
- `src/components/forms/OtpForm.tsx` — replaced `<InputOTP>` block with a plain `<Input>` (single-field, `maxLength=6`, `inputMode="numeric"`, `autoComplete="one-time-code"`, `autoFocus`, monospace + wide letter-spacing styling). Auto-submits on 6th digit, same as before. No library dependency.

## Files changed (diff)

```
.github/workflows/deploy.yml              |  8 ++-
Dockerfile                                |  9 +++
src/app/actions/verify-otp.ts             |  2 +-
src/components/forms/OtpForm.tsx          | 96 ++++++++++++++++++++----------
src/components/forms/TurnstileWidget.tsx  | 80 ++++++++++++++++---------
src/lib/email/templates/LoginOtpEmail.tsx |  1 +
src/lib/email/templates/OtpEmail.tsx      |  1 +
src/lib/email/templates/WelcomeEmail.tsx  |  1 +
src/lib/email/worker.tsx                  |  4 ++
src/lib/turnstile.ts                      | 18 +++++-
scripts/deploy-fly.sh                     | NEW
```

## Outstanding cleanup (non-blocking)

1. **Add GitHub repo secrets** so automated deploys via `git push main` work: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_COOKIEYES_SITE_KEY`.
2. **Build-time env validator** — a `scripts/check-env.ts` that runs before `pnpm build` and fails loudly when any `NEXT_PUBLIC_*` referenced in client code is missing. Would have caught Bug 1 at build time, not at runtime.
3. **Delete unused `src/components/ui/input-otp.tsx`** if nothing else references it.
4. **Open an issue / PR upstream against `input-otp`** for React 19 support, or migrate to a modern OTP component (e.g., a small custom one that splits the single input into 6 styled spans).
5. **Watch for the separate Payload `getFromImportMap` warning** for `@payloadcms/next/rsc#CollectionCards` and the `No email adapter provided` warning surfaced earlier in this debug arc — both are cosmetic / separate phases.
