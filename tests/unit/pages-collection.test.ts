import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Phase 4 EDIT-03 — Pages collection invariants', () => {
  it("Pages.ts has slug: 'pages'", () => {
    const src = readFileSync('src/collections/Pages.ts', 'utf8');
    expect(src).toMatch(/slug: 'pages'/);
  });

  it('Pages.ts uses isEditorOrAdmin access guard', () => {
    const src = readFileSync('src/collections/Pages.ts', 'utf8');
    // EDIT-07 fix: role-gate accepts admin, editor, super_editor.
    expect(src).toMatch(/\['admin', 'editor', 'super_editor'\]\.includes\(role\)/);
  });

  it("Pages.ts defines 'draft' and 'published' status option values", () => {
    const src = readFileSync('src/collections/Pages.ts', 'utf8');
    expect(src).toMatch(/'draft'/);
    expect(src).toMatch(/'published'/);
  });

  it('Pages.ts declares slug field with unique: true', () => {
    const src = readFileSync('src/collections/Pages.ts', 'utf8');
    expect(src).toMatch(/unique:\s*true/);
  });

  it('payload.config.ts imports Pages', () => {
    const src = readFileSync('src/payload.config.ts', 'utf8');
    expect(src).toMatch(/import\s*\{\s*Pages\s*\}/);
  });

  it('payload.config.ts collections array includes Pages (with optional Ideas)', () => {
    const src = readFileSync('src/payload.config.ts', 'utf8');
    expect(src).toMatch(/collections:\s*\[Users,\s*Newsletters,\s*Pages(,\s*Ideas)?\]/);
  });
});
