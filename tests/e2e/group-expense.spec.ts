import { test, expect } from './fixtures';

test('creates an isolated group and records an expense', async ({ page, uniqueName }) => {
  await page.goto('/groups');
  await page.getByRole('button', { name: /create group/i }).click();
  await page.getByPlaceholder(/group name/i).fill(uniqueName);
  await page.getByRole('button', { name: /submit/i }).click();
  await expect(page.getByText(uniqueName)).toBeVisible();

  await page.getByRole('link', { name: /add expense/i }).click();
  await page.getByPlaceholder(/description/i).fill(`${uniqueName} expense`);
  await page.getByPlaceholder(/amount/i).fill('12.34');
  await page.getByRole('button', { name: /^save$/i }).last().click();
  await expect(page).toHaveURL(/\/groups\/\d+\/expenses\//);
  await expect(page.getByText(`${uniqueName} expense`)).toBeVisible();
});
