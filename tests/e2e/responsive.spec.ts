import { test, expect } from '@playwright/test';

const ROUTES = ['/register', '/login', '/auth/otp', '/legal/privacy', '/legal/terms'];

/** Runs against each viewport project (375, 360, 768, 1440) defined in playwright.config.ts. */
test.describe('PUB-06 — no horizontal scroll', () => {
  for (const path of ROUTES) {
    test(`no horizontal scroll on ${path}`, async ({ page }) => {
      await page.goto(path);
      const body = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      // Allow 1px rounding tolerance
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth + 1);
    });
  }
});
