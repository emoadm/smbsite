import { test } from '@playwright/test';

test.describe('SC-3 — anti-abuse stack (AUTH-08)', () => {
  test.fixme('Turnstile challenge required to submit registration', async ({ page }) => {
    // Implement in plan 1.09
    await page.goto('/register');
  });
  test.fixme('rate-limit blocks 6th registration attempt from same IP', async ({ page }) => {
    // Implement in plan 1.09
    await page.goto('/register');
  });
});
