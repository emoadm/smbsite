import { describe, it, expect } from 'vitest';
import robots from '@/app/robots';

describe('app/robots.ts (PUB-03 + Security Domain)', () => {
  it('allows public paths', () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0]! : r.rules;
    const allow = Array.isArray(rule.allow) ? rule.allow : [rule.allow];
    expect(allow).toContain('/');
    expect(allow).toContain('/agenda');
    expect(allow).toContain('/faq');
    expect(allow).toContain('/legal/');
  });

  it('disallows private paths', () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0]! : r.rules;
    const disallow = Array.isArray(rule.disallow) ? rule.disallow : [rule.disallow];
    expect(disallow).toContain('/member');
    expect(disallow).toContain('/admin');
    expect(disallow).toContain('/auth/');
    expect(disallow).toContain('/api/');
    expect(disallow).toContain('/login');
    expect(disallow).toContain('/register');
  });

  it('points to the sitemap', () => {
    const r = robots();
    expect(r.sitemap).toBe('https://chastnik.eu/sitemap.xml');
  });

  it('declares the canonical host', () => {
    const r = robots();
    expect(r.host).toBe('https://chastnik.eu');
  });
});
