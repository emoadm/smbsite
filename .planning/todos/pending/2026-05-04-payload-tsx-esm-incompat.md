---
created: 2026-05-04
priority: high
phase: 02.1
resolves_phase: 03
tags: [ops, ci, payload, tooling, deferred]
---

# Re-enable Payload migrate step (tsx@4.21 + Node 22 ESM incompat)

## Status
Deferred mid-Phase-02.1 verify-work, blocking the prod deploy of the dashboard importMap fix (`fix(02.1-07): populate Payload importMap with AttributionView entry`, commit `c37a09b`).

Step temporarily commented out in `.github/workflows/deploy.yml` (`migrate` job → `Payload migrate`). Restored value: `CI=true PAYLOAD_MIGRATING=true pnpm exec payload migrate` with `PAYLOAD_DATABASE_URL` + `PAYLOAD_SECRET` env.

## Why deferred for now
- Only one Payload migration exists (`src/migrations/20260501_160443_init.ts`, May 2026), already applied to prod and staging.
- No new Payload-collection schema changes are pending in any open branch.
- The same break exists locally — anyone who edits a Payload collection will discover it before they can merge, so skipping CI doesn't hide a class of failures.

## Symptom
On Node 22 + tsx@4.21, `pnpm exec payload migrate` errors with:
```
ERR_MODULE_NOT_FOUND: Cannot find module '/.../src/collections/Users'
imported from /.../src/payload.config.ts
```
because `payload.config.ts` has `import { Users } from './collections/Users';` (no extension) and tsx@4.21 removed the auto `.js`→`.ts` resolver rewrite that 4.19 had.

Trying `'./collections/Users.js'` reproduces the same error (Users.js doesn't exist; tsx 4.21 won't synthesize it).

Same root cause as the deferred `2026-05-01-payload-loadenv-patch.md` TODO from Phase 1 — Payload + Next.js + tsx ESM tooling friction.

## How to resolve

Pick one:

1. **Pin tsx to 4.19.x via pnpm overrides** — fastest, but pinning a transitive dep across Next.js + Payload is fragile.
   ```json
   "pnpm": { "overrides": { "tsx": "4.19.2" } }
   ```

2. **Run migrate via a one-shot API route** — mirror the Phase 1 fix `fa4be23` ("replace broken tsx bootstrap script with one-shot API route"). Add `/api/admin/payload-migrate` (admin-role-gated) that calls `payload.migrate()` programmatically. CI hits it after deploy succeeds.

3. **Programmatic migrate script via tsconfig path-alias-friendly tsx flags** — write `scripts/payload-migrate.ts` invoked as `node --import tsx scripts/payload-migrate.ts`, with the right NODE_OPTIONS so tsx's resolver auto-rewrites work.

4. **Add explicit extensions everywhere + `allowImportingTsExtensions`** — touches every relative import in `src/`. Heaviest, most explicit, most future-proof.

## Verify after fix
- `pnpm exec payload migrate --help` succeeds locally
- CI `migrate` job's `Payload migrate` step runs green on a no-op migration
- Add a smoke test: introduce a trivial Payload collection field, generate migration, deploy → step actually applies it on prod

## Tracking
- Block: any new Payload collection schema change (new field, renamed table) until this is fixed
- Owner: TBD
- Blocks roadmap phase: 03 (next phase)
