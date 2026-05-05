import { test, expect } from '@playwright/test';

// Phase 5 NOTIF-04 / NOTIF-05 / D-11 / UI-SPEC §5.2 — /community page variants.
//
// Plan 05-11 / Wave 4 — un-skipped from the Plan 05-09 scaffold.
//
// Three test groups:
//   1. Anonymous visitor sees teaser cards (or placeholders if both
//      *Visible flags are false). Never the raw external URL.
//   2. Authenticated member sees real external URLs when channels are
//      visible. Requires E2E_MEMBER_EMAIL + TEST_OTP_SINK and an editor
//      having pre-seeded /admin/globals/community-channels with valid
//      URLs + Visible=true. The plan acknowledges this seeding may be
//      manual (see plan 05-11 line 263) and documents it in
//      05-MANUAL-VERIFICATION.md.
//   3. Heading hierarchy — exactly 1 h1 + 1 h2; cards are h3.
//
// Hard preconditions (no in-body skip — plan verify gate prohibits it).

const memberEmail = process.env.E2E_MEMBER_EMAIL;
const otpSinkPath = process.env.TEST_OTP_SINK;

async function loginViaOtpSink(page: import('@playwright/test').Page) {
  const fs = await import('node:fs/promises');
  try {
    await fs.unlink(otpSinkPath!);
  } catch {
    /* ok */
  }
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(memberEmail!);
  await page.getByRole('button', { name: /Изпрати код за вход/ }).click();
  await expect(page).toHaveURL(/\/auth\/otp/, { timeout: 10_000 });

  let job: { to: string; otpCode: string; kind: string } | undefined;
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    try {
      const sink = JSON.parse(await fs.readFile(otpSinkPath!, 'utf8')) as Array<{
        to: string;
        otpCode: string;
        kind: string;
      }>;
      job = sink.find((j) => j.to === memberEmail);
      if (job) break;
    } catch {
      /* not yet */
    }
    await page.waitForTimeout(150);
  }
  expect(job, `OTP for ${memberEmail} not found in sink`).toBeTruthy();
  await page.locator('input[name="code"]').fill(job!.otpCode);
  await expect(page).toHaveURL(/\/member/, { timeout: 10_000 });
}

test.describe('Phase 5 — /community page (preview-vs-redeem)', () => {
  test('anonymous visitor sees teaser cards with /register CTA — never the raw URL', async ({
    page,
    context,
  }) => {
    // Ensure no session cookie carries over.
    await context.clearCookies();
    await page.goto('/community');

    const html = await page.content();
    // Raw external URLs MUST NOT appear in HTML for the anonymous variant
    // (Plan 05-09 invariant; ChannelCard variant === 'teaser' uses
    // /register?next=/community as the CTA href).
    expect(html).not.toMatch(/whatsapp\.com\/channel\//);
    expect(html).not.toMatch(/t\.me\//);

    // The page renders three possible variants depending on the Global state:
    //   - both *Visible=true: 2 teaser CTAs visible, both pointing to /register
    //   - one *Visible=false: 1 teaser + 1 placeholder
    //   - both invisible: 1 placeholder card (no CTA)
    // Whatever the configured state, every visible CTA must link to /register.
    const teaserCtas = page.getByTestId('channel-cta-teaser');
    const teaserCount = await teaserCtas.count();
    for (let i = 0; i < teaserCount; i++) {
      const href = await teaserCtas.nth(i).getAttribute('href');
      expect(href).toBe('/register?next=/community');
    }
  });

  test('authenticated member sees real external URLs (when channels visible)', async ({ page }) => {
    expect(memberEmail, 'E2E_MEMBER_EMAIL must be set').toBeTruthy();
    expect(otpSinkPath, 'TEST_OTP_SINK must be set (plan 1.10 dev-queue stub).').toBeTruthy();

    // PRECONDITION: an editor or admin has set CommunityChannels Global with
    // valid URLs + Visible=true. Plan 05-11 documents this as a manual step
    // (see 05-MANUAL-VERIFICATION.md §2 — Coalition Global swap rehearsal).
    // If the Global is invisible, this test will see redeem CTAs missing and
    // fail loudly — that is the correct signal: rehearse the swap first.

    await loginViaOtpSink(page);
    await page.goto('/community');

    // Member-variant CTAs use the testid `channel-cta-redeem` and target
    // external URLs in a new tab.
    const redeemCtas = page.getByTestId('channel-cta-redeem');
    const redeemCount = await redeemCtas.count();
    expect(
      redeemCount,
      'expected at least 1 redeem CTA — ensure CommunityChannels Global has at least one channel with *Visible=true',
    ).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < redeemCount; i++) {
      const cta = redeemCtas.nth(i);
      await expect(cta).toHaveAttribute('target', '_blank');
      await expect(cta).toHaveAttribute('rel', /noopener/);
      const href = await cta.getAttribute('href');
      // CTAs are either the configured WhatsApp Channel URL or Telegram URL.
      expect(href).toMatch(/^https:\/\/(whatsapp\.com\/channel\/|t\.me\/)/);
    }
  });

  test('page renders 1 h1 and 1 h2 (the explainer; card titles are h3)', async ({ page }) => {
    await page.goto('/community');
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h2')).toHaveCount(1);
    // Cards render as h3 (ChannelCard component); count is variant-dependent
    // (1 placeholder, 2 teasers, 2 redeems, or 1 + 1 mixed). Always >= 1.
    const h3Count = await page.locator('h3').count();
    expect(h3Count).toBeGreaterThanOrEqual(1);
  });
});
