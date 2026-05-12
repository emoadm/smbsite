import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Phase 4 EDIT-02 — Ideas collection invariants', () => {
  it("Ideas.ts has slug: 'ideas'", () => {
    const src = readFileSync('src/collections/Ideas.ts', 'utf8');
    expect(src).toMatch(/slug: 'ideas'/);
  });

  it('Ideas.ts uses isEditorOrAdmin access guard', () => {
    const src = readFileSync('src/collections/Ideas.ts', 'utf8');
    // EDIT-07 fix: role-gate accepts admin, editor, super_editor.
    expect(src).toMatch(/\['admin', 'editor', 'super_editor'\]\.includes\(role\)/);
  });

  it('Ideas.ts defines all five topic option values', () => {
    const src = readFileSync('src/collections/Ideas.ts', 'utf8');
    expect(src).toMatch(/'economy'/);
    expect(src).toMatch(/'labor'/);
    expect(src).toMatch(/'taxes'/);
    expect(src).toMatch(/'regulation'/);
    expect(src).toMatch(/'other'/);
  });

  it("Ideas.ts defines all three status option values: draft, approved, rejected", () => {
    const src = readFileSync('src/collections/Ideas.ts', 'utf8');
    expect(src).toMatch(/'draft'/);
    expect(src).toMatch(/'approved'/);
    expect(src).toMatch(/'rejected'/);
  });

  it('Ideas.ts does NOT include voting fields (Phase 3 layers these later — D-A1)', () => {
    const src = readFileSync('src/collections/Ideas.ts', 'utf8');
    // Strip comments to avoid false positives from documentation mentions
    const codeOnly = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');
    expect(codeOnly).not.toMatch(/'votes'/);
    expect(codeOnly).not.toMatch(/'votable'/);
    expect(codeOnly).not.toMatch(/'votes_open_at'/);
  });

  it("Ideas.ts declares moderatorNote field with isEditorOrAdmin access", () => {
    const src = readFileSync('src/collections/Ideas.ts', 'utf8');
    expect(src).toMatch(/moderatorNote/);
    expect(src).toMatch(/read:\s*isEditorOrAdmin/);
  });

  it('payload.config.ts imports Ideas', () => {
    const src = readFileSync('src/payload.config.ts', 'utf8');
    expect(src).toMatch(/import\s*\{\s*Ideas\s*\}/);
  });

  it('payload.config.ts collections array is [Users, Newsletters, Pages, Ideas]', () => {
    const src = readFileSync('src/payload.config.ts', 'utf8');
    expect(src).toMatch(/collections:\s*\[Users,\s*Newsletters,\s*Pages,\s*Ideas\]/);
  });

  it('0003_phase04_submissions.sql contains CREATE TABLE "ideas"', () => {
    const src = readFileSync('src/db/migrations/0003_phase04_submissions.sql', 'utf8');
    expect(src).toMatch(/CREATE TABLE "ideas"/);
  });

  it('0003_phase04_submissions.sql contains ideas_status_idx', () => {
    const src = readFileSync('src/db/migrations/0003_phase04_submissions.sql', 'utf8');
    expect(src).toMatch(/ideas_status_idx/);
  });

  it('0003_phase04_submissions.sql does NOT contain voting columns (D-A1)', () => {
    const src = readFileSync('src/db/migrations/0003_phase04_submissions.sql', 'utf8');
    // Strip comment lines before checking
    const sqlOnly = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('--'))
      .join('\n');
    expect(sqlOnly).not.toMatch(/votes/);
    expect(sqlOnly).not.toMatch(/votable/);
    expect(sqlOnly).not.toMatch(/votes_open_at/);
  });
});
