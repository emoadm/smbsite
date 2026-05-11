#!/usr/bin/env node
// scripts/patch-payload-loadenv.mjs
//
// Postinstall patch — fixes payload@3.84.x's broken @next/env interop.
//
// payload/dist/bin/loadEnv.js does:
//
//   import nextEnvImport from '@next/env';
//   const { loadEnvConfig } = nextEnvImport;
//
// @next/env compiles to a CJS module that does NOT expose `default`
// (the bundler does `module.exports = n` where `n` has named exports
// only). Under Node ESM interop the default-import is undefined and
// the destructure throws "Cannot destructure property 'loadEnvConfig'
// of 'import_env.default' as it is undefined."
//
// This crashes:
//   - `pnpm exec payload migrate` and other Payload CLI commands
//   - The BullMQ worker (scripts/start-worker.ts) at runtime, because
//     importing `payload` transitively pulls in loadEnv.js and the
//     module-level destructure runs before any function body is called
//
// Patch: rewrite the two-line default-import + destructure into a
// single named import. Semantically identical, runs on Node 22 ESM,
// no @next/env behavior change.
//
// Idempotent — safe to re-run after `pnpm install` or in CI postinstall.
// Tracked by .planning/todos/pending/2026-05-01-payload-loadenv-patch.md;
// surfaced as a runtime blocker by Phase 5 newsletter Send Test.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET = resolve(process.cwd(), 'node_modules/payload/dist/bin/loadEnv.js');

if (!existsSync(TARGET)) {
  // Not an error — fresh-clone scenarios where pnpm install hasn't placed
  // payload yet, OR a non-monorepo consumer where the path differs.
  console.warn(`[patch-payload-loadenv] target not found: ${TARGET} — skipping`);
  process.exit(0);
}

const original = readFileSync(TARGET, 'utf8');

const BROKEN = `import nextEnvImport from '@next/env';\nimport { findUpSync } from '../utilities/findUp.js';\nconst { loadEnvConfig } = nextEnvImport;`;
const FIXED = `import { loadEnvConfig } from '@next/env';\nimport { findUpSync } from '../utilities/findUp.js';`;

if (original.includes(FIXED) && !original.includes(BROKEN)) {
  console.warn('[patch-payload-loadenv] already patched — skipping');
  process.exit(0);
}

if (!original.includes(BROKEN)) {
  console.warn(
    '[patch-payload-loadenv] expected pattern not found — payload version may have changed; please re-derive the patch',
  );
  process.exit(0);
}

const patched = original.replace(BROKEN, FIXED);
writeFileSync(TARGET, patched, 'utf8');
console.warn('[patch-payload-loadenv] patched payload/dist/bin/loadEnv.js (named-import fix)');
