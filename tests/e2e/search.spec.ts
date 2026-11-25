import { createDatabaseGroup } from '~/tests/helpers/databaseFactories';

import { createDatabaseExpense, expect, expenseInput, test } from './fixtures';

(['activity', 'friend', 'group'] as const).forEach((list) => {
  test(`${list} history can be searched`, async ({ page, scenario, db }) => {
    await Promise.all(
      ['Pizza night', 'Train tickets', 'Groceries'].map((name) =>
        createDatabaseExpense(
          db,
          expenseInput(scenario.owner.id, scenario.member.id, {
            groupId: scenario.group.id,
            name,
          }),
        ),
      ),
    );
    const route =
      'activity' === list
        ? '/en/activity'
        : 'friend' === list
          ? `/en/balances/${scenario.member.id}`
          : `/en/groups/${scenario.group.id}`;
    await page.goto(route);
    const rows = page.locator('a[href*="/expenses/"]');
    await expect(rows).toHaveCount(3);

    const searchBox = page.getByPlaceholder('Search expenses');
    await searchBox.fill('PIZZA');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Pizza night');

    await searchBox.fill('no such expense');
    await expect(page.getByText('No expenses match your search')).toBeVisible();
    await expect(rows).toHaveCount(0);

    await page.getByRole('button', { name: 'Clear search' }).click();
    await expect(searchBox).toHaveValue('');
    await expect(rows).toHaveCount(3);
  });
});

test('a search with no matches keeps the controls in a one-member group', async ({
  page,
  scenario,
  db,
}) => {
  const soloGroup = await createDatabaseGroup(db, scenario.owner.id, [], {
    name: `${scenario.group.name} solo`,
  });
  await createDatabaseExpense(
    db,
    expenseInput(scenario.owner.id, scenario.member.id, {
      groupId: soloGroup.id,
      name: 'Rent',
      participants: [{ userId: scenario.owner.id, amount: 0n }],
    }),
  );
  await page.goto(`/en/groups/${soloGroup.id}`);
  const rows = page.locator('a[href*="/expenses/"]');
  await expect(rows).toHaveCount(1);

  await page.getByPlaceholder('Search expenses').fill('no such expense');
  await expect(page.getByText('No expenses match your search')).toBeVisible();
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(rows).toHaveCount(1);
});
