import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/db', () => ({
  db: {
    execute: vi.fn(async () => ({ rows: [] })),
  },
}));

describe('Phase 5 D-05 / D-09 — getNewsletterRecipients SQL shape', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('emits SQL containing DISTINCT ON (user_id) for both topic and blanket CTEs', async () => {
    const { db } = await import('@/db');
    const exec = db.execute as unknown as ReturnType<typeof vi.fn>;
    exec.mockResolvedValue({ rows: [] });

    const { getNewsletterRecipients } = await import('@/lib/newsletter/recipients');
    await getNewsletterRecipients('newsletter_voting');

    expect(exec).toHaveBeenCalledTimes(1);
    const callArg = exec.mock.calls[0]![0] as {
      queryChunks?: Array<{ value?: string[] } | unknown>;
    };
    const text = (callArg.queryChunks ?? [])
      .map((c) => {
        if (c && typeof c === 'object' && 'value' in c && Array.isArray((c as { value: unknown }).value)) {
          return ((c as { value: string[] }).value).join('');
        }
        return '';
      })
      .join('');
    expect(text).toMatch(/DISTINCT ON\s*\(user_id\)/i);
    expect(text).toMatch(/per_user_topic/i);
    expect(text).toMatch(/per_user_blanket/i);
    expect(text).toMatch(/email_verified\s+IS NOT NULL/i);
  });

  it('returns empty array when DB returns no rows', async () => {
    const { db } = await import('@/db');
    const exec = db.execute as unknown as ReturnType<typeof vi.fn>;
    exec.mockResolvedValue({ rows: [] });

    const { getNewsletterRecipients } = await import('@/lib/newsletter/recipients');
    const result = await getNewsletterRecipients('newsletter_general');
    expect(result).toEqual([]);
  });

  it('returns rows when DB returns matches', async () => {
    const { db } = await import('@/db');
    const exec = db.execute as unknown as ReturnType<typeof vi.fn>;
    exec.mockResolvedValue({
      rows: [
        { id: 'u1', email: 'a@example.com', full_name: 'Иван Петров' },
        { id: 'u2', email: 'b@example.com', full_name: 'Мария Иванова' },
      ],
    });

    const { getNewsletterRecipients } = await import('@/lib/newsletter/recipients');
    const result = await getNewsletterRecipients('newsletter_voting');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ id: 'u1', email: 'a@example.com', full_name: 'Иван Петров' });
  });

  it('getCurrentTopicState returns false when no consent row exists', async () => {
    const { db } = await import('@/db');
    const exec = db.execute as unknown as ReturnType<typeof vi.fn>;
    exec.mockResolvedValue({ rows: [] });

    const { getCurrentTopicState } = await import('@/lib/newsletter/recipients');
    const r = await getCurrentTopicState('uid-1', 'newsletter_voting');
    expect(r).toBe(false);
  });

  it('getCurrentTopicState returns true when latest row is granted', async () => {
    const { db } = await import('@/db');
    const exec = db.execute as unknown as ReturnType<typeof vi.fn>;
    exec.mockResolvedValue({ rows: [{ granted: true }] });

    const { getCurrentTopicState } = await import('@/lib/newsletter/recipients');
    const r = await getCurrentTopicState('uid-1', 'newsletter_voting');
    expect(r).toBe(true);
  });

  it('getCurrentTopicState returns false when latest row is revoked', async () => {
    const { db } = await import('@/db');
    const exec = db.execute as unknown as ReturnType<typeof vi.fn>;
    exec.mockResolvedValue({ rows: [{ granted: false }] });

    const { getCurrentTopicState } = await import('@/lib/newsletter/recipients');
    const r = await getCurrentTopicState('uid-1', 'newsletter_general');
    expect(r).toBe(false);
  });
});

describe('Phase 5 D-14 — brevoBlocklist (already shipped by Plan 05-06)', () => {
  const ORIGINAL_FETCH = globalThis.fetch;
  beforeEach(() => {
    process.env.BREVO_API_KEY = 'test-key';
  });

  it('POSTs to /v3/contacts with emailBlacklisted: true + updateEnabled', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as typeof fetch;
    globalThis.fetch = fetchMock;
    const { brevoBlocklist } = await import('@/lib/newsletter/brevo-sync');
    await brevoBlocklist('user@example.com');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/contacts',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(
      (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
    );
    expect(body.email).toBe('user@example.com');
    expect(body.emailBlacklisted).toBe(true);
    expect(body.updateEnabled).toBe(true);
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('throws on non-2xx response', async () => {
    const fetchMock = vi.fn(async () => new Response('error', { status: 500 })) as typeof fetch;
    globalThis.fetch = fetchMock;
    const { brevoBlocklist } = await import('@/lib/newsletter/brevo-sync');
    await expect(brevoBlocklist('user@example.com')).rejects.toThrow(/Brevo blocklist failed: 500/);
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it('brevoUnblock PUTs /v3/contacts/{email} with emailBlacklisted: false', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 })) as typeof fetch;
    globalThis.fetch = fetchMock;
    const { brevoUnblock } = await import('@/lib/newsletter/brevo-sync');
    await brevoUnblock('user@example.com');
    const url = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    const init = (fetchMock as ReturnType<typeof vi.fn>).mock.calls[0]![1]!;
    expect(url).toBe('https://api.brevo.com/v3/contacts/user%40example.com');
    expect(init.method).toBe('PUT');
    const body = JSON.parse(init.body as string);
    expect(body.emailBlacklisted).toBe(false);
    globalThis.fetch = ORIGINAL_FETCH;
  });
});
