import { describe, it, expect } from 'vitest';
import { dsaReportSchema, DsaCategoryEnum } from '@/lib/submissions/zod';

describe('dsaReportSchema', () => {
  const valid = {
    targetSubmissionId: '550e8400-e29b-41d4-a716-446655440000',
    category: 'spam',
    reason: 'Това съдържание изглежда като автоматизиран спам без връзка с темата.',
    goodFaith: 'on',
    'cf-turnstile-response': 'token',
  };
  it('accepts a valid report', () => {
    expect(dsaReportSchema.safeParse(valid).success).toBe(true);
  });
  it('rejects reason shorter than 20 chars', () => {
    expect(dsaReportSchema.safeParse({ ...valid, reason: 'short' }).success).toBe(false);
  });
  it('rejects unknown category', () => {
    expect(dsaReportSchema.safeParse({ ...valid, category: 'not-a-category' }).success).toBe(false);
  });
  it('rejects missing goodFaith checkbox', () => {
    const { goodFaith, ...rest } = valid;
    void goodFaith;
    expect(dsaReportSchema.safeParse(rest).success).toBe(false);
  });
  it('rejects malformed targetSubmissionId', () => {
    expect(dsaReportSchema.safeParse({ ...valid, targetSubmissionId: 'not-a-uuid' }).success).toBe(false);
  });
  it('DsaCategoryEnum has 5 entries', () => {
    expect(DsaCategoryEnum.options.length).toBe(5);
  });
});
