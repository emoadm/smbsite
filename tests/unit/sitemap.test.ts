import { describe, it, expect } from 'vitest';
import sitemap from '@/app/sitemap';

describe('app/sitemap.ts (PUB-03)', () => {
  it('lists exactly the 6 expected public URLs', () => {
    const entries = sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain('https://chastnik.eu/');
    expect(urls).toContain('https://chastnik.eu/agenda');
    expect(urls).toContain('https://chastnik.eu/faq');
    expect(urls).toContain('https://chastnik.eu/legal/privacy');
    expect(urls).toContain('https://chastnik.eu/legal/terms');
    expect(urls).toContain('https://chastnik.eu/register');
    expect(urls).toHaveLength(6);
  });

  it('does NOT leak private paths', () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.some((u) => u.includes('/member'))).toBe(false);
    expect(urls.some((u) => u.includes('/admin'))).toBe(false);
    expect(urls.some((u) => u.includes('/auth/'))).toBe(false);
    expect(urls.some((u) => u.includes('/api/'))).toBe(false);
    expect(urls.some((u) => u.includes('/login'))).toBe(false);
  });

  it('assigns priority 1.0 to the landing page', () => {
    const root = sitemap().find((e) => e.url === 'https://chastnik.eu/');
    expect(root?.priority).toBe(1.0);
  });
});
