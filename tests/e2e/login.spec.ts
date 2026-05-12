import { test, expect } from '@playwright/test';

test.describe('SC-2 Login flow', () => {
  test('AUTH-04: unverified user cannot reach /member', async ({ page }) => {
    await page.goto('/member');
    await expect(page).toHaveURL(/\/login|\/auth\/otp/);
  });

  test('AUTH-05: login form posts to requestOtp and redirects to /auth/otp', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'someone@example.invalid');
    await page.getByRole('button', { name: 'Изпрати код за вход' }).click();
    await expect(page).toHaveURL(/\/auth\/otp/, { timeout: 10_000 });
  });

  test('AUTH-06: logout button is visible in header when session present (smoke)', async ({
    page,
  }) => {
    // Phase 2 replaced the Phase 1 `/` redirect with a real landing page. Anonymous
    // visitors stay on `/`; the Header's "Вход" link still indicates logged-out state.
    // (Triage 260511-15o #6.)
    await page.goto('/');
    const loginLink = page.getByRole('link', { name: 'Вход' });
    await expect(loginLink).toBeVisible();
  });

  test('AUTH-05 + AUTH-07 [@needs-test-sink]: full OTP login → /member content visible (H-3)', async ({
    page,
  }) => {
    // H-3 fix: this asserts session establishment end-to-end (plan 1.07 verify-otp now writes
    // the session row + cookie directly — see plan 1.07 Task 1.07.3 Step 2). The spec is gated
    // by the TEST_OTP_SINK env var: when set, plan 1.10's queue stub appends the plaintext OTP
    // to a JSON file the test reads here. Without the sink, the spec is skipped (CI without
    // sink still runs the rest of login.spec.ts smoke checks).
    test.skip(
      !process.env.TEST_OTP_SINK,
      'requires TEST_OTP_SINK=/tmp/otp-sink.json (plan 1.10 stub honors it in dev/test)',
    );
    const fs = await import('node:fs/promises');
    const sinkPath = process.env.TEST_OTP_SINK!;
    try {
      await fs.unlink(sinkPath);
    } catch {
      /* ok */
    }
    const email = `e2e+${Date.now()}@example.invalid`;
    // Step 1: register
    await page.goto('/register');
    await page.fill('input[name="full_name"]', 'Сесия Тест');
    await page.fill('input[name="email"]', email);
    await page.getByRole('combobox', { name: /сектор/i }).click();
    await page.getByRole('option', { name: 'ИТ' }).click();
    await page.getByRole('combobox', { name: /роля/i }).click();
    await page.getByRole('option', { name: 'Друго' }).click();
    await page.getByLabel(/Политиката за поверителност/i).check();
    await page.getByLabel(/бисквитки и анализи/i).check();
    await page.waitForTimeout(3500);
    await page.getByRole('button', { name: 'Регистрирай се' }).click();
    await expect(page).toHaveURL(/\/auth\/otp/);
    // Step 2: read the OTP from the sink
    const sink = JSON.parse(await fs.readFile(sinkPath, 'utf8')) as Array<{
      to: string;
      otpCode: string;
      kind: string;
    }>;
    const job = sink.find((j) => j.to === email);
    expect(job, 'register-otp job appeared in sink').toBeTruthy();
    // Step 3: submit it via the OTP form and assert /member shows the placeholder heading
    await page.locator('input[name="code"]').fill(job!.otpCode);
    await expect(page).toHaveURL(/\/member/);
    await expect(page.getByText(/Добре дошли в платформата/)).toBeVisible();
    // Step 4: refresh and verify session persists (AUTH-07)
    await page.reload();
    await expect(page).toHaveURL(/\/member/);
  });
});
