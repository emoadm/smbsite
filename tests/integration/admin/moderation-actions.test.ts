/**
 * Phase 4 Plan 04-06 — Integration test for approve + reject Server Actions.
 *
 * WAVE-0-BLOCKED: live DB fixtures (tests/integration/admin/_fixtures.ts) not yet created.
 * This test uses vi.mock to isolate the DB layer following the Phase 5 newsletter pattern
 * (tests/integration/submissions/proposal-create.test.ts).
 *
 * End-to-end verification relies on Task 5 checkpoint: operator approval walkthrough.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---
const mockTxUpdate = vi.fn();
const mockTxInsert = vi.fn();
const mockTxReturning = vi.fn();
const mockUpdateSet = vi.fn(() => ({ where: vi.fn(() => ({ returning: mockTxReturning })) }));
const mockTxUpdateChain = vi.fn(() => ({ set: mockUpdateSet }));
const mockInsertValues = vi.fn(() => Promise.resolve());
const mockInsertChain = vi.fn(() => ({ values: mockInsertValues }));

const mockTransaction = vi.fn();

vi.mock('@/db', () => ({
  db: {
    transaction: mockTransaction,
  },
}));

// Mock Drizzle schema to avoid real column objects being used in eq()/and() calls
vi.mock('@/db/schema', () => ({
  submissions: { id: 'id', status: 'status' },
  moderation_log: {},
  users: { id: 'id', status: 'status' },
}));

// Mock drizzle-orm operators to be no-ops in this mock context
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: unknown) => ({ desc: col })),
  gte: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  lte: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  sql: vi.fn(() => ''),
}));

vi.mock('@/lib/auth/role-gate', () => ({
  assertEditorOrAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/email/queue', () => ({
  addEmailJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('payload', () => ({
  getPayload: vi.fn().mockResolvedValue({
    auth: vi.fn().mockResolvedValue({ user: { id: 'editor-user-id', role: 'editor' } }),
  }),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

vi.mock('@/payload.config', () => ({ default: {} }));

// Import AFTER mocks
const { approveSubmission, rejectSubmission } = await import('@/lib/submissions/admin-actions');

const PENDING_SUBMISSION_ID = '550e8400-e29b-41d4-a716-446655440001';
const ALREADY_APPROVED_ID = '550e8400-e29b-41d4-a716-446655440002';

describe('Phase 4 moderation-actions integration (mocked DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('approveSubmission', () => {
    it('returns { ok: true } when submission is pending and transaction succeeds', async () => {
      // Set up transaction mock: first update returns a row (pending → approved)
      mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([{ id: PENDING_SUBMISSION_ID }]),
              }),
            }),
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        await fn(mockTx);
      });

      const result = await approveSubmission({ submissionId: PENDING_SUBMISSION_ID });
      expect(result.ok).toBe(true);
    });

    it('returns { ok: false, error: "submission.error.alreadyHandled" } when no rows updated', async () => {
      // update.returning returns empty array → alreadyHandled
      mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([]),
              }),
            }),
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        await fn(mockTx);
      });

      const result = await approveSubmission({ submissionId: ALREADY_APPROVED_ID });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('submission.error.alreadyHandled');
      }
    });

    it('returns { ok: false, error: "submission.error.validation" } for non-UUID', async () => {
      const result = await approveSubmission({ submissionId: 'not-a-uuid' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('submission.error.validation');
      }
    });
  });

  describe('rejectSubmission', () => {
    it('returns { ok: false, error: "submission.error.validation" } for empty note', async () => {
      const result = await rejectSubmission({ submissionId: PENDING_SUBMISSION_ID, note: '' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('submission.error.validation');
      }
    });

    it('returns { ok: false, error: "submission.error.validation" } for note shorter than 5 chars', async () => {
      const result = await rejectSubmission({ submissionId: PENDING_SUBMISSION_ID, note: 'abc' });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('submission.error.validation');
      }
    });

    it('returns { ok: true } when submission is pending and note is valid', async () => {
      mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([{ id: PENDING_SUBMISSION_ID }]),
              }),
            }),
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        await fn(mockTx);
      });

      const result = await rejectSubmission({
        submissionId: PENDING_SUBMISSION_ID,
        note: 'Не съответства на насоките за съдържание.',
      });
      expect(result.ok).toBe(true);
    });

    it('returns alreadyHandled when no rows updated', async () => {
      mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          update: () => ({
            set: () => ({
              where: () => ({
                returning: () => Promise.resolve([]),
              }),
            }),
          }),
          insert: () => ({
            values: () => Promise.resolve(),
          }),
        };
        await fn(mockTx);
      });

      const result = await rejectSubmission({
        submissionId: ALREADY_APPROVED_ID,
        note: 'Вече обработено предложение.',
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('submission.error.alreadyHandled');
      }
    });
  });
});
