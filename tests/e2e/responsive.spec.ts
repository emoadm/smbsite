import { test } from '@playwright/test';

test.describe('PUB-06 — responsive layout (D-28 viewport matrix)', () => {
  test.fixme('register form usable at 360px (Samsung A)', async ({ page }) => {
    // Implement in plan 1.09
    await page.goto('/register');
  });
  test.fixme('register form usable at 375px (iPhone SE)', async ({ page }) => {
    // Implement in plan 1.09
    await page.goto('/register');
  });
  test.fixme('register form usable at 768px (iPad)', async ({ page }) => {
    // Implement in plan 1.09
    await page.goto('/register');
  });
  test.fixme('register form usable at 1440px (desktop)', async ({ page }) => {
    // Implement in plan 1.09
    await page.goto('/register');
  });
});
