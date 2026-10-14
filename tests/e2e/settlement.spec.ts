import { SplitType } from '@prisma/client';
import { createDatabaseExpense, expect, expenseInput, test } from './fixtures';

test('partially then fully settles a real debt through the UI', async ({ page, scenario, db }) => {
  await createDatabaseExpense(
    db,
    expenseInput(scenario.member.id, scenario.owner.id, { groupId: scenario.group.id }),
  );
  await page.goto(`/en/balances/${scenario.member.id}`);
  const settle = async (amount: string) => {
    await page.getByRole('button', { name: 'Settle up', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('textbox').fill(amount);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  };
  await settle('4.00');
  await expect
    .poll(
      async () =>
        (
          await db.balanceView.findFirst({
            where: {
              userId: scenario.owner.id,
              groupId: scenario.group.id,
            },
          })
        )?.amount,
    )
    .toBe(-600n);
  await page.reload();
  await expect(page.getByText('$6', { exact: true })).toBeVisible();
  await settle('6.00');
  await expect
    .poll(async () =>
      (
        await db.balanceView.findMany({
          where: {
            groupId: scenario.group.id,
          },
        })
      ).every((balance) => 0n === balance.amount),
    )
    .toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Settle up', exact: true })).toBeDisabled();
  const settlements = await db.expense.findMany({
    where: { groupId: scenario.group.id, splitType: SplitType.SETTLEMENT },
    orderBy: { createdAt: 'asc' },
  });
  expect(settlements.map((expense) => expense.amount)).toEqual([400n, 600n]);
  expect(settlements.every((expense) => expense.paidBy === scenario.owner.id)).toBe(true);
});
