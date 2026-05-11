/**
 * Task 2 integration tests — submitProposal Server Action.
 *
 * Uses vi.mock to avoid needing a live DB connection (Wave 0 dependency).
 * Follows the newsletter-recipient-query.test.ts mock pattern established in Phase 5.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mocks ----

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/turnstile', () => ({
  verifyTurnstile: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/rate-limit', () => ({
  checkSubmissionPerUser: vi.fn(async () => ({ success: true, remaining: 4, reset: 0 })),
  checkSubmissionPerIp: vi.fn(async () => ({ success: true, remaining: 9, reset: 0 })),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: vi.fn(() => null),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const insertMock: ReturnType<typeof vi.fn> = vi.fn() as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const valuesMock: ReturnType<typeof vi.fn> = vi.fn(async () => []) as any;
insertMock.mockReturnValue({ values: valuesMock });

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ status: 'active' }]),
        })),
      })),
    })),
    insert: insertMock,
  },
}));

// ---- tests ----

const mockHeaders = { get: vi.fn(() => null) };

describe('submitProposal', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    insertMock.mockReturnValue({ values: valuesMock });
    // Restore headers mock after clearAllMocks
    const { headers } = await import('next/headers');
    (headers as ReturnType<typeof vi.fn>).mockResolvedValue(mockHeaders);
    // Restore default rate-limit behavior
    const rl = await import('@/lib/rate-limit');
    (rl.checkSubmissionPerUser as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, remaining: 4, reset: 0 });
    (rl.checkSubmissionPerIp as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, remaining: 9, reset: 0 });
    // Restore default turnstile behavior
    const { verifyTurnstile } = await import('@/lib/turnstile');
    (verifyTurnstile as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  });

  it('returns ok:true and nextHref for a valid active member', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: {
        id: 'user-123',
        emailVerified: new Date(),
      },
    });

    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ status: 'active' }]),
        })),
      })),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: vi.fn(async () => []) } as any);

    const { submitProposal } = await import('@/lib/submissions/actions');

    const formData = new FormData();
    formData.set('title', 'Намаляване на ДДС за малки предприятия');
    formData.set('body', 'а'.repeat(50));
    formData.set('topic', 'taxes');
    formData.set('cf-turnstile-response', 'valid-token');

    const result = await submitProposal(null, formData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextHref).toBe('/member/predlozheniya');
    }
  });

  it('returns suspended error for a suspended account (zero DB inserts)', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: {
        id: 'user-456',
        emailVerified: new Date(),
      },
    });

    // DB returns suspended status
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ status: 'suspended' }]),
        })),
      })),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertSpy = vi.fn().mockReturnValue({ values: vi.fn(async () => []) } as any);
    (db.insert as ReturnType<typeof vi.fn>) = insertSpy;

    const { submitProposal } = await import('@/lib/submissions/actions');

    const formData = new FormData();
    formData.set('title', 'Намаляване на ДДС');
    formData.set('body', 'а'.repeat(50));
    formData.set('topic', 'taxes');
    formData.set('cf-turnstile-response', 'valid-token');

    const result = await submitProposal(null, formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('submission.gate.suspended');
    }
    // No INSERT should have happened
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('returns captchaFailed when Turnstile fails', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');
    const { verifyTurnstile } = await import('@/lib/turnstile');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user-789', emailVerified: new Date() },
    });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ status: 'active' }]),
        })),
      })),
    });
    (verifyTurnstile as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });

    const { submitProposal } = await import('@/lib/submissions/actions');

    const formData = new FormData();
    formData.set('title', 'Намаляване на ДДС');
    formData.set('body', 'а'.repeat(50));
    formData.set('topic', 'taxes');
    formData.set('cf-turnstile-response', 'bad-token');

    const result = await submitProposal(null, formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('submission.error.captchaFailed');
    }
  });
});
