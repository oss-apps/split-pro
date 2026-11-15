import { expect, test } from './fixtures';

test('keeps duplicate decimal input invalid until corrected', async ({
  page,
  scenario,
  uniqueName,
  db,
}) => {
  await page.goto(`/en/add?groupId=${scenario.group.id}`);
  await page.getByPlaceholder(/description/i).fill(`${uniqueName} expression validation`);

  const amountInput = page.getByPlaceholder(/amount/i);
  const saveButton = page.getByRole('button', { name: 'Save', exact: true }).last();
  await amountInput.focus();
  await page.keyboard.type('1.2.3');
  await expect(amountInput).toHaveValue('1.2.3');
  await expect(saveButton).toBeDisabled();

  await page.keyboard.type('+4');
  await expect(amountInput).toHaveValue('1.2.3+4');
  await expect(saveButton).toBeDisabled();

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText('1.2.3+4'));
  await amountInput.fill('');
  await amountInput.focus();
  await page.keyboard.press('Control+V');
  await expect(amountInput).toHaveValue('1.2.3+4');
  await expect(saveButton).toBeDisabled();

  await amountInput.fill('1.23+4');
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(page).toHaveURL(/\/groups\/\d+\/expenses\//);

  const expense = await db.expense.findFirstOrThrow({ where: { groupId: scenario.group.id } });
  expect(expense.amount).toBe(523n);
});

test('recalculates participant splits when changing currency on an expression', async ({
  page,
  scenario,
  uniqueName,
  db,
}) => {
  await page.goto(`/en/add?groupId=${scenario.group.id}`);
  await page.getByPlaceholder(/description/i).fill(`${uniqueName} expression currency`);
  await page.getByPlaceholder(/amount/i).fill('100+50');

  await page.getByRole('button', { name: 'USD', exact: true }).click();
  await page.getByPlaceholder('Select currency').fill('JPY');
  await page.getByText('JPY', { exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).last().click();
  await expect(page).toHaveURL(/\/groups\/\d+\/expenses\//);

  const expense = await db.expense.findFirstOrThrow({
    where: { groupId: scenario.group.id },
    include: { expenseParticipants: true },
  });
  expect(expense.currency).toBe('JPY');
  expect(expense.amount).toBe(150n);
  expect(expense.expenseParticipants).toHaveLength(2);
  expect(expense.expenseParticipants).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ amount: 75n }),
      expect.objectContaining({ amount: -75n }),
    ]),
  );
});
