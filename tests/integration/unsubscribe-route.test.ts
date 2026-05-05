import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';

const SRC = readFileSync('src/app/api/unsubscribe/route.ts', 'utf8');

// ============================================================
// Phase 5 NOTIF-02 / NOTIF-03 — /api/unsubscribe source invariants
// ============================================================
describe('Phase 5 NOTIF-02 / NOTIF-03 — /api/unsubscribe source invariants', () => {
  it('declares Node runtime (Pitfall: addEmailJob imports IORedis)', () => {
    expect(SRC).toMatch(/export const runtime\s*=\s*['"]nodejs['"]/);
  });

  it('exports both GET and POST (RFC 8058)', () => {
    expect(SRC).toMatch(/export\s+async\s+function\s+GET/);
    expect(SRC).toMatch(/export\s+async\s+function\s+POST/);
  });

  it('uses POLICY_VERSION = "2026-04-29" (mirror cookie-consent route)', () => {
    expect(SRC).toMatch(/POLICY_VERSION\s*=\s*['"]2026-04-29['"]/);
  });

  it('does NOT call auth() — public endpoint per D-14', () => {
    // Strip comments first
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(code).not.toMatch(/await\s+auth\(/);
    expect(code).not.toMatch(/from\s+['"]@\/lib\/auth['"]/);
  });

  it('imports verifyUnsubToken from @/lib/unsubscribe/hmac', () => {
    expect(SRC).toMatch(
      /import\s*\{\s*verifyUnsubToken\s*\}\s*from\s+['"]@\/lib\/unsubscribe\/hmac['"]/,
    );
  });

  it('imports brevoBlocklist + addEmailJob (retry fallback path)', () => {
    expect(SRC).toMatch(/brevoBlocklist/);
    expect(SRC).toMatch(/addEmailJob/);
    expect(SRC).toMatch(/['"]unsubscribe-brevo-retry['"]/);
  });

  it('inserts 4 topic rows (one per newsletter topic) with granted=false', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).toMatch(/'newsletter_general'/);
    expect(code).toMatch(/'newsletter_voting'/);
    expect(code).toMatch(/'newsletter_reports'/);
    expect(code).toMatch(/'newsletter_events'/);
    expect(code).toMatch(/granted:\s*false/);
  });

  it('redirects on token rejection with reason query param', () => {
    expect(SRC).toMatch(/\/unsubscribed\?reason=/);
  });

  it('does NOT log raw email — uses user_id only (D-24)', () => {
    const code = SRC.split('\n')
      .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    // The logger.info / logger.warn calls in this file MUST NOT include `email:` literal key
    // (the userEmail variable is correctly only passed to brevoBlocklist + addEmailJob, not logger).
    const loggerCalls = code.match(/logger\.(info|warn|error)\([^)]*\)/g) ?? [];
    for (const call of loggerCalls) {
      // Allow "user_id:" but not "email:" as a structured-log key
      expect(call, `logger call leaks email: ${call}`).not.toMatch(/\bemail:/);
    }
  });
});

// ============================================================
// Phase 5 NOTIF-03 — /api/unsubscribe runtime behavior (mocked dependencies)
// ============================================================
describe('Phase 5 NOTIF-03 — /api/unsubscribe runtime behavior (mocked dependencies)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
  });

  async function setupRoute(opts: {
    verify: { ok: true; uid: string } | { ok: false; reason: 'expired' | 'bad-sig' | 'malformed' };
    user?: { email: string } | null;
    brevoThrows?: boolean;
  }) {
    vi.doMock('@/lib/unsubscribe/hmac', () => ({
      verifyUnsubToken: vi.fn(() => opts.verify),
    }));
    vi.doMock('@/db', () => ({
      db: {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(async () => (opts.user ? [opts.user] : [])),
            })),
          })),
        })),
        insert: vi.fn(() => ({
          values: vi.fn(async () => undefined),
        })),
      },
    }));
    vi.doMock('@/lib/newsletter/brevo-sync', () => ({
      brevoBlocklist: opts.brevoThrows
        ? vi.fn(async () => {
            throw new Error('Brevo 500');
          })
        : vi.fn(async () => undefined),
    }));
    vi.doMock('@/lib/email/queue', () => ({
      addEmailJob: vi.fn(async () => undefined),
    }));
    return await import('@/app/api/unsubscribe/route');
  }

  it('valid token → 4 INSERTs + Brevo + 303 redirect to /unsubscribed', async () => {
    const route = await setupRoute({
      verify: { ok: true, uid: 'uid-1' },
      user: { email: 'user@example.com' },
    });
    const req = new NextRequest('https://chastnik.eu/api/unsubscribe?token=abc.def');
    const res = await route.GET(req);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/unsubscribed');
    expect(res.headers.get('location')).not.toContain('reason=');

    const { db } = (await import('@/db')) as unknown as {
      db: { insert: ReturnType<typeof vi.fn> };
    };
    expect(db.insert).toHaveBeenCalledTimes(1);
    const insertChain = db.insert.mock.results[0]!.value as {
      values: ReturnType<typeof vi.fn>;
    };
    expect(insertChain.values).toHaveBeenCalledTimes(1);
    const insertedRows = insertChain.values.mock.calls[0]![0] as Array<{
      kind: string;
      granted: boolean;
    }>;
    expect(insertedRows).toHaveLength(4);
    for (const row of insertedRows) {
      expect(row.granted).toBe(false);
      expect([
        'newsletter_general',
        'newsletter_voting',
        'newsletter_reports',
        'newsletter_events',
      ]).toContain(row.kind);
    }

    const { brevoBlocklist } = (await import('@/lib/newsletter/brevo-sync')) as unknown as {
      brevoBlocklist: ReturnType<typeof vi.fn>;
    };
    expect(brevoBlocklist).toHaveBeenCalledWith('user@example.com');
  });

  it('expired token → 303 to /unsubscribed?reason=expired; NO db writes', async () => {
    const route = await setupRoute({ verify: { ok: false, reason: 'expired' } });
    const req = new NextRequest('https://chastnik.eu/api/unsubscribe?token=stale');
    const res = await route.GET(req);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/unsubscribed?reason=expired');

    const { db } = (await import('@/db')) as unknown as {
      db: { insert: ReturnType<typeof vi.fn> };
    };
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('bad-sig token → 303 to /unsubscribed?reason=bad-sig', async () => {
    const route = await setupRoute({ verify: { ok: false, reason: 'bad-sig' } });
    const req = new NextRequest('https://chastnik.eu/api/unsubscribe?token=tampered');
    const res = await route.GET(req);
    expect(res.headers.get('location')).toContain('/unsubscribed?reason=bad-sig');
  });

  it('Brevo failure → enqueues unsubscribe-brevo-retry; still 303 to /unsubscribed (success)', async () => {
    const route = await setupRoute({
      verify: { ok: true, uid: 'uid-2' },
      user: { email: 'user@example.com' },
      brevoThrows: true,
    });
    const req = new NextRequest('https://chastnik.eu/api/unsubscribe?token=abc.def');
    const res = await route.GET(req);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/unsubscribed');
    expect(res.headers.get('location')).not.toContain('reason=');

    const { addEmailJob } = (await import('@/lib/email/queue')) as unknown as {
      addEmailJob: ReturnType<typeof vi.fn>;
    };
    expect(addEmailJob).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'unsubscribe-brevo-retry',
        unsubEmail: 'user@example.com',
      }),
    );
  });

  it('POST behaves identically to GET (RFC 8058)', async () => {
    const route = await setupRoute({
      verify: { ok: true, uid: 'uid-post' },
      user: { email: 'p@example.com' },
    });
    const req = new NextRequest('https://chastnik.eu/api/unsubscribe?token=abc.def', {
      method: 'POST',
    });
    const res = await route.POST(req);
    expect(res.status).toBe(303);

    const { db } = (await import('@/db')) as unknown as {
      db: { insert: ReturnType<typeof vi.fn> };
    };
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});

