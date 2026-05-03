#!/usr/bin/env node
/**
 * Pre-launch grep gate for D-CoalitionContent-Hero + D-CoalitionContent-Agenda.
 * Fails (exit 1) if `[ТЕКСТ ОТ КОАЛИЦИЯ]` placeholder strings remain in
 * messages/bg.json. Operator runs `pnpm check:placeholders` before flipping
 * the warmup launch DNS. CI optionally runs in a 'launch-readiness' job.
 *
 * UI-SPEC §7.1 + plan 02-02 acceptance criteria.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const PLACEHOLDER = '[ТЕКСТ ОТ КОАЛИЦИЯ]';
const BG_JSON = path.join(ROOT, 'messages/bg.json');

function findPlaceholders(obj, prefix = '') {
  const hits = [];
  if (typeof obj === 'string') {
    if (obj.includes(PLACEHOLDER)) hits.push({ path: prefix, value: obj });
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => hits.push(...findPlaceholders(v, `${prefix}[${i}]`)));
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      hits.push(...findPlaceholders(v, prefix ? `${prefix}.${k}` : k));
    }
  }
  return hits;
}

const messages = JSON.parse(fs.readFileSync(BG_JSON, 'utf8'));
const hits = findPlaceholders(messages);

if (hits.length === 0) {
  console.log(`OK: no '${PLACEHOLDER}' remain in messages/bg.json`);
  process.exit(0);
}

console.error(`FAIL: ${hits.length} unresolved coalition placeholder(s) in messages/bg.json:`);
for (const h of hits) console.error(`  - ${h.path}: ${h.value}`);
console.error('');
console.error('Resolve by replacing placeholders with coalition-delivered copy, then re-run.');
console.error('See STATE.md deferred items: D-CoalitionContent-Hero, D-CoalitionContent-Agenda.');
process.exit(1);
