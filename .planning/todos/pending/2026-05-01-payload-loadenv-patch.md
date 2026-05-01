---
created: 2026-05-01
priority: medium
phase: 1
resolves_phase: 2
tags: [ops, payload, ci, deferred]
---

# Add patch-package fix for Payload v3 + @next/env loadEnv incompatibility

## Status
Deferred from Phase 1. The Payload v3.84.1 `dist/bin/loadEnv.js` does:
```js
import nextEnvImport from '@next/env';
const { loadEnvConfig } = nextEnvImport;
```
This crashes at runtime because `@next/env` is webpack-bundled CJS with `__esModule: true` but no `default` export — Node ESM interop returns undefined. Affects ALL Payload CLI commands (`payload migrate`, `payload migrate:create`, etc.) but not Next runtime.

During Phase 1, we patched `node_modules/.../payload/dist/bin/loadEnv.js` in-place to be a no-op (env vars are passed externally). The patch survives until the next `pnpm install`.

## Why deferred
Phase 1 ships via `fly deploy --remote-only` — Docker build doesn't invoke `payload migrate` (no migrations needed after the initial commit). The bug only surfaces in:
1. Local `pnpm exec payload migrate` (we hit + patched manually for 01-12 deploy)
2. GitHub Actions deploy.yml's `migrate` step (will hit if user pushes to GH for the first time)

Phase 1 doesn't use the GH Actions deploy path yet.

## How to resolve before Phase 2 ships GH Actions deploys

Pick one:

1. **patch-package** (recommended — survives reinstalls):
   ```bash
   pnpm add -D patch-package
   # apply patch to dist/bin/loadEnv.js (use named import or stub to no-op)
   pnpm patch payload@3.84.1
   # ... edit ...
   pnpm patch-commit <path>
   # add postinstall hook to package.json:
   #   "scripts": { "postinstall": "patch-package" }
   ```

2. **Upgrade Payload to a newer 3.x release** that fixes this (check changelog for "@next/env"). May not exist.

3. **Switch CI deploy path to skip `payload migrate`** — commit migrations and apply via a Drizzle/raw SQL step instead. Loses Payload's migration tracking.

## Verification after fix
```bash
pnpm install                         # patch should auto-apply
pnpm exec payload migrate --help     # should not crash on loadEnv
```

## Note
Plan 01-04 also deferred `payload migrate:create init` and the live migrate. Both have now been done manually:
- Migration committed at `src/migrations/20260501_160443_init.ts`
- Payload Users slug renamed `users → admin_users` to avoid table collision with Drizzle Auth.js `users` table

So the patch is the last remaining issue from this thread.
