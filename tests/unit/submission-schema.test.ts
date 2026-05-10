import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Phase 4 D-A1 — submissions + moderation_log schema invariants', () => {
  it('submissions.ts declares pgTable submissions', () => {
    const src = readFileSync('src/db/schema/submissions.ts', 'utf8');
    expect(src).toMatch(/pgTable\('submissions',/);
  });

  it('submissions.ts declares pgTable moderation_log', () => {
    const src = readFileSync('src/db/schema/submissions.ts', 'utf8');
    expect(src).toMatch(/pgTable\('moderation_log',/);
  });

  it('submissions.submitter_id references users.id with onDelete restrict', () => {
    const src = readFileSync('src/db/schema/submissions.ts', 'utf8');
    expect(src).toMatch(/references\(\(\)\s*=>\s*users\.id,\s*\{\s*onDelete:\s*'restrict'\s*\}\)/);
  });

  it('submissions declares submissions_status_kind_idx composite index', () => {
    const src = readFileSync('src/db/schema/submissions.ts', 'utf8');
    expect(src).toMatch(/submissions_status_kind_idx/);
  });

  it('submissions.ts does NOT use pgEnum (project anti-pattern)', () => {
    const src = readFileSync('src/db/schema/submissions.ts', 'utf8');
    // Strip comment lines before checking (comments may document the prohibition)
    const codeOnly = src
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(codeOnly).not.toMatch(/pgEnum/);
  });

  it('submissions uses defaultRandom() for uuid PKs and defaultNow() for timestamps', () => {
    const src = readFileSync('src/db/schema/submissions.ts', 'utf8');
    expect(src).toMatch(/defaultRandom\(\)/);
    expect(src).toMatch(/defaultNow\(\)/);
  });

  it('auth.ts gains status and platform_role columns (D-A1 + D-A2)', () => {
    const src = readFileSync('src/db/schema/auth.ts', 'utf8');
    expect(src).toMatch(/status:\s*text\('status'\)\.notNull\(\)\.default\('active'\)/);
    expect(src).toMatch(/platform_role:\s*text\('platform_role'\)/);
  });

  it('schema barrel re-exports submissions', () => {
    const src = readFileSync('src/db/schema/index.ts', 'utf8');
    expect(src).toMatch(/export \* from '\.\/submissions'/);
  });
});
