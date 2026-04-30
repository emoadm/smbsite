import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { consents } from '@/db/schema';
import { auth } from '@/lib/auth';

const POLICY_VERSION = '2026-04-29';

export async function POST(req: Request) {
  let body: { decision?: { analytics?: boolean; marketing?: boolean } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const decision = body?.decision ?? {};
  const session = await auth();
  const userId: string | null = session?.user?.id ?? null;

  // Anonymous session id (separate from Auth.js session — survives login/logout).
  // Lets a future schema migration (Phase 6 — consents.user_id NULLABLE + dedicated
  // anon_id column) correlate pre-registration cookie decisions to a later user row.
  const cookieJar = await cookies();
  let anonId = cookieJar.get('sb_anon_id')?.value ?? null;
  if (!userId && !anonId) {
    anonId = crypto.randomUUID();
    cookieJar.set('sb_anon_id', anonId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  // For anonymous visitors we cannot write to consents (Phase 1 schema requires
  // consents.user_id NOT NULL). Return success so the client bridge doesn't retry;
  // the sb_anon_id cookie + CookieYes's own cookie capture the decision client-side.
  // Phase 6 schema migration adds the nullable column + dedicated anon audit row.
  if (!userId) {
    return NextResponse.json({ ok: true, anonAudited: false });
  }

  // D-13 append-only: INSERT one row per category. Cookies (= necessary) is always granted.
  // Granular categories analytics/marketing are encoded into the version suffix because
  // Phase 1 schema only declares the four canonical kinds (privacy_terms / cookies /
  // newsletter / political_opinion). Phase 5 adds dedicated cookies.analytics /
  // cookies.marketing kinds.
  const versionTag = POLICY_VERSION;
  const rows = [
    { user_id: userId, kind: 'cookies', granted: true, version: versionTag },
    {
      user_id: userId,
      kind: 'cookies',
      granted: !!decision.analytics,
      version: `${versionTag}#analytics`,
    },
    {
      user_id: userId,
      kind: 'cookies',
      granted: !!decision.marketing,
      version: `${versionTag}#marketing`,
    },
  ];
  await db.insert(consents).values(rows);
  return NextResponse.json({ ok: true, anonAudited: false, userAudited: true });
}
