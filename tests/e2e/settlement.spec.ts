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
    await dialog.getByRole('textbox').click();
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
  await expect(page.getByRole('button', { name: 'Settle up', exact: true })).toBeEnabled();
  const settlements = await db.expense.findMany({
    where: { groupId: scenario.group.id, splitType: SplitType.SETTLEMENT },
    orderBy: { createdAt: 'asc' },
  });
  expect(settlements.map((expense) => expense.amount)).toEqual([400n, 600n]);
  expect(settlements.every((expense) => expense.paidBy === scenario.owner.id)).toBe(true);
});

test('records a loan and reverses a suggested settlement', async ({
  page,
  scenario,
  db,
}, testInfo) => {
  await page.goto(`/en/groups/${scenario.group.id}`);
  await page.getByRole('tab', { name: 'Balances', exact: true }).click();
  await page.getByRole('button', { name: 'Record transfer with E2E Member', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await dialog.getByRole('textbox', { name: 'Transfer amount' }).click();
  await dialog.getByRole('textbox', { name: 'Transfer amount' }).fill('10.00');
  await dialog.getByRole('textbox', { name: 'Transfer amount' }).blur();
  await page.screenshot({ path: testInfo.outputPath('group-transfer-desktop.png') });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.balanceView.findFirst({
            where: {
              userId: scenario.owner.id,
              friendId: scenario.member.id,
              groupId: scenario.group.id,
            },
          })
        )?.amount,
    )
    .toBe(1000n);
  await page.goto(`/en/balances/${scenario.member.id}`);
  await page.getByRole('button', { name: 'Settle up', exact: true }).click();
  await dialog.getByRole('button', { name: 'Reverse direction' }).click();
  await dialog.getByRole('textbox', { name: 'Transfer amount' }).click();
  await dialog.getByRole('textbox', { name: 'Transfer amount' }).fill('20.00');
  await expect(dialog.getByRole('textbox', { name: 'Transfer amount' })).toHaveValue('20.00');
  await page.screenshot({ path: testInfo.outputPath('transfer-desktop.png') });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.balanceView.findFirst({
            where: {
              userId: scenario.owner.id,
              friendId: scenario.member.id,
              groupId: scenario.group.id,
            },
          })
        )?.amount,
    )
    .toBe(3000n);
  const expenses = await db.expense.findMany({ where: { groupId: scenario.group.id } });
  expect(expenses).toHaveLength(2);
  expect(expenses.every((expense) => SplitType.SETTLEMENT === expense.splitType)).toBe(true);
});

test('records an incoming transfer on mobile with no existing debt', async ({
  page,
  scenario,
  db,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/en/groups/${scenario.group.id}`);
  await page.getByRole('tab', { name: 'Balances', exact: true }).click();
  await page.getByRole('button', { name: 'Record transfer with E2E Member', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Reverse direction' }).click();
  const amount = dialog.getByRole('textbox', { name: 'Transfer amount' });
  await amount.click();
  await amount.fill('10.00');
  await amount.blur();
  await expect(dialog.getByText('E2E Member pays you', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('transfer-mobile.png') });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(
      async () =>
        (
          await db.balanceView.findFirst({
            where: {
              userId: scenario.owner.id,
              friendId: scenario.member.id,
              groupId: scenario.group.id,
            },
          })
        )?.amount,
    )
    .toBe(-1000n);
});

test('keeps the accordion and transfer action independent with three members', async ({
  page,
  scenario,
  db,
}, testInfo) => {
  const other = await db.user.create({
    data: { name: 'E2E Other', email: `other-${scenario.group.id}@example.test`, currency: 'USD' },
  });
  try {
    await db.groupUser.create({ data: { groupId: scenario.group.id, userId: other.id } });
    await createDatabaseExpense(
      db,
      expenseInput(scenario.owner.id, scenario.member.id, { groupId: scenario.group.id }),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/en/groups/${scenario.group.id}`);
    await page.getByRole('tab', { name: 'Balances', exact: true }).click();
    const memberAccordion = page.getByRole('button', { name: /E2E Member.*owes/ });
    await expect(memberAccordion).toBeEnabled();
    await expect(page.getByRole('button', { name: /E2E Other is settled up/ })).toBeDisabled();
    await memberAccordion.click();
    await expect(memberAccordion).toHaveAttribute('aria-expanded', 'true');
    await page.screenshot({
      path: testInfo.outputPath('member-row-actions.png'),
      animations: 'disabled',
    });
    await page
      .getByRole('button', { name: 'Record transfer with E2E Member', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('E2E Member pays you', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('combobox')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Reverse direction' }).click();
    await expect(dialog.getByText('You pay E2E Member', { exact: true })).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('member-transfer.png'),
      animations: 'disabled',
    });
    await dialog.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(memberAccordion).toHaveAttribute('aria-expanded', 'true');
    await page.getByRole('button', { name: 'Record transfer with E2E Other', exact: true }).click();
    await expect(dialog.getByText('You pay E2E Other', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await dialog.getByRole('textbox', { name: 'Transfer amount' }).click();
    await dialog.getByRole('textbox', { name: 'Transfer amount' }).fill('5.00');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect
      .poll(
        async () =>
          (
            await db.balanceView.findFirst({
              where: { groupId: scenario.group.id, userId: scenario.owner.id, friendId: other.id },
            })
          )?.amount,
      )
      .toBe(500n);
  } finally {
    await db.expense.deleteMany({
      where: { groupId: scenario.group.id, expenseParticipants: { some: { userId: other.id } } },
    });
    await db.user.delete({ where: { id: other.id } });
  }
});
