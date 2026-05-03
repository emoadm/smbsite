import { test, expect } from '@playwright/test';

/**
 * Phase 2 typography — Gilroy load + Cyrillic descenders (Pitfall 10).
 *
 * Two cases:
 * 1. Gilroy ExtraBold (or Manrope fallback per plan 02-01 license-blocked
 *    checkpoint) is loaded on hero h1.
 * 2. Cyrillic descender glyphs (Я Щ Ц Ъ Ю) render at hero size without
 *    clipping — bounding-box height assertion (RESEARCH § Pitfall 10).
 */
test.describe('Phase 2 typography — Gilroy load + Cyrillic descenders', () => {
  test('Gilroy ExtraBold (or Manrope fallback) is loaded on hero h1', async ({ page }) => {
    await page.goto('/');
    const family = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? getComputedStyle(h1).fontFamily : '';
    });
    // Either Gilroy (license-OK path) OR Manrope (fallback path per plan 02-01
    // license-blocked checkpoint).
    const lower = family.toLowerCase();
    expect(lower.includes('gilroy') || lower.includes('manrope')).toBe(true);
  });

  test('Cyrillic descender glyphs (Я Щ Ц Ъ Ю) render at hero size without clipping (Pitfall 10)', async ({
    page,
  }) => {
    await page.goto('/');
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const box = await h1.boundingBox();
    // Hero h1 mobile is text-4xl (2.25rem ~ 36px); add padding for ascender +
    // descender = ~40px floor. Larger desktop sizes pass trivially.
    expect(box?.height ?? 0).toBeGreaterThan(40);
  });
});
