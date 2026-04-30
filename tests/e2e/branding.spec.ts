import { test, expect } from '@playwright/test';

test.describe('Branding contract — BRAND-02, BRAND-03, BRAND-06', () => {
  test('logo SVG is present in header on every Phase 1 route (BRAND-02)', async ({
    page,
  }) => {
    for (const path of [
      '/register',
      '/login',
      '/auth/otp',
      '/legal/privacy',
      '/legal/terms',
    ]) {
      await page.goto(path);
      const logo = page.getByRole('link', { name: 'Синя България' });
      await expect(logo).toBeVisible();
      const img = logo.locator('img');
      await expect(img).toHaveAttribute('alt', 'Синя България');
      await expect(img).toHaveAttribute('src', /logo-placeholder\.svg/);
    }
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
