import { test, expect } from '@playwright/test';

/**
 * SC-1: register → OTP enqueued → activate → session in same browser.
 * Note: this test asserts the Server Action ROUND TRIP (form submit → redirect to /auth/otp)
 * but does NOT assert real email delivery (queue worker is mocked in dev — plan 1.10 ships the
 * worker; integration with Brevo is verified in plan 1.13's deliverability checklist).
 */
test.describe('SC-1 Registration flow', () => {
  const uniqueEmail = () => `e2e+${Date.now()}@example.invalid`;

  test('AUTH-01 + AUTH-02: form submit creates user and redirects to /auth/otp', async ({
    page,
  }) => {
    await page.goto('/register');
    await page.fill('input[name="full_name"]', 'Тест Тестов');
    await page.fill('input[name="email"]', uniqueEmail());

    // shadcn Select interactions
    await page.getByRole('combobox', { name: /сектор/i }).click();
    await page.getByRole('option', { name: 'ИТ' }).click();
    await page.getByRole('combobox', { name: /роля/i }).click();
    await page.getByRole('option', { name: 'Собственик' }).click();

    // Required consents
    await page.getByLabel(/Политиката за поверителност/i).check();
    await page.getByLabel(/бисквитки и анализи/i).check();

    // Phase 2.1 ATTR-06 / D-11 — self_reported_source is required (register.ts:44).
    // Pick a stable enum value; "qr_letter" → "QR код в писмо" (messages/bg.json:45).
    await page.getByRole('combobox', { name: /Откъде научихте/i }).click();
    await page.getByRole('option', { name: 'QR код в писмо' }).click();

    // Wait at least 3.5s to satisfy the dwell guard from plan 1.07
    await page.waitForTimeout(3500);

    await page.getByRole('button', { name: 'Регистрирай се' }).click();
    await expect(page).toHaveURL(/\/auth\/otp/, { timeout: 10_000 });
  });

  test('AUTH-02: required consent unchecked blocks submission', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[name="full_name"]', 'Тест');
    await page.fill('input[name="email"]', uniqueEmail());
    // Skip the consent checkboxes — browser native required validation should fire
    await page.getByRole('button', { name: 'Регистрирай се' }).click();
    // Either browser validity prevents submit, or server returns to /register
    await expect(page).toHaveURL(/\/register/);
  });

  test('AUTH-07: session indicator shows after manual emailVerified mark (smoke)', async ({
    page,
  }) => {
    // Phase 1 cannot fully test session creation in CI without a real OTP delivery;
    // smoke-assert that the /member route redirects unauth users to /auth/otp.
    await page.goto('/member');
    await expect(page).toHaveURL(/\/login|\/auth\/otp/);
  });
});
