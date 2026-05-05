import { test } from '@playwright/test';

// Phase 5 NOTIF-09 / UI-SPEC §5.4 — newsletter composer admin flow.
// Note: requires editor login fixture + a seeded admin user in the test DB.
// Full e2e is gated by Wave 3 schema push; un-skipped in Plan 05-11.

test.describe('Phase 5 — newsletter composer (NOTIF-09)', () => {
  test.skip('editor can compose, send test, then send blast (full flow)', async () => {
    // 1. Log in as editor (reuse Phase 02.1 fixture if available).
    // 2. Navigate to /admin/collections/newsletters/create.
    // 3. Fill subject/preview/topic.
    // 4. Type into the Lexical RTE.
    // 5. Wait for live preview iframe to render (debounce 500ms).
    // 6. Verify Send Blast button is disabled with tooltip.
    // 7. Click "Изпрати тестово писмо до мен"; wait for Sonner success toast.
    // 8. Wait for status to show that lastTestSentAt is set.
    // 9. Verify Send Blast button is now enabled.
    // 10. Click "Изпрати рекламата"; verify post-send Dialog.
  });
});
