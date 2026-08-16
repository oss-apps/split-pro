import { test, expect } from './fixtures';

test('redirects unauthenticated visitors to sign in', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/groups');
  await expect(page).toHaveURL(/\/auth\/signin/);
  await context.close();
});

test('keeps authenticated users on protected pages', async ({ page }) => {
  await page.goto('/groups');
  await expect(page).not.toHaveURL(/\/auth\/signin/);
  await expect(page.getByRole('main')).toBeVisible();
});
