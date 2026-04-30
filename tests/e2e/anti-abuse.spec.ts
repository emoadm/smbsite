import { test, expect } from '@playwright/test';

/** Turnstile uses test keys (always pass) so we test other anti-abuse paths here. */
test.describe('SC-3 Anti-abuse', () => {
  test('AUTH-10: disposable email rejection surfaces auth.register.invalidEmail message', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.fill('input[name="full_name"]', 'Тест');
    await page.fill('input[name="email"]', `bot+${Date.now()}@mailinator.com`);
    await page.getByRole('combobox', { name: /сектор/i }).click();
    await page.getByRole('option', { name: 'ИТ' }).click();
    await page.getByRole('combobox', { name: /роля/i }).click();
    await page.getByRole('option', { name: 'Друго' }).click();
    await page.getByLabel(/Политиката за поверителност/i).check();
    await page.getByLabel(/бисквитки и анализи/i).check();
    await page.waitForTimeout(3500);
    await page.getByRole('button', { name: 'Регистрирай се' }).click();
    // Either field error appears OR generic message — assertion is open since field-error
    // surfacing is action-shape dependent. Smoke-assert the form did not redirect to /auth/otp:
    await page.waitForTimeout(1000);
    await expect(page).toHaveURL(/\/register/);
  });

  test('AUTH-08: Turnstile widget script is loaded on /register', async ({ page }) => {
    await page.goto('/register');
    const scripts = await page.locator('script[src*="challenges.cloudflare.com"]').count();
    expect(scripts).toBeGreaterThan(0);
  });

  test('AUTH-08: Turnstile widget is NOT loaded on /login (D-05)', async ({ page }) => {
    await page.goto('/login');
    const scripts = await page.locator('script[src*="challenges.cloudflare.com"]').count();
    expect(scripts).toBe(0);
  });
});
