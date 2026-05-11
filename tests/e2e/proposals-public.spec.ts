import { test, expect } from '@playwright/test';

test.describe('PROP-04 + D-C1 — public proposals page', () => {
  test('renders H1, voting-soon notice, and never leaks submitter PII', async ({ page }) => {
    await page.goto('/predlozheniya');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Предложения от общността');
    await expect(page.getByText('Гласуването по предложенията предстои')).toBeVisible();

    // D-C1 anonymity audit — scope to <main> so the Footer's `mailto:contact@example.invalid`
    // placeholder (Footer.tsx:124) doesn't trigger a false positive. (Triage 260511-15o #7.)
    const mainHtml = await page.locator('main').innerHTML();
    expect(mainHtml).not.toMatch(/[a-z0-9]+@[a-z0-9]+\.[a-z]+/i); // no email-like string in proposals region
  });

  test('canonical byline appears when at least one proposal exists', async ({ page }) => {
    await page.goto('/predlozheniya');
    const cards = await page.locator('article, [class*="rounded-xl"]').count();
    if (cards > 0) {
      await expect(page.getByText('Член на коалицията').first()).toBeVisible();
    }
  });
});
