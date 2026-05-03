import { test, expect } from '@playwright/test';

test.describe('ATTR-06 / D-09 / D-10 — registration source dropdown', () => {
  test('shows the 8 source options and conditional Друго free-text input', async ({ page }) => {
    await page.goto('/register');

    // Fill the prerequisite fields so we can navigate to the source dropdown.
    await page.getByLabel(/Име и фамилия/).fill('Тест Тестов');
    await page.getByLabel(/Имейл/).fill(`attribution-${Date.now()}@example.invalid`);

    // Sector + Role selects (existing fields)
    await page.getByLabel(/Сектор/).click();
    await page.getByRole('option', { name: 'ИТ' }).click();
    await page.getByLabel(/Роля/).click();
    await page.getByRole('option', { name: 'Собственик' }).click();

    // The new source dropdown
    const sourceTrigger = page.getByLabel(/Откъде научихте/);
    await expect(sourceTrigger).toBeVisible();
    await sourceTrigger.click();

    // Assert all 8 D-10 options are present
    for (const label of [
      'QR код в писмо',
      'Имейл от коалицията',
      'Сайт sinyabulgaria.bg',
      'Facebook',
      'LinkedIn',
      'Препоръка от приятел/колега',
      'Новина / медия',
      'Друго',
    ]) {
      await expect(page.getByRole('option', { name: label })).toBeVisible();
    }

    // Pick a non-Други option first; confirm Други input is NOT visible
    await page.getByRole('option', { name: 'QR код в писмо' }).click();
    await expect(page.getByLabel(/Моля, уточнете/)).not.toBeVisible();

    // Re-open dropdown, pick Други; confirm input IS visible
    await sourceTrigger.click();
    await page.getByRole('option', { name: 'Друго' }).click();
    const otherInput = page.getByLabel(/Моля, уточнете/);
    await expect(otherInput).toBeVisible();
    await otherInput.fill('Намерих сайта чрез приятел в LinkedIn');
  });
});
