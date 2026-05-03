import { Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '@/db';
import { attribution_events } from '@/db/schema';
import { lookupIp } from '@/lib/geoip';
import { logger } from '@/lib/logger';
import { ATTRIBUTION_QUEUE_NAME, type AttributionJobPayload } from './queue';

// Phase 2.1 attribution worker (D-08, D-19, D-20).
//
// Receives a job from the attribution queue; performs the in-memory MaxMind
// GeoLite2 lookup; discards the raw IP after lookup; upserts the row into
// attribution_events. Raw IP NEVER reaches Postgres or persistent logs.
//
// CRITICAL — D-19 / GDPR-09:
//   - raw_ip is read from job.data, passed to lookupIp(), then NEVER passed
//     to db.insert(...). The Drizzle insert call must contain ZERO references
//     to raw_ip — verified by tests/unit/attribution-worker.test.ts grep.
//   - Logger calls must NOT include raw_ip in the structured object —
//     belt-and-braces: src/lib/logger.ts REDACT also includes 'raw_ip', so
//     any accidental log shows '[Redacted]'.

function workerConnection(): IORedis {
  const url = process.env.UPSTASH_REDIS_URL!;
  return new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });
}

async function processor(job: Job<AttributionJobPayload>): Promise<void> {
  const {
    attr_sid,
    raw_ip,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    referer,
    landing_path,
    ts,
  } = job.data;

  // 1. In-memory GeoIP lookup. raw_ip is now used for one purpose only.
  const { oblast, country } = await lookupIp(raw_ip ?? '');

  // 2. raw_ip is intentionally NOT passed to any subsequent statement.
  //    The variable goes out of scope at function return; BullMQ's
  //    removeOnComplete: 24h then removes the Redis job entirely.

  // 3. Derive qr_flag from utm_medium per ATTR-01 (case-insensitive).
  const qr_flag = utm_medium && utm_medium.toLowerCase() === 'qr' ? 'qr' : null;

  // 4. Parse the visit timestamp; default to now() on parse failure (worker
  //    must always succeed in writing the row per D-03 spirit).
  let seen_at: Date;
  try {
    seen_at = new Date(ts);
    if (Number.isNaN(seen_at.getTime())) seen_at = new Date();
  } catch {
    seen_at = new Date();
  }

  // 5. Upsert: first INSERT sets both first_* and last_* (treating first
  //    visit as also the most recent). Subsequent visits hit the unique
  //    attr_sid constraint and update only the last_* columns + last_seen_at.
  await db
    .insert(attribution_events)
    .values({
      attr_sid,
      first_utm_source: utm_source,
      first_utm_medium: utm_medium,
      first_utm_campaign: utm_campaign,
      first_utm_term: utm_term,
      first_utm_content: utm_content,
      first_referer: referer,
      first_oblast: oblast,
      first_country: country,
      first_qr_flag: qr_flag,
      first_landing_path: landing_path,
      first_seen_at: seen_at,
      last_utm_source: utm_source,
      last_utm_medium: utm_medium,
      last_utm_campaign: utm_campaign,
      last_utm_term: utm_term,
      last_utm_content: utm_content,
      last_referer: referer,
      last_oblast: oblast,
      last_country: country,
      last_qr_flag: qr_flag,
      last_landing_path: landing_path,
      last_seen_at: seen_at,
    })
    .onConflictDoUpdate({
      target: attribution_events.attr_sid,
      set: {
        last_utm_source: utm_source,
        last_utm_medium: utm_medium,
        last_utm_campaign: utm_campaign,
        last_utm_term: utm_term,
        last_utm_content: utm_content,
        last_referer: referer,
        last_oblast: oblast,
        last_country: country,
        last_qr_flag: qr_flag,
        last_landing_path: landing_path,
        last_seen_at: seen_at,
      },
    });

  // 6. Structured log — NO raw_ip. Pino REDACT redacts 'raw_ip' belt-and-
  //    braces if a future caller adds it back.
  logger.info({ attr_sid, oblast, country, qr_flag, task: 'attribution' }, 'attribution event upserted');
}

export function startWorker() {
  return new Worker<AttributionJobPayload, void>(
    ATTRIBUTION_QUEUE_NAME,
    processor,
    {
      connection: workerConnection(),
      concurrency: 5,
    },
  );
}
