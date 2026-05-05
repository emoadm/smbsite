import { test, expect } from '@playwright/test';

// Phase 5 NOTIF-09 / UI-SPEC §5.4 — newsletter composer admin flow.
//
// Plan 05-11 / Wave 4 — un-skipped from the Plan 05-07 scaffold.
//
// Required environment variables (read from .env.test or shell):
//   E2E_EDITOR_EMAIL     — Payload admin_users.email with role=editor or admin
//   E2E_EDITOR_PASSWORD  — that admin's password
//   PLAYWRIGHT_BASE_URL  — typically http://localhost:3000 (default) or
//                          https://chastnik.eu for prod-equivalent runs.
//
// If E2E_EDITOR_EMAIL / E2E_EDITOR_PASSWORD are unset, the test fails
// loudly at the login step with a clear "missing credential" error rather
// than silently skipping. This is intentional — Plan 05-11 verify gate
// prohibits skipping the suite via the conditional in-body skip pattern.
//
// Selectors are written against Payload 3.84's admin UI + the custom
// NewsletterComposer component (src/components/payload/NewsletterComposer.tsx)
// + the bg.json admin.newsletters keys (Plan 05-03). If Payload's admin DOM
// changes upstream, expect minor selector drift; iterate per the plan note
// at 05-11 line 215.

const editorEmail = process.env.E2E_EDITOR_EMAIL;
const editorPassword = process.env.E2E_EDITOR_PASSWORD;

test.describe('Phase 5 — newsletter composer (NOTIF-09)', () => {
  test('editor can compose, send test, then send blast (full flow)', async ({ page }) => {
    // Hard precondition — fail loudly if env not configured rather than skip.
    expect(
      editorEmail,
      'E2E_EDITOR_EMAIL must be set (Payload editor/admin user email)',
    ).toBeTruthy();
    expect(
      editorPassword,
      'E2E_EDITOR_PASSWORD must be set (that admin user password)',
    ).toBeTruthy();

    // 1. Log in via Payload admin (default password-based form at /admin/login).
    await page.goto('/admin/login');
    // Payload's login form has explicit email + password inputs with name attrs.
    await page.locator('input[name="email"]').fill(editorEmail!);
    await page.locator('input[name="password"]').fill(editorPassword!);
    await page.getByRole('button', { name: /Login|Вход/i }).click();
    // After successful login Payload routes to /admin (or /admin/collections/...).
    await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 15_000 });

    // 2. Navigate directly to the newsletters create page.
    await page.goto('/admin/collections/newsletters/create');

    // 3. Fill subject + previewText — Payload renders <input> with name attrs
    //    matching the field key in src/collections/Newsletters.ts.
    const subject = `Тестов бюлетин — Phase 5 e2e ${Date.now()}`;
    await page.locator('input[name="subject"]').fill(subject);
    await page.locator('input[name="previewText"]').fill('Кратък преглед на тестовия бюлетин');

    // 4. Topic select. Payload's default select uses a custom listbox; click
    //    the field to open + click the option by visible label.
    //    The visible label "Тема на бюлетина" comes from bg.json
    //    admin.newsletters.fields.topic.label.
    const topicCombobox = page.getByRole('combobox', { name: /Тема на бюлетина|topic/i }).first();
    await topicCombobox.click();
    await page.getByRole('option', { name: 'Общи обявявания' }).click();

    // 5. Lexical RTE — focus the contenteditable + type Bulgarian + Cyrillic.
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await editor.type('Здравейте, това е тестов бюлетин с кирилица: Ж Щ Ъ Ю Я ѝ');

    // 6. Save the draft. Payload's Save button is rendered with text "Save"
    //    (English admin) or via i18n; cover both with a regex.
    await page
      .getByRole('button', { name: /^(Save|Запази|Save Draft|Запази черновата)$/i })
      .first()
      .click();
    // Payload shows a "Saved successfully" toast / status row; allow either
    // English or the en-default Payload string since the admin UI itself is
    // not translated by next-intl (only our custom field components are).
    await expect(page.getByText(/saved successfully|saved|записано/i).first()).toBeVisible({
      timeout: 10_000,
    });

    // 7. Send Blast must be DISABLED (no test sent yet — gate state "never").
    const sendBlastBtn = page.getByRole('button', {
      name: /Изпрати рекламата|Планирай изпращане/,
    });
    await expect(sendBlastBtn).toBeDisabled();

    // 8. Click "Изпрати тестово писмо до мен" (Plan 05-03 bg key
    //    admin.newsletters.actions.sendTest).
    await page.getByRole('button', { name: /Изпрати тестово писмо до мен/ }).click();
    // Sonner toast carries the success copy "Тестовото писмо е изпратено до {email}".
    await expect(page.getByText(/Тестовото писмо е изпратено/)).toBeVisible({
      timeout: 15_000,
    });

    // 9. Reload to refresh the lastTestSentAt prop on SendBlastButton; the
    //    composer's gate logic (computeGate) flips from 'never' to 'recent'.
    await page.reload();

    // 10. Send Blast must now be ENABLED.
    await expect(
      page.getByRole('button', {
        name: /Изпрати рекламата|Планирай изпращане/,
      }),
    ).toBeEnabled({ timeout: 10_000 });

    // 11. Click Send Blast → expect post-send Dialog
    //     (admin.newsletters.postSend.title === "Бюлетинът е поставен в опашката").
    await page.getByRole('button', { name: /Изпрати рекламата|Планирай изпращане/ }).click();
    await expect(page.getByText(/Бюлетинът е поставен в опашката/)).toBeVisible({
      timeout: 10_000,
    });
  });
});
