import { startWorker } from '../src/lib/email/worker';

const worker = startWorker();

worker.on('completed', (job) => {
  console.warn('[worker] completed', job.id, job.name);
});
worker.on('failed', (job, err) => {
  console.error('[worker] failed', job?.id, job?.name, err.message);
});

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
process.on('SIGINT', async () => {
  await worker.close();
  process.exit(0);
});
