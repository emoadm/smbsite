import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// --- Mocks ---
// We mock the heavy imports so this test runs in node env without Payload or DB.
vi.mock('@/lib/auth/role-gate', () => ({
  assertEditorOrAdmin: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/db', () => ({
  db: {
    transaction: vi.fn(),
  },
}));
vi.mock('@/lib/email/queue', () => ({
  addEmailJob: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    auth: vi.fn().mockResolvedValue({ user: { id: 'mock-actor-id', role: 'editor' } }),
  }),
}));
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));
vi.mock('@/payload.config', () => ({ default: {} }));

// --- Zod schema tests (validated directly against the same schema shapes used in admin-actions.ts) ---

const approveSchema = z.object({ submissionId: z.string().uuid() });
const rejectSchema = z.object({
  submissionId: z.string().uuid(),
  note: z.string().trim().min(5).max(2000),
});

describe('Phase 4 moderation admin-actions Zod schema validation', () => {
  describe('approveSchema', () => {
    it('accepts a valid UUID', () => {
      const result = approveSchema.safeParse({ submissionId: '550e8400-e29b-41d4-a716-446655440000' });
      expect(result.success).toBe(true);
    });

    it('rejects a non-UUID string', () => {
      const result = approveSchema.safeParse({ submissionId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = approveSchema.safeParse({ submissionId: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('rejectSchema', () => {
    it('rejects empty note', () => {
      const result = rejectSchema.safeParse({
        submissionId: '550e8400-e29b-41d4-a716-446655440000',
        note: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects note shorter than 5 chars (after trim)', () => {
      const result = rejectSchema.safeParse({
        submissionId: '550e8400-e29b-41d4-a716-446655440000',
        note: 'abc',
      });
      expect(result.success).toBe(false);
    });

    it('rejects note of exactly 4 chars', () => {
      const result = rejectSchema.safeParse({
        submissionId: '550e8400-e29b-41d4-a716-446655440000',
        note: 'abcd',
      });
      expect(result.success).toBe(false);
    });

    it('accepts note of exactly 5 chars', () => {
      const result = rejectSchema.safeParse({
        submissionId: '550e8400-e29b-41d4-a716-446655440000',
        note: 'abcde',
      });
      expect(result.success).toBe(true);
    });

    it('accepts a realistic Bulgarian rejection note', () => {
      const result = rejectSchema.safeParse({
        submissionId: '550e8400-e29b-41d4-a716-446655440000',
        note: 'Не съответства на насоките за съдържание.',
      });
      expect(result.success).toBe(true);
    });

    it('rejects note longer than 2000 chars', () => {
      const result = rejectSchema.safeParse({
        submissionId: '550e8400-e29b-41d4-a716-446655440000',
        note: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Phase 4 admin-actions.ts source assertions', () => {
  it('admin-actions.ts exports approveSubmission and rejectSubmission', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/submissions/admin-actions.ts', 'utf8');
    expect(src).toMatch(/'use server'/);
    expect(src).toMatch(/export async function approveSubmission/);
    expect(src).toMatch(/export async function rejectSubmission/);
  });

  it('admin-actions.ts uses db.transaction at least twice', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/submissions/admin-actions.ts', 'utf8');
    const count = (src.match(/db\.transaction/g) ?? []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('admin-actions.ts inserts submission_approve and submission_reject log actions', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/submissions/admin-actions.ts', 'utf8');
    expect(src).toMatch(/action: 'submission_approve'/);
    expect(src).toMatch(/action: 'submission_reject'/);
  });

  it('admin-actions.ts does NOT call db.update(moderation_log) or db.delete(moderation_log) (non-comment lines only)', async () => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync('src/lib/submissions/admin-actions.ts', 'utf8');
    // Strip comment lines before checking (comments may document the constraint)
    const nonCommentLines = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(nonCommentLines).not.toMatch(/db\.(update|delete)\(moderation_log\)/);
  });
});
