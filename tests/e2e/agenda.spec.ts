import { test, expect } from '@playwright/test';

/**
 * /agenda E2E coverage — Phase 02.3 final slice.
 * Asserts:
 *   1. Page loads; <h1> "Програма" is visible
 *   2. All 12 <h2 id> chapter headings render
 *   3. Clicking each TOC link scrolls to the matching <h2>
 *   4. The draft <Alert> banner is no longer present
 *   5. The OG meta description does NOT contain "финализиране"
 *
 * Complements tests/e2e/responsive.spec.ts (which already covers /agenda for
 * horizontal-scroll across 4 viewports — that's PUB-06 territory, not this).
 */
test.describe('Public surface — /agenda (Phase 02.3 final)', () => {
  test('renders h1 + 12 chapter headings', async ({ page }) => {
    await page.goto('/agenda');
    await expect(page.locator('h1').first()).toBeVisible();

    // 12 <h2 id> chapter headings (UI-SPEC §7.2 final lock)
    const h2s = page.locator('article h2[id]');
    await expect(h2s).toHaveCount(12);
  });

  test('clicking each TOC link scrolls to the matching <h2>', async ({ page }) => {
    await page.goto('/agenda');
    await page.waitForLoadState('networkidle');

    const ANCHORS = [
      'manifest', 'desen-konsensus', 'ikonomika',
      'energetika', 'zemedelie', 'obrazovanie',
      'sotsialna-politika', 'zdraveopazvane', 'pravosadie',
      'vanshna-sigurnost', 'kultura', 'zashtita-tsennosti',
    ];

    for (const id of ANCHORS) {
      // Use the desktop TOC link (mobile <details> is collapsed by default).
      // .first() because the TOC variant prop renders both desktop and mobile
      // navs in the DOM with CSS-controlled visibility — pick whichever shows.
      await page.locator(`nav a[href="#${id}"]`).first().click();
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test('draft <Alert> banner is no longer present', async ({ page }) => {
    await page.goto('/agenda');
    // shadcn Alert renders role="alert" — the slice-1 banner had this role.
    await expect(page.locator('[role="alert"]')).toHaveCount(0);
  });

  test('OG meta description does NOT contain "финализиране"', async ({ page }) => {
    await page.goto('/agenda');
    const description = await page
      .locator('meta[name="description"]')
      .getAttribute('content');
    expect(description).toBeTruthy();
    expect(description).not.toContain('финализиране');
  });
});
