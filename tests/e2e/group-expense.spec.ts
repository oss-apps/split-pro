import { expect, test } from './fixtures';

test('creates an isolated group and records an expense', async ({ page, uniqueName }) => {
  await page.goto('/groups');
  await page.getByRole('button', { name: /^create$/i }).click();
  await page.getByPlaceholder(/group name/i).fill(uniqueName);
  await page.getByRole('button', { name: /submit/i }).click();
  await expect(page.getByText(uniqueName)).toBeVisible();

  await expect(page).toHaveURL(/\/groups\/\d+/);
  const groupId = page.url().match(/\/groups\/(\d+)/)?.[1];
  await page.goto(`/add?groupId=${groupId}`);
  await page.getByPlaceholder(/description/i).fill(`${uniqueName} expense`);
  await page.getByPlaceholder(/amount/i).fill('12.34');
  await page
    .getByRole('button', { name: /^save$/i })
    .last()
    .click();
  await expect(page).toHaveURL(/\/groups\/\d+\/expenses\//);
  await expect(page.getByText(`${uniqueName} expense`)).toBeVisible();
});
