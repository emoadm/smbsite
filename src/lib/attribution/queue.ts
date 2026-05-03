import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Phase 2.1 attribution producer (D-08, D-20). Mirrors src/lib/email/queue.ts
// exactly: same IORedis singleton settings (maxRetriesPerRequest: null,
// enableReadyCheck: false), same test-build bypass, same retry+backoff shape
// with attempts dropped to 3 (attribution failure is never user-visible —
// Claude's discretion noted in 02.1-CONTEXT.md).

export interface AttributionJobPayload {
  // Anonymous session identity (UUID v4 from /api/attr/init cookie set)
  attr_sid: string;
  // EPHEMERAL — worker discards after in-memory GeoIP lookup. NEVER persisted.
  // Field is named raw_ip (not 'ip') so Pino redact + grep tests catch it
  // explicitly if it ever shows up in a log call.
  raw_ip: string | null;
  // Diagnostics (kept in payload only; not persisted to attribution_events)
  ua: string | null;
  // UTM + referer + landing — persisted to first_*/last_* columns
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referer: string | null;
  landing_path: string;
  // ISO timestamp of the original visit (worker uses this for first_seen_at /
  // last_seen_at; necessary because the job may run minutes after the visit
  // if the worker is backlogged).
  ts: string;
}

export const ATTRIBUTION_QUEUE_NAME = 'attribution-queue';

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

let _queue: Queue<AttributionJobPayload> | null = null;
function getQueue(): Queue<AttributionJobPayload> {
  if (_queue) return _queue;
  _queue = new Queue<AttributionJobPayload>(ATTRIBUTION_QUEUE_NAME, { connection: getConnection() });
  return _queue;
}

export async function addAttributionJob(payload: AttributionJobPayload): Promise<void> {
  // Test/dev shortcut: same triple-guard as src/lib/email/queue.ts so unit
  // tests with the always-pass Turnstile sitekey never try to hit Redis.
  const url = process.env.UPSTASH_REDIS_URL;
  const isTestBuild = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY === '1x00000000000000000000AA';
  const isLocalUrl = !!url && (url.includes('localhost') || url.includes('127.0.0.1'));
  if (!url || isLocalUrl || isTestBuild) {
    if (process.env.NODE_ENV === 'production' && !isTestBuild && !isLocalUrl) {
      throw new Error('UPSTASH_REDIS_URL must be set in production');
    }
    return;
  }
  await getQueue().add('attribution-event', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { age: 24 * 3600, count: 1000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  });
}

export async function closeAttributionQueue(): Promise<void> {
  if (_queue) await _queue.close();
  if (_connection) await _connection.quit();
  _queue = null;
  _connection = null;
}
