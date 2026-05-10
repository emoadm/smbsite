import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('queries.ts owner-isolation invariants', () => {
  const src = readFileSync(join(process.cwd(), 'src/lib/submissions/queries.ts'), 'utf8');

  it('getMyProposals filters by submitter_id', () => {
    expect(src).toMatch(/eq\(submissions\.submitter_id, userId\)/);
  });

  it('proposals query carries kind=proposal', () => {
    expect(src).toMatch(/eq\(submissions\.kind, 'proposal'\)/);
  });

  it('problems query carries kind=problem', () => {
    expect(src).toMatch(/eq\(submissions\.kind, 'problem'\)/);
  });

  it('queries.ts does NOT select submitter_id back into the result', () => {
    // Paranoid invariant: result rows must not echo submitter_id back to the caller.
    // The select() blocks declare exact column whitelists; submitter_id never
    // appears as a SELECT target key — only in the WHERE clause (as a filter value).
    expect(src).not.toMatch(/submitter_id:\s*submissions\.submitter_id/);
  });

  it('getMyProposals is exported as an async function', () => {
    expect(src).toMatch(/export async function getMyProposals/);
  });

  it('getMyProblems is exported as an async function', () => {
    expect(src).toMatch(/export async function getMyProblems/);
  });
});
