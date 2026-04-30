import { describe, it, expect } from 'vitest';

describe('AUTH-03, NOTIF-08 — BullMQ email queue', () => {
  it.todo('addEmailJob(otpEmail, payload) enqueues to BullMQ on Upstash');
  it.todo('queue reuses single connection (Pitfall E: ioredis URL form)');
  it.todo('failed jobs retry with exponential backoff');
  it('SCAFFOLD MISSING — wired in plan 1.10', () => {
    expect.fail('Stub: implement in src/lib/email/queue.ts (plan 1.10)');
  });
});
