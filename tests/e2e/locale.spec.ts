import { expect, test } from './fixtures';

test('switches and persists the locale through the compiled language selector', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/en/home');
  await page.getByRole('button', { name: /English/ }).click();
  await page.getByRole('button', { name: 'Français', exact: true }).click();

  await expect(page).toHaveURL(/\/fr\/home$/);
  await expect(page.getByRole('button', { name: /Français/ })).toHaveCount(1);
  expect(await page.context().cookies()).toEqual(
    expect.arrayContaining([expect.objectContaining({ name: 'NEXT_LOCALE', value: 'fr' })]),
  );

  await page.reload();
  await expect(page.getByRole('button', { name: /Français/ })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
