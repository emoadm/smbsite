import { test } from '@playwright/test';

test.describe('BRAND-02, BRAND-03, BRAND-06 — branding shell', () => {
  test.fixme('header renders coalition logo (placeholder ok pre-asset)', async ({ page }) => {
    // Implement in plan 1.08
    await page.goto('/');
  });
  test.fixme('footer contains links to /legal/privacy and /legal/terms', async ({ page }) => {
    // Implement in plan 1.08
    await page.goto('/');
  });
  test.fixme('UI is fully Bulgarian — no English visible labels', async ({ page }) => {
    // Implement in plan 1.08
    await page.goto('/');
  });
});
