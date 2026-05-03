import { test, expect } from '@playwright/test';

/**
 * Phase 2 GDPR-01 E2E coverage.
 *
 * Cookie consent banner appears on first visit, granular categories
 * (necessary / analytics / marketing) present.
 *
 * Requires NEXT_PUBLIC_COOKIEYES_SITE_KEY in .env.test (or CI env). When
 * absent the spec skips gracefully — CookieYes script will not mount the
 * banner without a real key.
 */

const HAS_KEY =
  !!process.env.NEXT_PUBLIC_COOKIEYES_SITE_KEY &&
  !process.env.NEXT_PUBLIC_COOKIEYES_SITE_KEY.includes('placeholder');

test.describe('GDPR-01 — cookie consent', () => {
  test.skip(!HAS_KEY, 'NEXT_PUBLIC_COOKIEYES_SITE_KEY not set or is placeholder');

  test('cookie banner appears on first visit', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    // CookieYes injects .cky-consent-container OR a [data-cky-tag="notice"] element.
    // beforeInteractive hoisting means the script ships in initial HTML; banner
    // appears within ~2-3s in production, longer in dev.
    const banner = page.locator('.cky-consent-container, [data-cky-tag="notice"]').first();
    await expect(banner).toBeVisible({ timeout: 8000 });
  });

  test('granular categories present (необходими, анализи, маркетинг)', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await page.goto('/');
    // Wait for banner to mount
    await page.waitForSelector('.cky-consent-container, [data-cky-tag="notice"]', {
      timeout: 8000,
    });
    // Click Customize / Настрой to expand category list
    const customize = page
      .getByRole('button', { name: /(настрой|customize|preferences)/i })
      .first();
    await customize.click();
    // Verify all 3 category names render in Bulgarian
    for (const cat of [/необходими/i, /анализи/i, /маркетинг/i]) {
      await expect(page.getByText(cat).first()).toBeVisible({ timeout: 5000 });
    }
  });
});
