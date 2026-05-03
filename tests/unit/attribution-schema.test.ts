import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('ATTR-02 / GDPR-09 / D-19 — attribution_events schema invariants', () => {
  it('attribution_events schema contains no inet/raw_ip/ip_address column (D-19 / GDPR-09)', () => {
    const src = readFileSync('src/db/schema/attribution.ts', 'utf8');
    // Strip comments before checking (legitimate documentation may mention these tokens
    // when explaining WHY they are forbidden — see file header). We only forbid them
    // appearing in actual code (column declarations).
    const codeOnly = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(codeOnly).not.toMatch(/\binet\b/);
    expect(codeOnly).not.toMatch(/\braw_ip\b/);
    expect(codeOnly).not.toMatch(/\bip_address\b/);
  });

  it('attribution_events declares onDelete cascade FK to users (D-07 + GDPR-05 forward-prep)', () => {
    const src = readFileSync('src/db/schema/attribution.ts', 'utf8');
    expect(src).toMatch(/references\(\(\)\s*=>\s*users\.id,\s*\{\s*onDelete:\s*'cascade'\s*\}\)/);
  });

  it('attribution_events declares attr_sid unique constraint (D-04 one-row-per-session)', () => {
    const src = readFileSync('src/db/schema/attribution.ts', 'utf8');
    expect(src).toMatch(/attr_sid:\s*text\('attr_sid'\)\.notNull\(\)\.unique\(\)/);
  });

  it('attribution_events declares first_* and last_* column pairs (D-06 split-attribution)', () => {
    const src = readFileSync('src/db/schema/attribution.ts', 'utf8');
    for (const pair of [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'referer',
      'oblast',
      'country',
      'qr_flag',
      'landing_path',
      'seen_at',
    ]) {
      expect(src).toMatch(new RegExp(`first_${pair}`));
      expect(src).toMatch(new RegExp(`last_${pair}`));
    }
  });

  it('users table has self_reported_source + self_reported_other text columns (D-11 / ATTR-06)', () => {
    const src = readFileSync('src/db/schema/auth.ts', 'utf8');
    expect(src).toMatch(/self_reported_source:\s*text\('self_reported_source'\)/);
    expect(src).toMatch(/self_reported_other:\s*text\('self_reported_other'\)/);
    // Both must be nullable (no .notNull()) because pre-Phase-2.1 rows have no value.
    expect(src).not.toMatch(/self_reported_source.*\.notNull\(\)/);
    expect(src).not.toMatch(/self_reported_other.*\.notNull\(\)/);
  });

  it('schema barrel exports attribution module', () => {
    const src = readFileSync('src/db/schema/index.ts', 'utf8');
    expect(src).toMatch(/export \* from '\.\/attribution'/);
  });
});
