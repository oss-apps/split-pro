import { expect, test } from './fixtures';

test('redirects unauthenticated visitors to sign in', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  try {
    const page = await context.newPage();
    await page.goto('/en/balances');
    await expect(page).toHaveURL(/\/auth\/signin/);
  } finally {
    await context.close();
  }
});

test('renders authenticated protected content from the isolated scenario', async ({
  page,
  scenario,
}) => {
  await page.goto('/en/groups');
  await expect(page.getByText(scenario.group.name, { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create a group', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/groups$/);
});
