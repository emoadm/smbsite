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

import { startWorker as startEmailWorker } from '../src/lib/email/worker';
import { startWorker as startAttributionWorker } from '../src/lib/attribution/worker';

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
