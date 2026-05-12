/**
 * Phase 4 Plan 04-07 — Unit test: suspended-account layout gate
 *
 * Source-code lock-in:
 * 1. member/layout.tsx redirects to /suspended when status='suspended'.
 * 2. The DB live status check uses eq(users.id, userId).
 * 3. /suspended page exists with correct i18n keys.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('suspended-gate: source-code assertions', () => {
  it("member/layout.tsx contains redirect('/suspended')", () => {
    const src = readFileSync('src/app/(frontend)/member/layout.tsx', 'utf8');
    expect(src).toMatch(/redirect\(['"]\/suspended['"]\)/);
  });

  it('member/layout.tsx queries users.status live from DB', () => {
    const src = readFileSync('src/app/(frontend)/member/layout.tsx', 'utf8');
    expect(src).toMatch(/users\.status/);
    expect(src).toMatch(/eq\(users\.id/);
  });

  it("member/layout.tsx checks status === 'suspended'", () => {
    const src = readFileSync('src/app/(frontend)/member/layout.tsx', 'utf8');
    expect(src).toMatch(/status.*===.*['"]suspended['"]/);
  });

  it('member/layout.tsx imports db and users from correct paths', () => {
    const src = readFileSync('src/app/(frontend)/member/layout.tsx', 'utf8');
    expect(src).toMatch(/from\s+['"]@\/db['"]/);
    expect(src).toMatch(/from\s+['"]@\/db\/schema['"]/);
  });

  it('/suspended page exists', () => {
    const src = readFileSync('src/app/(frontend)/suspended/page.tsx', 'utf8');
    expect(src).toMatch(/SuspendedPage/);
  });

  it('/suspended page uses admin.suspended i18n namespace', () => {
    const src = readFileSync('src/app/(frontend)/suspended/page.tsx', 'utf8');
    expect(src).toMatch(/admin\.suspended/);
    expect(src).toMatch(/getTranslations/);
  });

  it('/suspended page includes logout action', () => {
    const src = readFileSync('src/app/(frontend)/suspended/page.tsx', 'utf8');
    expect(src).toMatch(/signOut/);
    expect(src).toMatch(/logoutAction/);
  });
});
