import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(process.cwd(), 'src/lib/submissions/public-queries.ts'), 'utf8');

describe('public-queries.ts D-C1 column whitelist invariants', () => {
  it('getApprovedProposals filters kind=proposal AND status=approved', () => {
    expect(src).toMatch(/eq\(submissions\.kind, 'proposal'\)/);
    expect(src).toMatch(/eq\(submissions\.status, 'approved'\)/);
  });
  it('public select keys do NOT include submitter_id, full_name, email, sector, role', () => {
    // Source-level grep: these columns must not appear in the public file at all
    expect(src).not.toMatch(/submissions\.submitter_id/);
    expect(src).not.toMatch(/full_name/);
    expect(src).not.toMatch(/users\.email/);
    expect(src).not.toMatch(/users\.sector/);
    expect(src).not.toMatch(/users\.role/);
  });
  it('approved_at is the ORDER BY key (not created_at) — UI-SPEC §S1', () => {
    expect(src).toMatch(/desc\(submissions\.approved_at\)/);
  });
});
