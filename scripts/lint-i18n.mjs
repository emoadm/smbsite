#!/usr/bin/env node
// PUB-05 enforcement: no Cyrillic literals in src/ except messages/bg.json
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('src');
const CYRILLIC = /[Ѐ-ӿ]/;

const offenders = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = path.join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(entry)) check(p);
  }
}

function check(file) {
  const text = readFileSync(file, 'utf8');
  // Strip comments before searching
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const lines = stripped.split('\n');
  lines.forEach((line, i) => {
    if (CYRILLIC.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
  });
}

walk(SRC);

if (offenders.length) {
  console.error('PUB-05 violation: hardcoded Cyrillic strings in src/. Move to messages/bg.json:');
  offenders.forEach((o) => console.error('  ' + o));
  process.exit(1);
}
console.log('PUB-05 OK: no hardcoded Cyrillic in src/');
