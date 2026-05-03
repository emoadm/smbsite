import { test, expect } from '@playwright/test';

/**
 * Phase 2 PUB-01..04 E2E coverage.
 *
 * PUB-01: visitor sees landing with text + (image or video)
 * PUB-02: landing fully static / CDN-cached (Cache-Control: s-maxage=3600)
 * PUB-03: visitor can navigate between agitation pages
 * PUB-04: "join community" CTA visible on every public page
 */
test.describe('Public surface — PUB-01..04', () => {
  test('PUB-01: landing has h1 + hero image (or video)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toBeVisible();
    // Hero section has a background <img> from next/image OR a <video>
    const heroMedia = page
      .locator('section img[src*="hero"], section img[src*="_next/image"], section video')
      .first();
    await expect(heroMedia).toBeAttached({ timeout: 8000 });
  });

  test('PUB-02: landing emits Cache-Control with s-maxage=3600', async ({ request }) => {
    const res = await request.get('/');
    expect(res.status()).toBeLessThan(400);
    const cc = (res.headers()['cache-control'] ?? '').toLowerCase();
    expect(cc).toMatch(/s-maxage=3600/);
  });

  test('PUB-03: navigation between /, /agenda, /faq works via header/footer links', async ({
    page,
  }) => {
    await page.goto('/');
    // Footer "Платформа" column or hero secondary CTA navigates to /agenda
    const agendaLink = page.getByRole('link', { name: /^Програма$/ }).first();
    await expect(agendaLink).toBeVisible();
    await agendaLink.click();
    await expect(page).toHaveURL(/\/agenda$/);

    await page.goto('/');
    const faqLink = page
      .getByRole('link', { name: /(Въпроси|Често задавани въпроси)/i })
      .first();
    await expect(faqLink).toBeVisible();
    await faqLink.click();
    await expect(page).toHaveURL(/\/faq$/);
  });

  test('PUB-04: register CTA visible on /, /agenda, /faq', async ({ page }) => {
    for (const path of ['/', '/agenda', '/faq']) {
      await page.goto(path);
      // CTA can be "Регистрирай се", "Регистрирай се за общността", "Присъедини се",
      // or "Регистрация" link
      const cta = page
        .getByRole('link', { name: /(регистрирай се|присъедини се|регистрация)/i })
        .first();
      await expect(cta).toBeVisible({ timeout: 5000 });
    }
  });
});
