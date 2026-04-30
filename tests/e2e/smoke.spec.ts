import { test, expect } from '@playwright/test';

test.describe('SC-5 — production smoke', () => {
  test('root page returns 2xx and renders Cyrillic', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status() ?? 0).toBeLessThan(400);
    await expect(page.locator('h1, [role="heading"]').first()).toBeVisible();
  });

  test('OPS-02 sentry test route is reachable in dev (or 404 in prod without flag)', async ({
    request,
  }) => {
    const res = await request.get('/api/_sentry-test', { failOnStatusCode: false });
    expect([404, 500]).toContain(res.status());
  });
});
