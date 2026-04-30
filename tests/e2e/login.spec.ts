import { test } from '@playwright/test';

test.describe('SC-2 — login flow (AUTH-04, AUTH-05, AUTH-06)', () => {
  test.fixme('login OTP request → email queue → verify → session cookie', async ({ page }) => {
    // Implement in plan 1.09
    await page.goto('/login');
  });
});
