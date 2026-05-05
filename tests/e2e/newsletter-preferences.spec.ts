import { test } from '@playwright/test';

// Phase 5 NOTIF-01 / NOTIF-03 / UI-SPEC §5.1 — member preferences flow.

test.describe('Phase 5 — /member/preferences page', () => {
  test.skip('member toggles each newsletter topic + preference persists across reload', async () => {
    // Reuse Phase 1 / Phase 02.1 e2e login fixture (member role, email_verified).
    // 1. Log in as member → land on /member.
    // 2. Click "Настройки" card → navigate to /member/preferences.
    // 3. Verify 4 Switch rows visible with labels: Общи обявявания / Нови гласувания /
    //    Отчети по инициативи / Покани за събития.
    // 4. Toggle each switch off; verify Sonner toast "Записано".
    // 5. Reload page; verify all 4 toggles are off (state persisted via append-only consents row).
    // 6. Click PreferredChannelRadio "telegram"; verify toast.
    // 7. Reload; verify radio is on telegram.
    // 8. Verify language radio is checked on bg + disabled.
    // 9. Verify "Виж общностните канали" link navigates to /community.
    // 10. Verify "Назад към профила" link navigates back to /member.
  });
});
