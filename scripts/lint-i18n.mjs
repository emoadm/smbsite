#!/usr/bin/env node
// PUB-05 enforcement: no Cyrillic literals in src/ except messages/bg.json.
//
// Exemptions:
//   - EXEMPT_DIRS: directories whose contents are admin-only or not part of
//     the next-intl message catalogue (e.g. Payload CMS collection/global
//     definitions whose admin labels surface only in /admin).
//   - EXEMPT_FILES: specific files whose contents ARE Bulgarian by nature
//     (proper-noun lookup tables — region names, etc.).
//   - Per-line `i18n-allow:` pragma in a trailing comment for one-off cases.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('src');
const CYRILLIC = /[Ѐ-ӿ]/;
const PRAGMA = /i18n-allow:/;

const EXEMPT_DIRS = [
  path.resolve('src/collections'),
  path.resolve('src/globals'),
];
const EXEMPT_FILES = [
  path.resolve('src/lib/oblast-names.ts'),
];

const offenders = [];

function isExemptDir(p) {
  return EXEMPT_DIRS.some((d) => p === d || p.startsWith(d + path.sep));
}

function isExemptFile(p) {
  return EXEMPT_FILES.includes(p);
}

function walk(dir) {
  if (isExemptDir(dir)) return;
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(entry)) check(p);
  }
}

function check(file) {
  if (isExemptFile(file)) return;
  const text = readFileSync(file, 'utf8');
  // Pragma check happens BEFORE comment stripping so a trailing
  // `// i18n-allow: <reason>` on the same line marks that line exempt.
  const rawLines = text.split('\n');
  // Strip block + line comments for the Cyrillic search itself, but keep
  // line indices aligned via rawLines.
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const lines = stripped.split('\n');
  lines.forEach((line, i) => {
    if (!CYRILLIC.test(line)) return;
    const raw = rawLines[i] ?? '';
    if (PRAGMA.test(raw)) return;
    offenders.push(`${file}:${i + 1}: ${line.trim()}`);
  });
}

walk(SRC);

if (offenders.length) {
  console.error('PUB-05 violation: hardcoded Cyrillic strings in src/. Move to messages/bg.json:');
  offenders.forEach((o) => console.error('  ' + o));
  console.error('');
  console.error('Exempt by design:');
  console.error('  - src/collections/, src/globals/  (Payload admin UI labels)');
  console.error('  - src/lib/oblast-names.ts          (proper-noun lookup)');
  console.error('  - any line with `// i18n-allow: <reason>` pragma');
  process.exit(1);
}
console.log('PUB-05 OK: no hardcoded Cyrillic in src/');
