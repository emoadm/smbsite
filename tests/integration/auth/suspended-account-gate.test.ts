/**
 * Phase 4 Plan 04-07 — Integration test: suspended-account layout gate
 *
 * WAVE-0-BLOCKED: live DB fixtures not yet created.
 * This test uses vi.mock to isolate the DB layer.
 *
 * Verifies:
 * 1. Suspended member → redirect('/suspended') called.
 * 2. Active member → no redirect to /suspended.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockRedirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}));

const mockDbQuery = vi.fn();
vi.mock('@/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => mockDbQuery()),
        })),
      })),
    })),
  },
}));

vi.mock('@/db/schema', () => ({
  users: { id: 'id', status: 'status' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
}));

const { auth } = await import('@/lib/auth');
const mockAuth = auth as ReturnType<typeof vi.fn>;

describe('suspended-account layout gate (mocked DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /suspended when member status is suspended', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com', emailVerified: new Date() },
    });
    mockDbQuery.mockResolvedValue([{ status: 'suspended' }]);

    // Dynamically import layout to avoid top-level module caching
    const { default: MemberLayout } = await import('@/app/(frontend)/member/layout');

    try {
      await MemberLayout({ children: null });
    } catch {
      // redirect() throws in test env
    }

    expect(mockRedirect).toHaveBeenCalledWith('/suspended');
  });

  it('does NOT redirect to /suspended when member status is active', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com', emailVerified: new Date() },
    });
    mockDbQuery.mockResolvedValue([{ status: 'active' }]);

    const { default: MemberLayout } = await import('@/app/(frontend)/member/layout');

    try {
      await MemberLayout({ children: null });
    } catch {
      // ignore errors from undefined children render
    }

    const suspendedCalls = (mockRedirect.mock.calls as string[][]).filter(
      (args) => args[0] === '/suspended',
    );
    expect(suspendedCalls).toHaveLength(0);
  });
});
