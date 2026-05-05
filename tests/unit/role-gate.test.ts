import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Phase 5 D-25 — shared assertEditorOrAdmin role gate', () => {
  it('uses singular `role` field, never plural `roles` (Phase 02.1 lineage)', () => {
    const src = readFileSync('src/lib/auth/role-gate.ts', 'utf8');
    expect(src).toMatch(/role\?:\s*string|\.role\s*\?\?\s*''/);
    expect(src).not.toMatch(/\.roles\b/);
    expect(src).not.toMatch(/roles\?:\s*string\[\]/);
  });

  it('exports assertEditorOrAdmin', () => {
    const src = readFileSync('src/lib/auth/role-gate.ts', 'utf8');
    expect(src).toMatch(/export\s+async\s+function\s+assertEditorOrAdmin/);
  });

  it('attribution actions.ts imports from the shared module (no duplicate definition)', () => {
    const src = readFileSync(
      'src/app/(payload)/admin/views/attribution/actions.ts',
      'utf8',
    );
    expect(src).toMatch(/from\s+['"]@\/lib\/auth\/role-gate['"]/);
    // No private definition allowed — exactly ONE assertEditorOrAdmin in the file (the import binding)
    const matches = src.match(/assertEditorOrAdmin/g) ?? [];
    // 1 import + N call sites; the OLD private `async function assertEditorOrAdmin` declaration must be GONE
    expect(src).not.toMatch(/async\s+function\s+assertEditorOrAdmin/);
  });
});
