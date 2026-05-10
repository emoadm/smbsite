import { test, expect } from '@playwright/test';

/**
 * DSA Article 16 — notice-and-action E2E spec.
 *
 * Covers the VALIDATION.md row:
 * "DSA Article 16 reporting form produces acknowledgement + queue row"
 *
 * Anonymous-visitor test runs in CI without a database (static HTML assertion).
 * Logged-in test is skipped until the project's auth fixture lands
 * (expected in Phase 1 Plan 01-09 E2E fixtures).
 */
test.describe('DSA Article 16 — notice-and-action', () => {
  test('anonymous visitor does NOT see the report-content button', async ({ page }) => {
    await page.goto('/predlozheniya');
    // DSA Art.16 requires substantiated notice with reporter contact info.
    // We satisfy this by requiring authentication. Anonymous visitors must
    // NOT see the "Сигнализирай за съдържание" button.
    await expect(
      page.getByRole('button', { name: /Сигнализирай за съдържание/ }),
    ).toHaveCount(0);
  });

  // skipper: requires the project's standard "logged-in member" Playwright fixture.
  // When the fixture exists (likely from Phase 1 plan 01-09 e2e specs), un-skip
  // and adapt: import { loginAsMember } from './fixtures/auth' and call before navigation.
  test.skip(
    'logged-in member can submit a DSA report and see acknowledgement',
    async ({ page }) => {
      // await loginAsMember(page);
      await page.goto('/predlozheniya');

      // Click the first card's report button
      const reportBtn = page
        .getByRole('button', { name: /Сигнализирай за съдържание/ })
        .first();
      await expect(reportBtn).toBeVisible();
      await reportBtn.click();

      // Dialog opens with heading from dsa.report.heading
      await expect(
        page.getByRole('heading', { name: /Сигнализирай за неподходящо съдържание/ }),
      ).toBeVisible();

      // Fill the form
      await page.getByLabel(/Категория на нарушението/).click();
      await page.getByRole('option', { name: /Спам или измама/ }).click();
      await page
        .getByLabel(/Опиши причината за сигнализиране/)
        .fill('Това съдържание е автоматизиран спам без връзка с темата на коалицията.');
      await page.getByLabel(/Потвърждавам, че докладвам добросъвестно/).check();

      // Turnstile test keys auto-pass; wait for widget to resolve.
      await page.waitForTimeout(2000);

      await page.getByRole('button', { name: /Изпрати сигнал/ }).click();

      // Success acknowledgement — locked Art.16 copy from dsa.report.successHeading / successBody
      await expect(
        page.getByRole('heading', { name: /Сигналът ти беше получен/ }),
      ).toBeVisible();
      await expect(page.getByText(/Ще те уведомим за решението/)).toBeVisible();
    },
  );
});
