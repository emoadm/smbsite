import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { addAttributionJob } from '@/lib/attribution/queue';

describe('ATTR-* / D-08 / D-20 — attribution BullMQ producer', () => {
  it('addAttributionJob resolves <200ms in test/dev (non-blocking — D-08)', async () => {
    const t0 = Date.now();
    await addAttributionJob({
      attr_sid: 'test-sid-' + Date.now(),
      raw_ip: null,
      ua: null,
      utm_source: 'qr_letter',
      utm_medium: 'qr',
      utm_campaign: 'warmup2026',
      utm_term: null,
      utm_content: null,
      referer: null,
      landing_path: '/',
      ts: new Date().toISOString(),
    });
    expect(Date.now() - t0).toBeLessThan(200);
  });

  it('source declares Pitfall E IORedis settings (maxRetriesPerRequest, enableReadyCheck)', () => {
    const src = readFileSync('src/lib/attribution/queue.ts', 'utf8');
    expect(src).toContain('maxRetriesPerRequest: null');
    expect(src).toContain('enableReadyCheck: false');
  });

  it('source declares test-build bypass guard (NEXT_PUBLIC_TURNSTILE_SITE_KEY)', () => {
    const src = readFileSync('src/lib/attribution/queue.ts', 'utf8');
    expect(src).toContain("NEXT_PUBLIC_TURNSTILE_SITE_KEY === '1x00000000000000000000AA'");
  });

  it('AttributionJobPayload exposes raw_ip field (ephemeral — discarded by worker, never persisted)', () => {
    const src = readFileSync('src/lib/attribution/queue.ts', 'utf8');
    // raw_ip MUST exist on the payload type so the producer can carry it to
    // the worker; the GDPR-09 invariant is enforced by the WORKER discarding
    // it (tests/unit/attribution-worker.test.ts), not by hiding it here.
    expect(src).toMatch(/raw_ip:\s*string\s*\|\s*null/);
  });

  it('retry policy is attempts: 3 (Claude discretion — attribution failure not user-visible)', () => {
    const src = readFileSync('src/lib/attribution/queue.ts', 'utf8');
    expect(src).toMatch(/attempts:\s*3/);
  });
});
