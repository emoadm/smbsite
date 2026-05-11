/**
 * Phase 4 Plan 04-07 — Unit test: assertNotLastSuperEditor guard
 *
 * Tests:
 * 1. Source-code lock-in: role-gate.ts contains the guard and count <= 1 check.
 * 2. Source-code lock-in: admin-actions.ts exports all four new actions.
 * 3. Source-code assertions on moderation_log append-only invariant (Pitfall 1 lock-in).
 * 4. revokeEditor calls assertNotLastSuperEditor when target is super_editor.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('super-editor-guard: source-code assertions', () => {
  it('assertNotLastSuperEditor exists in role-gate.ts', () => {
    const src = readFileSync('src/lib/auth/role-gate.ts', 'utf8');
    expect(src).toMatch(/export\s+async\s+function\s+assertNotLastSuperEditor/);
  });

  it('role-gate.ts contains count <= 1 guard logic', () => {
    const src = readFileSync('src/lib/auth/role-gate.ts', 'utf8');
    expect(src).toMatch(/count.*<=\s*1|<= 1.*count/);
    expect(src).toMatch(/Cannot demote the last super_editor/);
  });

  it('admin-actions.ts exports all four new actions', () => {
    const src = readFileSync('src/lib/submissions/admin-actions.ts', 'utf8');
    expect(src).toMatch(/export\s+async\s+function\s+suspendUser/);
    expect(src).toMatch(/export\s+async\s+function\s+unsuspendUser/);
    expect(src).toMatch(/export\s+async\s+function\s+grantEditor/);
    expect(src).toMatch(/export\s+async\s+function\s+revokeEditor/);
  });

  it('admin-actions.ts contains the four moderation_log action strings', () => {
    const src = readFileSync('src/lib/submissions/admin-actions.ts', 'utf8');
    expect(src).toMatch(/action:\s*['"]user_suspend['"]/);
    expect(src).toMatch(/action:\s*['"]user_unsuspend['"]/);
    expect(src).toMatch(/action:\s*['"]editor_grant['"]/);
    expect(src).toMatch(/action:\s*['"]editor_revoke['"]/);
  });

  it('admin-actions.ts never updates or deletes from moderation_log (Pitfall 1 lock-in)', () => {
    const src = readFileSync('src/lib/submissions/admin-actions.ts', 'utf8');
    // Strip single-line comments
    const strippedComments = src.replace(/\/\/[^\n]*/g, '');
    expect(strippedComments).not.toMatch(/db\.update\s*\(\s*moderation_log/);
    expect(strippedComments).not.toMatch(/db\.delete\s*\(\s*moderation_log/);
    expect(strippedComments).not.toMatch(/tx\.update\s*\(\s*moderation_log/);
    expect(strippedComments).not.toMatch(/tx\.delete\s*\(\s*moderation_log/);
  });

  it('revokeEditor in admin-actions.ts calls assertNotLastSuperEditor when target is super_editor', () => {
    const src = readFileSync('src/lib/submissions/admin-actions.ts', 'utf8');
    expect(src).toMatch(/assertNotLastSuperEditor/);
    expect(src).toMatch(/platform_role.*===.*['"]super_editor['"]/);
  });
});
