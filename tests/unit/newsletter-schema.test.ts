import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { CONSENT_KINDS } from '@/db/schema/consents';

describe('Phase 5 D-08 / D-09 — CONSENT_KINDS extension', () => {
  it('contains all 4 new newsletter topic values', () => {
    expect(CONSENT_KINDS).toContain('newsletter_general');
    expect(CONSENT_KINDS).toContain('newsletter_voting');
    expect(CONSENT_KINDS).toContain('newsletter_reports');
    expect(CONSENT_KINDS).toContain('newsletter_events');
  });

  it('preserves legacy "newsletter" for D-09 backward compat', () => {
    expect(CONSENT_KINDS).toContain('newsletter');
  });

  it('preserves all Phase 1 values (privacy_terms, cookies, political_opinion)', () => {
    expect(CONSENT_KINDS).toContain('privacy_terms');
    expect(CONSENT_KINDS).toContain('cookies');
    expect(CONSENT_KINDS).toContain('political_opinion');
  });

  it('source declares all kinds verbatim (greppable lock)', () => {
    const src = readFileSync('src/db/schema/consents.ts', 'utf8');
    for (const k of [
      'privacy_terms', 'cookies', 'newsletter',
      'newsletter_general', 'newsletter_voting',
      'newsletter_reports', 'newsletter_events',
      'political_opinion',
    ]) {
      expect(src).toContain(`'${k}'`);
    }
  });
});

describe('Phase 5 D-07 — users.preferred_channel column', () => {
  it('schema declares preferred_channel as nullable text', () => {
    const src = readFileSync('src/db/schema/auth.ts', 'utf8');
    expect(src).toMatch(/preferred_channel:\s*text\(['"]preferred_channel['"]\)/);
    // Nullable — must NOT have .notNull() chained on the same line OR within the immediate column block
    const lines = src.split('\n');
    const idx = lines.findIndex((l) => l.includes('preferred_channel'));
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(lines[idx]).not.toMatch(/\.notNull\(\)/);
  });

  it('a drizzle migration file references preferred_channel (db:generate was run)', () => {
    // drizzle.config.ts outputs to src/db/migrations/ (not src/migrations/)
    const files = readdirSync('src/db/migrations').filter((f) =>
      f.endsWith('.sql') || f.endsWith('.ts'),
    );
    let found = false;
    for (const f of files) {
      const content = readFileSync(`src/db/migrations/${f}`, 'utf8');
      if (content.includes('preferred_channel')) {
        found = true;
        break;
      }
    }
    expect(found, 'no migration file mentions preferred_channel — did you run pnpm db:generate?').toBe(true);
  });
});