// ============================================================
// Phase 5 — /unsubscribed page source invariants (UI-SPEC §5.3)
// ============================================================
describe('Phase 5 — /unsubscribed page source invariants (UI-SPEC §5.3)', () => {
  it('imports getTranslations from next-intl/server', () => {
    const src = readFileSync('src/app/(frontend)/unsubscribed/page.tsx', 'utf8');
    expect(src).toMatch(/from\s+['"]next-intl\/server['"]/);
    expect(src).toMatch(/getTranslations\(['"]unsubscribe['"]\)/);
  });

  it('uses MainContainer width="form" per UI-SPEC §5.3', () => {
    const src = readFileSync('src/app/(frontend)/unsubscribed/page.tsx', 'utf8');
    expect(src).toMatch(/width=["']form["']/);
  });

  it('does NOT call auth() — public route', () => {
    const src = readFileSync('src/app/(frontend)/unsubscribed/page.tsx', 'utf8');
    const code = src
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/auth\(\)/);
  });

  it('uses dynamic = force-dynamic (searchParams gate)', () => {
    const src = readFileSync('src/app/(frontend)/unsubscribed/page.tsx', 'utf8');
    expect(src).toMatch(/export const dynamic\s*=\s*['"]force-dynamic['"]/);
  });

  it('robots meta excludes the page from indexing', () => {
    const src = readFileSync('src/app/(frontend)/unsubscribed/page.tsx', 'utf8');
    expect(src).toMatch(/index:\s*false/);
  });
});
