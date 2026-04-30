import { test } from '@playwright/test';

test.describe('SC-5 — production smoke (OPS-02)', () => {
  test.fixme('homepage returns 200 and contains expected meta tags', async ({ page }) => {
    // Implement in plans 1.11 / 1.12
    await page.goto('/');
  });
  test.fixme('Sentry test endpoint emits event without leaking PII', async ({ page }) => {
    // Implement in plan 1.11
    await page.goto('/api/_sentry-test');
  });
});
