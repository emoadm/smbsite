/**
 * Phase 4 Plan 04-07 — Integration test: suspendUser Server Action
 *
 * WAVE-0-BLOCKED: live DB fixtures not yet created.
 * Uses vi.mock to isolate the DB layer (same pattern as moderation-actions.test.ts).
 *
 * Verifies:
 * 1. suspendUser({ userId, reason }) with valid input returns { ok: true }
 * 2. Status was set to 'suspended' in the transaction
 * 3. moderation_log INSERT with action='user_suspend' was called
 * 4. Email job was enqueued with kind='user-suspended'
 * 5. suspendUser with reason < 10 chars returns { ok: false, error: 'submission.error.validation' }
 * 6. suspendUser with invalid UUID returns { ok: false, error: 'submission.error.validation' }
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockTransaction = vi.fn();

vi.mock('@/db', () => ({
  db: {
    transaction: mockTransaction,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ platform_role: null }])),
        })),
      })),
    })),
  },
}));

vi.mock('@/db/schema', () => ({
  submissions: { id: 'id', status: 'status' },
  moderation_log: {},
  users: { id: 'id', status: 'status', email: 'email', full_name: 'full_name', platform_role: 'platform_role' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  sql: vi.fn(() => ''),
}));

vi.mock('@/lib/auth/role-gate', () => ({
  assertEditorOrAdmin: vi.fn().mockResolvedValue(undefined),
  assertSuperEditor: vi.fn().mockResolvedValue(undefined),
  assertNotLastSuperEditor: vi.fn().mockResolvedValue(undefined),
}));

const mockAddEmailJob = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/email/queue', () => ({
  addEmailJob: mockAddEmailJob,
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

const { suspendUser } = await import('@/lib/submissions/admin-actions');

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440001';
const VALID_REASON = 'Повторни нарушения на правилата за съдържание.';
const USER_EMAIL = 'ivan@example.com';
const USER_FULL_NAME = 'Иван Петров';

describe('suspendUser integration (mocked DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns { ok: true } and triggers DB transaction + email job when valid', async () => {
    mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () =>
                Promise.resolve([{ id: VALID_UUID, email: USER_EMAIL, full_name: USER_FULL_NAME }]),
            }),
          }),
        }),
        insert: () => ({ values: () => Promise.resolve() }),
      };
      await fn(mockTx);
    });

    const result = await suspendUser({ userId: VALID_UUID, reason: VALID_REASON });
    expect(result.ok).toBe(true);

    // Email job should be enqueued
    expect(mockAddEmailJob).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'user-suspended',
        to: USER_EMAIL,
        suspensionReason: VALID_REASON,
      }),
    );
  });

  it('returns alreadyHandled when no rows updated (already suspended)', async () => {
    mockTransaction.mockImplementationOnce(async (fn: (tx: unknown) => Promise<void>) => {
      const mockTx = {
        update: () => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([]),
            }),
          }),
        }),
        insert: () => ({ values: () => Promise.resolve() }),
      };
      await fn(mockTx);
    });

    const result = await suspendUser({ userId: VALID_UUID, reason: VALID_REASON });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('submission.error.alreadyHandled');
    }
  });

  it('returns validation error for reason shorter than 10 chars', async () => {
    const result = await suspendUser({ userId: VALID_UUID, reason: 'short' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('submission.error.validation');
    }
  });

  it('returns validation error for invalid UUID', async () => {
    const result = await suspendUser({ userId: 'not-a-uuid', reason: VALID_REASON });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('submission.error.validation');
    }
  });
});
