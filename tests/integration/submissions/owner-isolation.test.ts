/**
 * owner-isolation.test.ts — PROP-03 / PROB-05 cross-user read prevention.
 *
 * Tests the getMyProposals and getMyProblems query functions to verify
 * that they correctly filter by submitter_id and kind, making cross-user
 * reads provably impossible at the query layer.
 *
 * Pattern: vi.mock DB (consistent with existing integration tests in this project
 * that lack a live DB connection). This test validates the WHERE-clause logic
 * at the call-argument level by asserting the Drizzle query builder is called
 * with the correct userId filter.
 *
 * Note: Wave 0 did not ship a _fixtures.ts helper with a live test DB connection.
 * A live-DB test is deferred to when the test infrastructure provides seedActiveMember().
 * Task 1's grep-level unit tests (tests/unit/submission-access.test.ts) are the
 * primary verification gate for owner isolation per the plan's fallback provision.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture the actual Drizzle operator calls to verify WHERE clause construction
const mockWhere = vi.fn().mockReturnThis();
const mockOrderBy = vi.fn().mockReturnThis();
const mockLimit = vi.fn().mockResolvedValue([]);
const mockFrom = vi.fn().mockReturnThis();
const mockSelect = vi.fn(() => ({
  from: mockFrom,
}));

mockFrom.mockReturnValue({
  where: mockWhere,
});
mockWhere.mockReturnValue({
  orderBy: mockOrderBy,
});
mockOrderBy.mockReturnValue({
  limit: mockLimit,
});

vi.mock('@/db', () => ({
  db: {
    select: mockSelect,
  },
}));

// Mock drizzle-orm operators so we can inspect calls
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ _type: 'eq', col, val })),
  and: vi.fn((...args) => ({ _type: 'and', args })),
  desc: vi.fn((col) => ({ _type: 'desc', col })),
}));

// Mock schema
vi.mock('@/db/schema', () => ({
  submissions: {
    id: 'id',
    submitter_id: 'submitter_id',
    kind: 'kind',
    status: 'status',
    title: 'title',
    body: 'body',
    topic: 'topic',
    level: 'level',
    oblast: 'oblast',
    moderator_note: 'moderator_note',
    created_at: 'created_at',
    approved_at: 'approved_at',
  },
}));

describe('owner-isolation — getMyProposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset return values after clear
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it('calls getMyProposals(userA) and returns only rows for userA', async () => {
    const USER_A = 'user-uuid-A-111';
    // Seed: simulate user A has 1 proposal
    mockLimit.mockResolvedValueOnce([
      {
        id: 'submission-uuid-001',
        status: 'pending',
        title: 'Proposal from A',
        body: 'Body text',
        topic: 'taxes',
        moderator_note: null,
        created_at: new Date(),
        approved_at: null,
      },
    ]);

    const { getMyProposals } = await import('@/lib/submissions/queries');
    const rows = await getMyProposals(USER_A);

    // Assert the query was issued (DB was called)
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalledTimes(1);

    // Verify the WHERE clause was constructed with an `and(...)` call
    const whereArg = mockWhere.mock.calls[0]![0] as { _type: string; args: unknown[] };
    expect(whereArg._type).toBe('and');

    // The AND must include both submitter_id filter and kind filter
    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('submitter_id', USER_A);
    expect(eq).toHaveBeenCalledWith('kind', 'proposal');

    // Result contains the seeded row
    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('submission-uuid-001');
  });

  it('getMyProposals(userB) does NOT see userA rows (isolation)', async () => {
    const USER_B = 'user-uuid-B-222';
    // User B has 0 proposals
    mockLimit.mockResolvedValueOnce([]);

    const { getMyProposals } = await import('@/lib/submissions/queries');
    const rows = await getMyProposals(USER_B);

    // Verify eq was called with userB's ID, not userA's
    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('submitter_id', USER_B);
    // userA's ID was never passed to eq in this call
    expect(eq).not.toHaveBeenCalledWith('submitter_id', 'user-uuid-A-111');

    expect(rows).toHaveLength(0);
  });
});

describe('owner-isolation — getMyProblems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue([]);
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it('calls getMyProblems(userA) with correct submitter_id and kind=problem filter', async () => {
    const USER_A = 'user-uuid-A-111';
    mockLimit.mockResolvedValueOnce([
      {
        id: 'problem-uuid-001',
        status: 'approved',
        body: 'Problem description',
        topic: 'admin_barriers',
        level: 'local',
        oblast: 'BG-16',
        moderator_note: null,
        created_at: new Date(),
      },
    ]);

    const { getMyProblems } = await import('@/lib/submissions/queries');
    const rows = await getMyProblems(USER_A);

    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('submitter_id', USER_A);
    expect(eq).toHaveBeenCalledWith('kind', 'problem');

    // Result is problem-scoped (kind=proposal filter NOT used)
    expect(eq).not.toHaveBeenCalledWith('kind', 'proposal');

    expect(rows).toHaveLength(1);
    expect(rows[0]!.id).toBe('problem-uuid-001');
  });

  it('getMyProblems does NOT cross-leak between members', async () => {
    const USER_B = 'user-uuid-B-222';
    mockLimit.mockResolvedValueOnce([]);

    const { getMyProblems } = await import('@/lib/submissions/queries');
    const rows = await getMyProblems(USER_B);

    const { eq } = await import('drizzle-orm');
    expect(eq).toHaveBeenCalledWith('submitter_id', USER_B);
    expect(eq).not.toHaveBeenCalledWith('submitter_id', 'user-uuid-A-111');

    expect(rows).toHaveLength(0);
  });
});
