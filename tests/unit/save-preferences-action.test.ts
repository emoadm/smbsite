import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/app/actions/save-preferences.ts', 'utf8');

describe('Phase 5 D-07 / D-13 / NOTIF-01 — save-preferences Server Action', () => {
  it("declares 'use server'", () => {
    expect(SRC.split('\n').slice(0, 3).join('\n')).toMatch(/['"]use server['"]/);
  });

  it('exports saveTopicPreference and savePreferredChannel', () => {
    expect(SRC).toMatch(/export\s+async\s+function\s+saveTopicPreference/);
    expect(SRC).toMatch(/export\s+async\s+function\s+savePreferredChannel/);
  });

  it('uses auth() (member-side, NOT assertEditorOrAdmin)', () => {
    expect(SRC).toMatch(/from\s+['"]@\/lib\/auth['"]/);
    expect(SRC).toMatch(/await\s+auth\(\)/);
    expect(SRC).not.toMatch(/assertEditorOrAdmin/);
  });

  it('saveTopicPreference INSERTs into consents (append-only D-13)', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).toMatch(/db\.insert\(consents\)\.values\(/);
  });

  it('NEVER UPDATEs or DELETEs consents (D-13 lock)', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).not.toMatch(/db\.update\(consents\)/);
    expect(code).not.toMatch(/db\.delete\(consents\)/);
  });

  it('savePreferredChannel UPDATEs users (NOT consents — preferred_channel is on users)', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    // Allow multi-line method chaining: `db\n  .update(users)`.
    expect(code).toMatch(/db\s*\.\s*update\(users\)/s);
    expect(code).toMatch(/preferred_channel/);
  });

  it('TopicEnum Zod schema includes all 4 newsletter_* topics and ONLY those', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).toMatch(/'newsletter_general'/);
    expect(code).toMatch(/'newsletter_voting'/);
    expect(code).toMatch(/'newsletter_reports'/);
    expect(code).toMatch(/'newsletter_events'/);
    expect(code).not.toMatch(/z\.literal\(['"]newsletter['"]\)/);
  });

  it('uses POLICY_VERSION = "2026-04-29" (matches register.ts)', () => {
    expect(SRC).toMatch(/POLICY_VERSION\s*=\s*['"]2026-04-29['"]/);
  });

  it('logs structured object using user_id (NOT email — D-24)', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    const logCalls = code.match(/logger\.(info|warn|error)\([^)]*\)/g) ?? [];
    for (const call of logCalls) {
      expect(call).not.toMatch(/\bemail:/);
    }
  });
});
