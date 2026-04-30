import { test } from '@playwright/test';

test.describe('SC-1 — registration flow (AUTH-01, AUTH-02, AUTH-07)', () => {
  test.fixme(
    'fills form, receives OTP enqueue, session cookie set after verify',
    async ({ page }) => {
      // Implement in plan 1.09
      await page.goto('/register');
    },
  );
});
