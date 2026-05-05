import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/app/actions/register.ts', 'utf8');

describe('Phase 5 D-09 — register.ts writes 4 topic rows (single-checkbox-multi-row pattern)', () => {
  it('INSERTs all 4 newsletter_* topic rows', () => {
    expect(SRC).toMatch(/kind:\s*['"]newsletter_general['"]/);
    expect(SRC).toMatch(/kind:\s*['"]newsletter_voting['"]/);
    expect(SRC).toMatch(/kind:\s*['"]newsletter_reports['"]/);
    expect(SRC).toMatch(/kind:\s*['"]newsletter_events['"]/);
  });

  it('all 4 rows use granted: data.consent_newsletter === "on" (D-09 single checkbox)', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    const matches = code.match(/granted:\s*data\.consent_newsletter\s*===\s*['"]on['"]/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it('NO LONGER writes the legacy single { kind: "newsletter" } row for new registrants', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).not.toMatch(/kind:\s*['"]newsletter['"]\s*,/);
  });

  it('preserves Phase 1 privacy_terms, cookies, political_opinion rows', () => {
    expect(SRC).toMatch(/kind:\s*['"]privacy_terms['"]/);
    expect(SRC).toMatch(/kind:\s*['"]cookies['"]/);
    expect(SRC).toMatch(/kind:\s*['"]political_opinion['"]/);
  });

  it('preserves the surrounding tx.insert(consents).values([...]) shape', () => {
    expect(SRC).toMatch(/tx\.insert\(consents\)\.values\(\[/);
  });

  it('register.ts continues to addEmailJob with kind "register-otp"', () => {
    expect(SRC).toMatch(/kind:\s*['"]register-otp['"]/);
  });
});
