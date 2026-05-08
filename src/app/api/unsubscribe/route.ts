import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { consents, users } from '@/db/schema';
import { verifyUnsubToken } from '@/lib/unsubscribe/hmac';
import { brevoBlocklist } from '@/lib/newsletter/brevo-sync';
import { addEmailJob } from '@/lib/email/queue';
import { logger } from '@/lib/logger';

// Phase 5 NOTIF-02 / NOTIF-03 / D-14 — RFC 8058 one-click unsubscribe endpoint.
//
// Why Node runtime: addEmailJob imports IORedis (BullMQ producer) which is
// incompatible with the Edge runtime. Same constraint as
// src/app/api/attr/init/route.ts (Phase 02.1 lesson documented in PATTERNS.md).
export const runtime = 'nodejs';

const POLICY_VERSION = '2026-04-29';

// The 4 newsletter topic kinds per D-08. INSERT one granted=false row per kind
// (append-only pattern per D-13; mirrors cookie-consent/route.ts:51-65).
const TOPIC_KINDS = [
  'newsletter_general',
  'newsletter_voting',
  'newsletter_reports',
  'newsletter_events',
] as const;

async function handle(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const isTestSend = url.searchParams.get('test') === '1';

  // HMAC token is the auth substitute (D-14 — no login required for unsubscribe).
  const v = verifyUnsubToken(token);
  if (!v.ok) {
    logger.info({ reason: v.reason }, 'unsubscribe.token_rejected');
    return NextResponse.redirect(new URL(`/unsubscribed?reason=${v.reason}`, req.url), {
      status: 303,
    });
  }

  const userId = v.uid;

  // Test-send guard. The newsletter-test branch in worker.tsx appends
  // `&test=1` so editors who click the unsub link in their own test email
  // see the redirect flow without actually getting suppressed. Without
  // this, an editor verifying the link would mark themselves
  // newsletter-revoked in `consents` AND get added to Brevo's global
  // blocklist (sticky at the ESP level — re-subscribing in-app would
  // not restore inbox delivery until manually de-blocklisted in Brevo).
  if (isTestSend) {
    logger.info({ user_id: userId }, 'unsubscribe.test_send_noop');
    return NextResponse.redirect(new URL('/unsubscribed?test=1', req.url), {
      status: 303,
    });
  }

  // Look up email — needed for Brevo blocklist call (D-24: log only user_id, not email).
  const userRows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRows.length === 0) {
    // Token verifies but user was deleted (Phase 6 grace-period deletion?).
    // RFC 8058 perspective: treat as success — no further DB or ESP action needed.
    logger.info({ user_id: userId }, 'unsubscribe.user_not_found');
    return NextResponse.redirect(new URL('/unsubscribed', req.url), { status: 303 });
  }
  const userEmail = userRows[0]!.email;

  // D-13 append-only: INSERT 4 granted=false rows, one per newsletter topic.
  // Do NOT update or delete existing rows — withdrawals are expressed as new rows.
  await db.insert(consents).values(
    TOPIC_KINDS.map((kind) => ({
      user_id: userId,
      kind,
      granted: false,
      version: POLICY_VERSION,
    })),
  );

  // D-14 same-session sync: attempt Brevo blocklist in-line.
  // On failure: enqueue retry (Pitfall 4 — DB writes are source of truth; Brevo
  // is downstream ESP that must eventually converge, not a blocking dependency).
  try {
    await brevoBlocklist(userEmail);
    logger.info({ user_id: userId }, 'unsubscribe.brevo_sync_ok');
  } catch (err) {
    logger.warn(
      { user_id: userId, err: err instanceof Error ? err.message : String(err) },
      'unsubscribe.brevo_sync_failed',
    );
    // BullMQ: attempts=5, exponential backoff (configured in queue.ts addEmailJob).
    await addEmailJob({
      to: userEmail,
      kind: 'unsubscribe-brevo-retry',
      unsubEmail: userEmail,
    });
  }

  return NextResponse.redirect(new URL('/unsubscribed', req.url), { status: 303 });
}

// RFC 8058: mailbox providers POST `List-Unsubscribe=One-Click` header;
// recipients click the footer link via GET. Both methods use the same handler.
export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req);
}
