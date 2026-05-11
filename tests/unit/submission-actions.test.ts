/**
 * Task 1 RED phase — Zod schema unit tests for submission-actions.
 * These tests assert the validation contract BEFORE the implementation files exist.
 */
import { describe, it, expect } from 'vitest';

// These imports will fail until Task 1 GREEN creates src/lib/submissions/zod.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { proposalSchema, problemReportSchema } = await import('@/lib/submissions/zod');

describe('proposalSchema', () => {
  it('rejects title shorter than 5 chars', () => {
    const result = proposalSchema.safeParse({
      title: 'abc',
      body: 'а'.repeat(50),
      topic: 'taxes',
      'cf-turnstile-response': 'token',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('title');
    }
  });

  it('rejects body shorter than 50 chars', () => {
    const result = proposalSchema.safeParse({
      title: 'Намаляване на ДДС',
      body: 'only ten words', // < 50 chars
      topic: 'taxes',
      'cf-turnstile-response': 'token',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('body');
    }
  });

  it('rejects unknown topic', () => {
    const result = proposalSchema.safeParse({
      title: 'Намаляване на ДДС',
      body: 'а'.repeat(50),
      topic: 'nonexistent',
      'cf-turnstile-response': 'token',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('topic');
    }
  });

  it('accepts a valid proposal object', () => {
    const result = proposalSchema.safeParse({
      title: 'Намаляване на ДДС',
      body: 'а'.repeat(50), // exactly 50 chars (Cyrillic, 1 char each)
      topic: 'taxes',
      'cf-turnstile-response': 'token',
    });
    expect(result.success).toBe(true);
  });
});

describe('problemReportSchema', () => {
  it('requires oblast when level is local (no oblast provided)', () => {
    const result = problemReportSchema.safeParse({
      body: 'а'.repeat(30),
      topic: 'taxes',
      level: 'local',
      'cf-turnstile-response': 'token',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const flat = result.error.flatten();
      expect(flat.fieldErrors).toHaveProperty('oblast');
    }
  });

  it('accepts level=local with valid oblast', () => {
    const result = problemReportSchema.safeParse({
      body: 'а'.repeat(30),
      topic: 'taxes',
      level: 'local',
      oblast: 'BG-16',
      'cf-turnstile-response': 'token',
    });
    expect(result.success).toBe(true);
  });

  it('accepts level=national with no oblast', () => {
    const result = problemReportSchema.safeParse({
      body: 'а'.repeat(30),
      topic: 'taxes',
      level: 'national',
      'cf-turnstile-response': 'token',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid oblast code BG-99', () => {
    const result = problemReportSchema.safeParse({
      body: 'а'.repeat(30),
      topic: 'taxes',
      level: 'local',
      oblast: 'BG-99',
      'cf-turnstile-response': 'token',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors).toHaveProperty('oblast');
    }
  });
});
