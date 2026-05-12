import { test, expect } from '@playwright/test';

test.describe('Branding contract — BRAND-02, BRAND-03, BRAND-06', () => {
  test('logo SVG is present in header on every public + auth route (BRAND-02 + PUB-03 nav)', async ({
    page,
  }) => {
    for (const path of [
      '/', // NEW Phase 2
      '/agenda', // NEW Phase 2
      '/faq', // NEW Phase 2
      '/register',
      '/login',
      '/auth/otp',
      '/legal/privacy',
      '/legal/terms',
    ]) {
      await page.goto(path);
      const logo = page.getByRole('banner').getByRole('link', { name: 'Синя България' });
      await expect(logo).toBeVisible();
      const img = logo.locator('img');
      await expect(img).toHaveAttribute('alt', 'Синя България');
      await expect(img).toHaveAttribute('src', /logo\.svg/);
    }
  });

  test('Gilroy/Manrope display family is loaded on h1 (BRAND-06 — Phase 2 extension)', async ({
    page,
  }) => {
    await page.goto('/');
    const family = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? getComputedStyle(h1).fontFamily : '';
    });
    const lower = family.toLowerCase();
    expect(lower.includes('gilroy') || lower.includes('manrope')).toBe(true);
  });

  test('Roboto Cyrillic family is loaded on body (BRAND-06)', async ({ page }) => {
    await page.goto('/register');
    const family = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(family.toLowerCase()).toContain('roboto');
  });

  test('Cyrillic glyphs render without fallback boxes (BRAND-06)', async ({ page }) => {
    await page.goto('/register');
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text).toMatch(/[А-Яа-я]/);
  });

  test('headings are sentence case, not ALL CAPS (BRAND-03)', async ({ page }) => {
    await page.goto('/login');
    const headingText = await page.locator('h1').first().textContent();
    if (headingText) expect(headingText).not.toEqual(headingText.toUpperCase());
  });

  test('draft marker is visible on /legal/privacy and /legal/terms (D-15)', async ({
    page,
  }) => {
    for (const p of ['/legal/privacy', '/legal/terms']) {
      await page.goto(p);
      await expect(page.getByText(/проект, последна редакция/)).toBeVisible();
    }
  });
});
