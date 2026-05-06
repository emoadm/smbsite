// Phase 5 G1 (UAT gap closure) — load .env.local + .env BEFORE importing any
// project module. Without this, the standalone worker (`pnpm worker`) crashes
// on a developer's local box because src/db/index.ts evaluates
// `process.env.DATABASE_URL.includes(...)` at module load against undefined.
//
// Production (Fly.io) is unaffected: the worker process group inherits Fly
// secrets via kernel environ, no .env file is present in /app, and dotenv
// silently no-ops. `override: false` guarantees Fly secrets win over any
// stray .env contents (defence-in-depth, threat T-05-12-01).
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
loadEnv({ path: '.env', override: false });

import IORedis from 'ioredis';

// Phase 5 G4 (UAT gap closure) — strict no-silent-degradation eviction-policy
// assertion. BullMQ uses TTLs on job locks; an eviction policy that drops
// TTL'd keys can silently corrupt or lose jobs under memory pressure. BullMQ
// warns but does not refuse to start; this assertion turns the warning into
// a hard fail.
//
// Three outcomes from the helper:
//   - kind: 'ok'           → success log, proceed
//   - kind: 'wrong'        → fatal log + process.exit(1) (skip flag NEVER covers this)
//   - kind: 'unverifiable' → check skip flag:
//       - skipped=false    → fatal log + process.exit(1) (no silent degradation)
//       - skipped=true     → structured warn `eviction-assert-skipped` + proceed
//
// The skip flag (WORKER_SKIP_EVICTION_ASSERT=1) is grep-visible, env-driven,
// and audit-trailed in .planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md.

export type EvictionCheckInput =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

export type EvictionCheckOutcome =
  | { kind: 'ok' }
  | { kind: 'wrong'; policy: string }
  | { kind: 'unverifiable'; reason: string; skipped: boolean };

export function evaluateEvictionPolicy(
  input: EvictionCheckInput,
  env: { WORKER_SKIP_EVICTION_ASSERT?: string | undefined },
): EvictionCheckOutcome {
  if (input.ok) {
    // ioredis returns ['maxmemory-policy', '<value>'] for CONFIG GET.
    const v = input.value;
    if (!Array.isArray(v) || v.length < 2 || typeof v[1] !== 'string') {
      return {
        kind: 'unverifiable',
        reason: `CONFIG GET returned unexpected shape: ${JSON.stringify(v)}`,
        skipped: env.WORKER_SKIP_EVICTION_ASSERT === '1',
      };
    }
    const policy = v[1];
    if (policy === 'noeviction') return { kind: 'ok' };
    return { kind: 'wrong', policy };
  }
  return {
    kind: 'unverifiable',
    reason: input.error,
    skipped: env.WORKER_SKIP_EVICTION_ASSERT === '1',
  };
}

async function assertNoEviction(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_URL;
  if (!url) {
    // queue.ts will throw the canonical "UPSTASH_REDIS_URL not configured"
    // error when the workers are constructed below. Don't double-throw here.
    return;
  }
  const client = new IORedis(url, {
    lazyConnect: true,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    tls: url.startsWith('rediss://') ? {} : undefined,
  });

  let input: EvictionCheckInput;
  try {
    await client.connect();
    const result = await client.config('GET', 'maxmemory-policy');
    input = { ok: true, value: result };
  } catch (err) {
    input = { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await client.quit().catch(() => {
      /* noop on quit failure */
    });
  }

  const outcome = evaluateEvictionPolicy(input, {
    WORKER_SKIP_EVICTION_ASSERT: process.env.WORKER_SKIP_EVICTION_ASSERT,
  });

  if (outcome.kind === 'ok') {
    console.warn('[worker] eviction-assert: noeviction ✓');
    return;
  }

  if (outcome.kind === 'wrong') {
    console.error(
      `[worker] FATAL eviction-assert: Redis maxmemory-policy is "${outcome.policy}" — BullMQ requires "noeviction". ` +
        'Set via Upstash dashboard (Eviction toggle) or `redis-cli CONFIG SET maxmemory-policy noeviction`. ' +
        'See .planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md. ' +
        'WORKER_SKIP_EVICTION_ASSERT does NOT cover this case (only the unverifiable case).',
    );
    process.exit(1);
  }

  // outcome.kind === 'unverifiable'
  if (outcome.skipped) {
    console.warn(
      `eviction-assert-skipped reason=${JSON.stringify(outcome.reason)} at=${new Date().toISOString()}`,
    );
    return;
  }
  console.error(
    `[worker] FATAL eviction-assert: Cannot verify Redis maxmemory-policy=noeviction — ${outcome.reason}. ` +
      'Set WORKER_SKIP_EVICTION_ASSERT=1 to bypass after recording sign-off in ' +
      '.planning/phases/05-notifications/05-OPS-REDIS-EVICTION.md.',
  );
  process.exit(1);
}

async function main() {
  await assertNoEviction();

  const { startWorker: startEmailWorker } = await import('../src/lib/email/worker');
  const { startWorker: startAttributionWorker } = await import('../src/lib/attribution/worker');

  // Phase 2.1 D-20: attribution and email share the same worker process group
  // (fly.toml [processes] worker = "node --import tsx scripts/start-worker.ts").
  // Both consume from the same Upstash Redis instance, different namespaces.
  const emailWorker = startEmailWorker();
  const attrWorker = startAttributionWorker();

  const workers: ReadonlyArray<readonly [ReturnType<typeof startEmailWorker> | ReturnType<typeof startAttributionWorker>, string]> = [
    [emailWorker, 'email'],
    [attrWorker, 'attribution'],
  ];

  for (const [w, name] of workers) {
    w.on('completed', (job) => {
      console.warn(`[${name}-worker] completed`, job.id, job.name);
    });
    w.on('failed', (job, err) => {
      console.error(`[${name}-worker] failed`, job?.id, job?.name, err.message);
    });
  }

  async function shutdown(signal: NodeJS.Signals) {
    console.warn(`[worker] received ${signal} — closing all workers`);
    await Promise.all(workers.map(([w]) => w.close()));
    process.exit(0);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('[worker] fatal error during boot', err);
  process.exit(1);
});
