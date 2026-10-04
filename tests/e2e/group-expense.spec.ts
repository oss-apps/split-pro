import { expect, test } from './fixtures';

test('creates a group through the UI', async ({ page, uniqueName, scenario, db }) => {
  await page.goto('/en/groups');
  await page.getByRole('button', { name: 'Create a group', exact: true }).click();
  await page.getByPlaceholder(/group name/i).fill(`${uniqueName} created`);
  await page.getByRole('button', { name: /submit/i }).click();
  await expect(page).toHaveURL(/\/groups\/\d+$/);
  await expect(page.getByText(`${uniqueName} created`, { exact: true })).toBeVisible();
  expect(
    await db.group.findFirst({
      where: { userId: scenario.owner.id, name: `${uniqueName} created` },
    }),
  ).toMatchObject({ userId: scenario.owner.id });
});

test('records a two-member expense with exact persisted shares and debt', async ({
  page,
  scenario,
  uniqueName,
  db,
}) => {
  await page.goto(`/en/add?groupId=${scenario.group.id}`);
  await page.getByPlaceholder(/description/i).fill(`${uniqueName} expense`);
  await page.getByPlaceholder(/amount/i).fill('12.34');
  await page
    .getByRole('button', { name: /^save$/i })
    .last()
    .click();
  await expect(page).toHaveURL(/\/groups\/\d+\/expenses\//);
  await expect(page.getByText(`${uniqueName} expense`, { exact: true })).toBeVisible();
  const expense = await db.expense.findFirstOrThrow({
    where: { groupId: scenario.group.id },
    include: { expenseParticipants: true },
  });
  expect(expense.amount).toBe(1234n);
  expect(expense.expenseParticipants).toHaveLength(2);
  expect(expense.expenseParticipants).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ userId: scenario.owner.id, amount: 617n }),
      expect.objectContaining({ userId: scenario.member.id, amount: -617n }),
    ]),
  );
  expect(
    await db.balanceView.findFirst({
      where: { groupId: scenario.group.id, userId: scenario.owner.id },
    }),
  ).toMatchObject({ amount: 617n, currency: 'USD' });
});
