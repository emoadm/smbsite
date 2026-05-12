/**
 * Task 1 RED phase — rate-limiter export smoke test.
 * Asserts the two new submission limiters are exported functions.
 * In test env (no real Upstash URL), BYPASS is active, so they return success:true.
 */
import { describe, it, expect } from 'vitest';

// These imports will fail until Task 1 GREEN extends src/lib/rate-limit.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { checkSubmissionPerUser, checkSubmissionPerIp, RATE_LIMITS } = await import('@/lib/rate-limit');

describe('submission rate-limit exports', () => {
  it('checkSubmissionPerUser is exported as a function', () => {
    expect(typeof checkSubmissionPerUser).toBe('function');
  });

  it('checkSubmissionPerIp is exported as a function', () => {
    expect(typeof checkSubmissionPerIp).toBe('function');
  });

  it('checkSubmissionPerUser returns success:true in bypass mode (test env)', async () => {
    const result = await checkSubmissionPerUser('test-user-id');
    expect(result.success).toBe(true);
  });

  it('checkSubmissionPerIp returns success:true in bypass mode (test env)', async () => {
    const result = await checkSubmissionPerIp('127.0.0.1');
    expect(result.success).toBe(true);
  });

  it('RATE_LIMITS includes submissionPerUser entry with correct config', () => {
    expect(RATE_LIMITS).toHaveProperty('submissionPerUser');
    expect((RATE_LIMITS as Record<string, { limit: number; window: string }>).submissionPerUser.limit).toBe(5);
  });

  it('RATE_LIMITS includes submissionPerIp entry with correct config', () => {
    expect(RATE_LIMITS).toHaveProperty('submissionPerIp');
    expect((RATE_LIMITS as Record<string, { limit: number; window: string }>).submissionPerIp.limit).toBe(10);
  });
});
