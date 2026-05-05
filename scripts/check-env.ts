/**
 * Build-time NEXT_PUBLIC_* validator (deploy hardening).
 *
 * Why this exists:
 *   `next build` inlines `process.env.NEXT_PUBLIC_*` into the client bundle.
 *   If a referenced var is missing/empty at build time, the literal `undefined`
 *   is baked into the JS — leading to silent runtime breakage (e.g. Turnstile
 *   widget timing out with no console error). The TS `!` non-null assertion
 *   masks this at compile time.
 *   See: .planning/debug/resolved/registration-flow-cascade.md (Bug 1).
 *
 * What it checks:
 *   1. Drift — every NEXT_PUBLIC_* referenced in src/ MUST be declared as a key
 *      in .env.example. Catches "added a new var but forgot to document it".
 *   2. Missing-in-env — every NEXT_PUBLIC_* referenced in src/ MUST be present
 *      AND non-empty in process.env at build time.
 *
 * Allowance:
 *   Vars present in .env.example but NOT in src/ (e.g. NEXT_PUBLIC_PLAUSIBLE_DOMAIN
 *   declared for future wiring) are intentionally NOT failed when empty. That is
 *   the whole point of this check: it scopes "must be set" to "actually used".
 *
 * Run via:  pnpm exec tsx scripts/check-env.ts   (or via the prebuild gate)
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const REPO_ROOT = process.cwd();
const SRC_DIR = join(REPO_ROOT, 'src');
const ENV_EXAMPLE = join(REPO_ROOT, '.env.example');
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', '.turbo']);
const PUBLIC_VAR_RE = /process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g;
const ENV_KEY_RE = /^([A-Z_][A-Z0-9_]*)=/;

type Hit = { var: string; file: string; line: number };

async function walkSrc(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkSrc(full)));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      out.push(full);
    }
  }
  return out;
}

function stripComments(content: string): string {
  // Strip block comments first, then single-line. We do NOT need perfect
  // accuracy — false-positive elimination is enough; the file:line report
  // re-scans the original (un-stripped) content for human-readable hits.
  return content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function findHitsInOriginal(content: string, varName: string, file: string): Hit[] {
  const hits: Hit[] = [];
  const lines = content.split('\n');
  const re = new RegExp(`process\\.env\\.${varName}\\b`);
  lines.forEach((line, idx) => {
    if (re.test(line)) hits.push({ var: varName, file, line: idx + 1 });
  });
  return hits;
}

async function main(): Promise<void> {
  const files = await walkSrc(SRC_DIR);

  const usedInSrc = new Set<string>();
  const hitsByVar = new Map<string, Hit[]>();

  for (const file of files) {
    const original = await readFile(file, 'utf8');
    const stripped = stripComments(original);
    const matches = stripped.matchAll(PUBLIC_VAR_RE);
    const seenInFile = new Set<string>();
    for (const m of matches) {
      const name = m[1];
      usedInSrc.add(name);
      if (!seenInFile.has(name)) {
        seenInFile.add(name);
        const rel = relative(REPO_ROOT, file);
        const hits = findHitsInOriginal(original, name, rel);
        const acc = hitsByVar.get(name) ?? [];
        acc.push(...hits);
        hitsByVar.set(name, acc);
      }
    }
  }

  // Parse .env.example keys
  const inExample = new Set<string>();
  const envExampleRaw = await readFile(ENV_EXAMPLE, 'utf8');
  for (const rawLine of envExampleRaw.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(ENV_KEY_RE);
    if (m && m[1].startsWith('NEXT_PUBLIC_')) inExample.add(m[1]);
  }

  // Compute set of NEXT_PUBLIC_* vars present AND non-empty in process.env
  const inEnv = new Set<string>();
  for (const name of usedInSrc) {
    const val = process.env[name];
    if (typeof val === 'string' && val.length > 0) inEnv.add(name);
  }

  const drift = [...usedInSrc].filter((n) => !inExample.has(n)).sort();
  const missingInEnv = [...usedInSrc].filter((n) => !inEnv.has(n)).sort();

  let hasErrors = false;

  if (drift.length > 0 || missingInEnv.length > 0) {
    hasErrors = true;
    console.error('FAIL: NEXT_PUBLIC_* env validation');
    console.error('');

    if (drift.length > 0) {
      console.error('  ADD TO .env.example:');
      for (const name of drift) console.error(`    - ${name}`);
      console.error('');
    }

    if (missingInEnv.length > 0) {
      console.error('  MISSING IN ENV (referenced in src/ but missing or empty in process.env):');
      for (const name of missingInEnv) {
        console.error(`    - ${name}`);
        const hits = hitsByVar.get(name) ?? [];
        for (const h of hits) console.error(`        ${h.file}:${h.line}`);
      }
      console.error('');
      console.error('  These vars MUST be set at build time so `next build` can inline them');
      console.error('  into the client bundle. See: .planning/debug/resolved/registration-flow-cascade.md');
      console.error('');
    }
  }

  // Phase 5 — newsletter pipeline + unsubscribe (NOTIF-02 / NOTIF-03 / NOTIF-09)
  // Check required server-side vars in non-test production environments.
  const isTestBuild =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === '1x00000000000000000000AA' &&
    process.env.NODE_ENV === 'test';
  const isProd = process.env.NODE_ENV === 'production' && !isTestBuild;

  if (isProd) {
    const phase5Required = [
      'EMAIL_FROM_NEWSLETTER',
      'UNSUBSCRIBE_HMAC_SECRET',
      'SITE_ORIGIN',
    ];
    const missingPhase5 = phase5Required.filter(
      (v) => !process.env[v] || process.env[v]!.trim() === '',
    );
    if (missingPhase5.length > 0) {
      hasErrors = true;
      console.error('FAIL: Phase 5 newsletter pipeline — required server-side vars missing:');
      for (const name of missingPhase5) {
        console.error(`    - ${name} (must be set via fly secrets set or .env.production)`);
      }
      console.error('');
    }
  }

  if (hasErrors) {
    process.exit(1);
  }

  console.log(`OK: NEXT_PUBLIC_* env validation passed (${usedInSrc.size} vars checked)`);
  process.exit(0);
}

main().catch((err) => {
  console.error('check-env.ts crashed:', err);
  process.exit(2);
});
