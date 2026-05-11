/**
 * Task 2 integration tests — submitProblemReport Server Action.
 *
 * Uses vi.mock to avoid needing a live DB connection (Wave 0 dependency).
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
const valuesMock: ReturnType<typeof vi.fn> = vi.fn(async () => []) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const insertMock: ReturnType<typeof vi.fn> = vi.fn(() => ({ values: valuesMock })) as any;

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

describe('submitProblemReport', () => {
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

  it('returns ok:true for local level with valid oblast BG-16', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user-111', emailVerified: new Date() },
    });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ status: 'active' }]),
        })),
      })),
    });

    const capturedValues: unknown[] = [];
    const capturingValues = vi.fn(async (v: unknown) => { capturedValues.push(v); return []; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: capturingValues } as any);

    const { submitProblemReport } = await import('@/lib/submissions/actions');

    const formData = new FormData();
    formData.set('body', 'а'.repeat(30));
    formData.set('topic', 'taxes');
    formData.set('level', 'local');
    formData.set('oblast', 'BG-16');
    formData.set('cf-turnstile-response', 'valid-token');

    const result = await submitProblemReport(null, formData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.nextHref).toBe('/member/signali');
    }
    // Check the insert values
    expect(capturingValues).toHaveBeenCalledOnce();
    const vals = capturedValues[0] as Record<string, unknown>;
    expect(vals.kind).toBe('problem');
    expect(vals.status).toBe('pending');
    expect(vals.level).toBe('local');
    expect(vals.oblast).toBe('BG-16');
  });

  it('returns ok:true for national level, no oblast → oblast=null in row', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user-222', emailVerified: new Date() },
    });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ status: 'active' }]),
        })),
      })),
    });

    const capturedValues: unknown[] = [];
    const capturingValues = vi.fn(async (v: unknown) => { capturedValues.push(v); return []; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.insert as ReturnType<typeof vi.fn>).mockReturnValue({ values: capturingValues } as any);

    const { submitProblemReport } = await import('@/lib/submissions/actions');

    const formData = new FormData();
    formData.set('body', 'а'.repeat(30));
    formData.set('topic', 'taxes');
    formData.set('level', 'national');
    formData.set('cf-turnstile-response', 'valid-token');

    const result = await submitProblemReport(null, formData);
    expect(result.ok).toBe(true);

    const vals = capturedValues[0] as Record<string, unknown>;
    expect(vals.level).toBe('national');
    expect(vals.oblast).toBeNull();
  });

  it('returns fieldErrors.oblast for local level with no oblast → zero inserts', async () => {
    const { auth } = await import('@/lib/auth');
    const { db } = await import('@/db');

    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user-333', emailVerified: new Date() },
    });
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{ status: 'active' }]),
        })),
      })),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertSpy = vi.fn().mockReturnValue({ values: vi.fn(async () => []) } as any);
    (db.insert as ReturnType<typeof vi.fn>) = insertSpy;

    const { submitProblemReport } = await import('@/lib/submissions/actions');

    const formData = new FormData();
    formData.set('body', 'а'.repeat(30));
    formData.set('topic', 'taxes');
    formData.set('level', 'local');
    // No oblast provided
    formData.set('cf-turnstile-response', 'valid-token');

    const result = await submitProblemReport(null, formData);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors).toHaveProperty('oblast');
    }
    // No INSERT on validation failure
    expect(insertSpy).not.toHaveBeenCalled();
  });
});
