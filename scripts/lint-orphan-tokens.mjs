#!/usr/bin/env node
/**
 * UI-SPEC review_flag #1 — text-5xl/6xl orphan-token watch.
 *
 * Resolves the watch by enforcing:
 *   - text-6xl MUST appear at least once in src/ (Hero.tsx desktop h1 uses it)
 *   - text-5xl is TOLERATED as reserved (UI-SPEC §3.3 explicit comment).
 *     If usage emerges in future, no change needed.
 *
 * Exits 0 when text-6xl is bound; exits 1 with a fix suggestion otherwise.
 */
import { execSync } from 'node:child_process';

function grepClass(cls) {
  try {
    // -r recursive, -F fixed-string (no regex), -l list files only
    const out = execSync(`grep -rFl --include='*.tsx' --include='*.ts' '${cls}' src/`, { encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

const text6xlFiles = grepClass('text-6xl');
const text5xlFiles = grepClass('text-5xl');

if (text6xlFiles.length === 0) {
  console.error('FAIL: text-6xl is declared in globals.css @theme but unused in src/.');
  console.error('UI-SPEC §5.2 requires Hero.tsx h1 to use `md:text-6xl` for desktop display.');
  console.error('Resolution: ensure src/components/landing/Hero.tsx h1 className includes `md:text-6xl`.');
  process.exit(1);
}

console.log(`OK: text-6xl bound in ${text6xlFiles.length} file(s):`);
for (const f of text6xlFiles) console.log(`  - ${f}`);

if (text5xlFiles.length > 0) {
  console.log(`Note: text-5xl bound in ${text5xlFiles.length} file(s) (was reserved; now in use).`);
} else {
  console.log('Note: text-5xl unbound (reserved per UI-SPEC §3.3 — tolerated).');
}

process.exit(0);
