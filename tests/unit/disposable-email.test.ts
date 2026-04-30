import { describe, it, expect } from 'vitest';
import { isDisposable } from '@/lib/disposable-email';

describe('AUTH-10 — disposable email blocklist (Pitfall F)', () => {
  it('rejects mailinator.com', () => expect(isDisposable('user@mailinator.com')).toBe(true));
  it('rejects 10minutemail.com', () =>
    expect(isDisposable('user@10minutemail.com')).toBe(true));
  it('accepts gmail.com', () => expect(isDisposable('user@gmail.com')).toBe(false));
  it('accepts abv.bg (Bulgarian webmail must not be flagged)', () => {
    expect(isDisposable('user@abv.bg')).toBe(false);
  });
  it('is case-insensitive', () => expect(isDisposable('USER@MAILINATOR.COM')).toBe(true));
  it('trims whitespace', () => expect(isDisposable('  user@mailinator.com  ')).toBe(true));
  it('returns false for malformed input (graceful)', () => {
    expect(isDisposable('not-an-email')).toBe(false);
    expect(isDisposable('')).toBe(false);
  });
});
