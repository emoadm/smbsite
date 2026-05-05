import { test, expect } from '@playwright/test';

// Phase 5 NOTIF-01 / NOTIF-03 / UI-SPEC §5.1 — member preferences flow.
//
// Plan 05-11 / Wave 4 — un-skipped from the Plan 05-08 scaffold.
//
// Required environment variables:
//   E2E_MEMBER_EMAIL   — verified user email (email_verified=true in DB)
//   TEST_OTP_SINK      — path to JSON file the dev-mode OTP queue stub writes
//                        to (set by Phase 1 plan 1.10). When set, the test
//                        completes the OTP login round-trip end-to-end.
//   PLAYWRIGHT_BASE_URL — typically http://localhost:3000 (default).
//
// If TEST_OTP_SINK is unset, the test cannot complete the login → /member
// transition (no way to read the OTP from the server). Plan 05-11 verify
// gate disallows the conditional in-body skip pattern; the test instead
// fails loudly when env vars are missing. To run end-to-end locally:
//
//   pnpm dev  &
//   TEST_OTP_SINK=/tmp/otp-sink.json E2E_MEMBER_EMAIL=mem@example.invalid \
//     pnpm test:e2e tests/e2e/newsletter-preferences.spec.ts
//
// Selectors lean on the Bulgarian topic labels from
// messages/bg.json → member.preferences.topics.*.label and the Switch
// rendered by src/components/preferences/NewsletterToggleRow.tsx.

const memberEmail = process.env.E2E_MEMBER_EMAIL;
const otpSinkPath = process.env.TEST_OTP_SINK;

const TOPIC_LABELS = [
  'Общи обявявания',
  'Нови гласувания',
  'Отчети по инициативи',
  'Покани за събития',
] as const;

async function loginViaOtpSink(page: import('@playwright/test').Page) {
  const fs = await import('node:fs/promises');
  // Clear any stale entries
  try {
    await fs.unlink(otpSinkPath!);
  } catch {
    /* ok if file did not exist */
  }
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(memberEmail!);
  await page.getByRole('button', { name: /Изпрати код за вход/ }).click();
  await expect(page).toHaveURL(/\/auth\/otp/, { timeout: 10_000 });

  // Poll the sink for up to 5 seconds — the queue stub (plan 1.10) writes
  // the OTP synchronously enough that this rarely needs more than 1s.
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
      /* sink not yet written */
    }
    await page.waitForTimeout(150);
  }
  expect(job, `OTP for ${memberEmail} not found in sink ${otpSinkPath}`).toBeTruthy();
  await page.locator('input[name="code"]').fill(job!.otpCode);
  await expect(page).toHaveURL(/\/member/, { timeout: 10_000 });
}

test.describe('Phase 5 — /member/preferences page', () => {
  test('member toggles each newsletter topic + preference persists across reload', async ({
    page,
  }) => {
    expect(memberEmail, 'E2E_MEMBER_EMAIL must be set').toBeTruthy();
    expect(
      otpSinkPath,
      'TEST_OTP_SINK must be set (path to dev-queue OTP sink — plan 1.10). ' +
        'Run `pnpm dev` with TEST_OTP_SINK exported and re-run this spec.',
    ).toBeTruthy();

    await loginViaOtpSink(page);

    await page.goto('/member/preferences');
    await expect(page.locator('h1')).toHaveText(/Предпочитания/);

    // Read current state of each topic switch — toggle each OFF, then verify
    // persistence after reload. Optimistic UI flips the switch immediately;
    // the toast confirms server-side persistence.
    for (const label of TOPIC_LABELS) {
      const row = page.getByText(label, { exact: true }).first().locator('xpath=ancestor::div[1]');
      const sw = row.getByRole('switch');
      // If currently checked, click to turn off; otherwise click twice (off→on→off
      // would re-test the toggle path, but we only need one observation per row).
      const initiallyChecked = (await sw.getAttribute('aria-checked')) === 'true';
      if (initiallyChecked) {
        await sw.click();
        await expect(page.getByText('Записано').first()).toBeVisible({
          timeout: 5_000,
        });
      }
    }

    // Reload and verify all 4 are off.
    await page.reload();
    for (const label of TOPIC_LABELS) {
      const row = page.getByText(label, { exact: true }).first().locator('xpath=ancestor::div[1]');
      await expect(row.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    }

    // Toggle the first topic back ON, reload, verify persisted ON state.
    const firstRow = page
      .getByText(TOPIC_LABELS[0], { exact: true })
      .first()
      .locator('xpath=ancestor::div[1]');
    await firstRow.getByRole('switch').click();
    await expect(page.getByText('Записано').first()).toBeVisible({ timeout: 5_000 });
    await page.reload();
    await expect(firstRow.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });
});
