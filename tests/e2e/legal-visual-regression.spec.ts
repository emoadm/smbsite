import { test, expect } from '@playwright/test';

/**
 * UI-SPEC review_flag #2 — Phase 1 destructive #E72E4D -> #DC2626 + success
 * #009F54 -> #059669 retune visual regression. The /legal/* draft Alert is
 * the only Phase 1 surface that visibly uses these tokens; verify computed
 * styles after plan 02-01's globals.css retune.
 *
 * Tests 1-2: defense-in-depth render check on /legal/privacy + /legal/terms
 *   (re-covers existing branding.spec.ts draft-marker assertion against the
 *   retuned token stack).
 * Tests 3-5: directly read CSS custom properties via getComputedStyle on
 *   document.documentElement to prove plan 02-01's globals.css writes the
 *   new values. Match accepts both hex (#dc2626) and rgb() (rgb(220, 38, 38))
 *   notation since browser engines vary how they expose --color-* properties
 *   declared as hex.
 */
test.describe('Legal pages — token retune visual regression (review_flag #2)', () => {
  test('legal/privacy renders without color regression on draft Alert', async ({ page }) => {
    await page.goto('/legal/privacy');
    const alert = page.locator('[role="alert"], .bg-card, [class*="alert"]').first();
    await expect(alert).toBeVisible();

    // The draft Alert renders the "проект, последна редакция YYYY-MM-DD" text
    await expect(page.getByText(/проект, последна редакция/)).toBeVisible();
  });

  test('legal/terms renders without color regression on draft Alert', async ({ page }) => {
    await page.goto('/legal/terms');
    const alert = page.locator('[role="alert"], .bg-card, [class*="alert"]').first();
    await expect(alert).toBeVisible();
    await expect(page.getByText(/проект, последна редакция/)).toBeVisible();
  });

  test('--color-destructive is the new value #DC2626 (RGB 220, 38, 38)', async ({ page }) => {
    await page.goto('/');
    const value = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-destructive').trim();
    });
    // Accept either #DC2626 hex notation OR rgb(220, 38, 38) (computed style varies)
    const norm = value.toLowerCase().replace(/\s+/g, '');
    expect(norm).toMatch(/(#dc2626|rgb\(220,38,38\))/);
  });

  test('--color-success is the new value #059669 (RGB 5, 150, 105)', async ({ page }) => {
    await page.goto('/');
    const value = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-success').trim();
    });
    const norm = value.toLowerCase().replace(/\s+/g, '');
    expect(norm).toMatch(/(#059669|rgb\(5,150,105\))/);
  });

  test('--color-primary is the canonical Sinya navy #004A79', async ({ page }) => {
    await page.goto('/');
    const value = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim();
    });
    const norm = value.toLowerCase().replace(/\s+/g, '');
    expect(norm).toMatch(/(#004a79|rgb\(0,74,121\))/);
  });
});
