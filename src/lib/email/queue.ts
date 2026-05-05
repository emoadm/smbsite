import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Phase 5 D-21 — newsletter sends extend EmailJobKind (no separate queue).
// Wave 1 forward-declares ALL Phase 5 fields so Wave 2 worker handlers
// (05-05) and the unsubscribe route (05-06) build against a stable shape.
export type EmailJobKind =
  | 'register-otp'
  | 'login-otp'
  | 'welcome'
  | 'newsletter-blast'              // fan-out trigger (one per Send blast click)
  | 'newsletter-send-recipient'     // per-recipient sub-job (the actual Brevo send)
  | 'newsletter-test'               // single-recipient test send (D-02 24h gate)
  | 'unsubscribe-brevo-retry';      // retry path for /api/unsubscribe Brevo blocklist failure

export interface EmailJobPayload {
  to: string;
  kind: EmailJobKind;
  // Phase 1 fields
  otpCode?: string;
  expiresAt?: Date;
  fullName?: string;
  // Phase 5 newsletter fields (forward-declared in Wave 1, consumed in Wave 2)
  newsletterId?: string;            // Payload doc id (newsletter-blast / newsletter-test)
  userId?: string;                  // recipient user id (newsletter-send-recipient)
  topic?: string;                   // 'newsletter_general' | 'newsletter_voting' | 'newsletter_reports' | 'newsletter_events'
  unsubEmail?: string;              // unsubscribe-brevo-retry payload
  delayMs?: number;                 // optional schedule offset for delayed sends (D-04)
}

export const EMAIL_QUEUE_NAME = 'email-queue';

let _connection: IORedis | null = null;
function getConnection(): IORedis {
  if (_connection) return _connection;
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) throw new Error('UPSTASH_REDIS_URL not configured');
  _connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
  return _connection;
}

let _queue: Queue<EmailJobPayload> | null = null;
function getQueue(): Queue<EmailJobPayload> {
  if (_queue) return _queue;
  _queue = new Queue<EmailJobPayload>(EMAIL_QUEUE_NAME, { connection: getConnection() });
  return _queue;
}

export async function addEmailJob(payload: EmailJobPayload): Promise<void> {
  const sinkPath = process.env.TEST_OTP_SINK;
  if (sinkPath && process.env.NODE_ENV !== 'production') {
    try {
      const fs = await import('node:fs/promises');
      const { dirname } = await import('node:path');
      await fs.mkdir(dirname(sinkPath), { recursive: true });
      const existing = await fs.readFile(sinkPath, 'utf8').catch(() => '[]');
      let arr: EmailJobPayload[] = [];
      try {
        arr = JSON.parse(existing);
        if (!Array.isArray(arr)) arr = [];
      } catch {
        arr = [];
      }
      arr.push(payload);
      await fs.writeFile(sinkPath, JSON.stringify(arr));
    } catch {
      /* sink errors must not break the action */
    }
  }
  // Test/dev shortcut: no-op when there is no real Redis to talk to. CI Playwright
  // runs `pnpm start` (NODE_ENV=production) but inherits .env.test (loaded by
  // playwright.config.ts) which sets UPSTASH_REDIS_URL=redis://localhost:6379 — so
  // checking just `unset` is not enough; we must also bypass on a localhost URL.
  // The Cloudflare always-pass test sitekey is the canonical "this is a test build"
  // signal (set in ci.yml, never used in real prod; same convention as
  // src/lib/rate-limit.ts BYPASS and src/lib/turnstile.ts skip).
  const url = process.env.UPSTASH_REDIS_URL;
  // NODE_ENV=test pin: deployed staging uses the always-pass sitekey too
  // (k6 / Playwright cannot solve real CAPTCHA) and MUST exercise the real
  // queue path so OPS-05 load tests can verify D-16 attribution linkage.
  const isTestBuild =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === '1x00000000000000000000AA' &&
    process.env.NODE_ENV === 'test';
  const isLocalUrl = !!url && (url.includes('localhost') || url.includes('127.0.0.1'));
  if (!url || isLocalUrl || isTestBuild) {
    if (process.env.NODE_ENV === 'production' && !isTestBuild && !isLocalUrl) {
      throw new Error('UPSTASH_REDIS_URL must be set in production');
    }
    return;
  }
  const opts: import('bullmq').JobsOptions = {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  };
  if (typeof payload.delayMs === 'number' && payload.delayMs > 0) {
    opts.delay = payload.delayMs;
  }
  if (payload.kind === 'newsletter-blast' && payload.newsletterId) {
    // Deterministic jobId — BullMQ ignores duplicate adds (RESEARCH Pattern 6)
    opts.jobId = `newsletter-${payload.newsletterId}`;
  }
  await getQueue().add(payload.kind, payload, opts);
}

export async function closeQueue(): Promise<void> {
  if (_queue) await _queue.close();
  if (_connection) await _connection.quit();
  _queue = null;
  _connection = null;
}
