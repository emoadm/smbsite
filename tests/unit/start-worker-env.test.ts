import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Phase 5 G1 (UAT gap closure) — start-worker.ts dev-env env-file load.
//
// scripts/start-worker.ts MUST load .env.local (or .env) BEFORE any project
// import that transitively reads process.env at module-eval time. Without
// this, `pnpm worker` crashes on a developer's local box with
//   TypeError: Cannot read properties of undefined (reading 'includes')
//   at src/db/index.ts:14
// because process.env.DATABASE_URL is undefined.
//
// Production (Fly.io) is unaffected because the worker process group inherits
// Fly secrets via the kernel environ; dotenv silently no-ops when no .env
// file is present.
//
// This test is a source-grep contract — it does NOT execute the worker.
// Runtime verification is done manually via `pnpm worker` (documented in the
// plan's <verify> block).

describe('Phase 5 G1 — scripts/start-worker.ts dotenv-first invariant', () => {
  const startWorkerSrc = readFileSync('scripts/start-worker.ts', 'utf8');
  const dbSrc = readFileSync('src/db/index.ts', 'utf8');

  it('start-worker.ts loads dotenv before any project-relative import', () => {
    // Strip comments + shebang so they cannot satisfy the invariant.
    const lines = startWorkerSrc.split('\n');
    const codeLines = lines
      .map((l, i) => ({ line: l, idx: i }))
      .filter(({ line }) => {
        const trimmed = line.trim();
        return (
          trimmed.length > 0 &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('#!')
        );
      });

    // Find first dotenv-loader line (case-insensitive match on the dotenv module).
    const dotenvIdx = codeLines.findIndex(({ line }) => /dotenv/i.test(line));
    // Find first project-relative import. Accepts both static (`import ... from '../src/...'`)
    // and dynamic (`await import('../src/...')` / `import('../src/...')`) forms — the
    // contract is "dotenv loads before any src/ module is evaluated", not the syntax flavour.
    // Plan 05-14 (Phase 5 G4) introduced an async `main()` that uses dynamic imports
    // so the eviction-policy assertion can run between dotenv and src/* loads; both forms
    // honour the underlying invariant.
    const projectImportIdx = codeLines.findIndex(({ line }) =>
      /^\s*import\s.*from\s+['"]\.\.\/src\//.test(line) ||
      /\bimport\s*\(\s*['"]\.\.\/src\//.test(line),
    );

    expect(
      dotenvIdx,
      "scripts/start-worker.ts must load dotenv (e.g. `import 'dotenv/config'`)",
    ).toBeGreaterThanOrEqual(0);
    expect(
      projectImportIdx,
      'scripts/start-worker.ts must import from ../src/...',
    ).toBeGreaterThanOrEqual(0);
    expect(
      dotenvIdx,
      'dotenv loader must appear BEFORE the first project-relative import (otherwise process.env.DATABASE_URL is empty when src/db/index.ts evaluates)',
    ).toBeLessThan(projectImportIdx);
  });

  it('src/db/index.ts fails fast with explicit DATABASE_URL guard (no bare non-null assertion)', () => {
    expect(
      dbSrc,
      'src/db/index.ts must throw an explicit error when DATABASE_URL is not set',
    ).toMatch(/DATABASE_URL is not set/);

    // Filter out comment lines so an explanatory comment cannot satisfy/violate the gate.
    const codeOnly = dbSrc
      .split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(
      codeOnly.match(/DATABASE_URL!/g) ?? [],
      'src/db/index.ts must not use the bare non-null assertion `process.env.DATABASE_URL!` — replace with an explicit guard',
    ).toHaveLength(0);
  });
});
