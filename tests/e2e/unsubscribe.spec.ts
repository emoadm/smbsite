import { test, expect } from '@playwright/test';

// Phase 5 NOTIF-03 / D-14 / UI-SPEC §5.3 — /unsubscribed page variants.
//
// All 4 variants render the same RSC page; only the heading + Alert + CTA differ
// based on the ?reason query parameter.
//
// NOTE: Full e2e execution requires a running dev/prod server with:
//   - Next.js app at the configured base URL
//   - next-intl messages/bg.json loaded
//   - No auth required (D-14 — public route)
//
// These tests are scaffolded here and run in Wave 4 (Plan 05-11 UAT).

test.describe('Phase 5 — /unsubscribed page variants', () => {
  test('success variant — no query params', async ({ page }) => {
    await page.goto('/unsubscribed');
    await expect(page.locator('h1')).toHaveText('Отписан си от всички известия');
    await expect(page.getByRole('link', { name: /Размислих си/ })).toHaveAttribute(
      'href',
      '/member/preferences',
    );
    await expect(page.getByRole('link', { name: /WhatsApp и Telegram/ })).toHaveAttribute(
      'href',
      '/community',
    );
    // Alert must NOT be rendered in the success variant
    await expect(page.getByText('Линкът е изтекъл')).toHaveCount(0);
  });

  test('expired variant — ?reason=expired renders Alert', async ({ page }) => {
    await page.goto('/unsubscribed?reason=expired');
    await expect(page.locator('h1')).toHaveText('Отписан си от всички известия');
    await expect(page.getByText('Линкът е изтекъл')).toBeVisible();
    await expect(
      page.getByText('За да управляваш абонаментите си, влез в профила.'),
    ).toBeVisible();
  });

  test('bad-sig variant — invalid heading + login CTA', async ({ page }) => {
    await page.goto('/unsubscribed?reason=bad-sig');
    await expect(page.locator('h1')).toHaveText('Невалиден линк за отписване');
    await expect(page.getByRole('link', { name: /Влез в профила/ })).toHaveAttribute(
      'href',
      '/login?next=/member/preferences',
    );
  });

  test('malformed variant — same UX as bad-sig (invalid token)', async ({ page }) => {
    await page.goto('/unsubscribed?reason=malformed');
    await expect(page.locator('h1')).toHaveText('Невалиден линк за отписване');
  });

  test('exactly one h1 per variant (a11y — UI-SPEC §8)', async ({ page }) => {
    for (const url of [
      '/unsubscribed',
      '/unsubscribed?reason=expired',
      '/unsubscribed?reason=bad-sig',
      '/unsubscribed?reason=malformed',
    ]) {
      await page.goto(url);
      await expect(page.locator('h1')).toHaveCount(1);
    }
  });
});
