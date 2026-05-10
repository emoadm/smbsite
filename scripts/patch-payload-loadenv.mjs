#!/usr/bin/env node
// scripts/patch-payload-loadenv.mjs
//
// Postinstall patch — fixes payload@3.84.x's @next/env ESM interop.
//
// History
// -------
// payload@3.84.x's original `dist/bin/loadEnv.js` did:
//
//   import nextEnvImport from '@next/env';
//   const { loadEnvConfig } = nextEnvImport;
//
// Under Node ESM interop with newer @next/env, the default-import is
// `undefined` and the destructure crashed with:
//   "Cannot destructure property 'loadEnvConfig' of 'import_env.default' …"
//
// We first patched to a named import — `import { loadEnvConfig } from '@next/env'` —
// which worked against older @next/env, but @next/env@15.5.x ships a webpack-bundled
// CJS module where `loadEnvConfig` is attached via `__nccwpck_require__.d` and the
// module finishes with `module.exports = n`. Node ESM's static named-export
// detection can't see those dynamically-attached keys and throws:
//   "The requested module '@next/env' does not provide an export named 'loadEnvConfig'"
//
// Final form — `createRequire` to load the CJS module and destructure the named
// export off `module.exports` at runtime. Works regardless of how @next/env shapes
// its exports (default-only, named, or webpack-bundled).
//
// Affects:
//   - `pnpm exec payload migrate` and other Payload CLI commands
//   - The BullMQ worker (scripts/start-worker.ts)
//   - Next.js dev/build server when Payload admin views are loaded
//
// Idempotent — safe to re-run after `pnpm install` or in CI postinstall.
// Tracked by project memory `feedback_gsd_141_sdk_patch.md` and
// STATE.md Deferred Items.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const TARGET = resolve(process.cwd(), 'node_modules/payload/dist/bin/loadEnv.js');

if (!existsSync(TARGET)) {
  console.warn(`[patch-payload-loadenv] target not found: ${TARGET} — skipping`);
  process.exit(0);
}

const original = readFileSync(TARGET, 'utf8');

// Final form — what we want the file to end up looking like.
const FIXED =
  `import { createRequire as _createRequire } from 'node:module';\n` +
  `const _require = _createRequire(import.meta.url);\n` +
  `const { loadEnvConfig } = _require('@next/env');\n` +
  `import { findUpSync } from '../utilities/findUp.js';`;

// Two historical shapes we may encounter on a fresh install.
const SHAPE_DEFAULT_IMPORT =
  `import nextEnvImport from '@next/env';\n` +
  `import { findUpSync } from '../utilities/findUp.js';\n` +
  `const { loadEnvConfig } = nextEnvImport;`;

const SHAPE_NAMED_IMPORT =
  `import { loadEnvConfig } from '@next/env';\n` +
  `import { findUpSync } from '../utilities/findUp.js';`;

if (original.includes(FIXED)) {
  console.warn('[patch-payload-loadenv] already patched — skipping');
  process.exit(0);
}

let patched = original;
if (original.includes(SHAPE_DEFAULT_IMPORT)) {
  patched = original.replace(SHAPE_DEFAULT_IMPORT, FIXED);
} else if (original.includes(SHAPE_NAMED_IMPORT)) {
  patched = original.replace(SHAPE_NAMED_IMPORT, FIXED);
} else {
  console.warn(
    '[patch-payload-loadenv] expected source shape not found — payload version may have changed; please re-derive the patch',
  );
  process.exit(0);
}

writeFileSync(TARGET, patched, 'utf8');
console.warn('[patch-payload-loadenv] patched payload/dist/bin/loadEnv.js (createRequire form)');
