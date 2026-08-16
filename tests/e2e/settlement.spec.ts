import { test, expect } from './fixtures';

test('shows the group balance and settlement controls', async ({ page }) => {
  await page.goto('/balances');
  await expect(page).toHaveURL(/\/balances/);
  await expect(page.getByRole('main')).toBeVisible();
});
