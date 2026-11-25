import { parseEnvBoolean } from '~/utils/env';

import { createDatabaseExpense, expect, expenseInput, test } from './fixtures';

test.use({ timezoneId: 'Asia/Kathmandu' });

test('keeps future expenses visible and applies the configured balance behavior', async ({
  page,
  scenario,
  uniqueName,
  db,
}) => {
  const enabled = parseEnvBoolean(process.env.EXCLUDE_FUTURE_EXPENSES);
  await page.addInitScript(() => {
    localStorage.setItem('notification_dismissed_time', Date.now().toString());
  });
  await page.goto(`/en/groups/${scenario.group.id}`);
  const cutoff = await page.evaluate(() => {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return tomorrow.getTime();
  });
  await createDatabaseExpense(
    db,
    expenseInput(scenario.owner.id, scenario.member.id, {
      groupId: scenario.group.id,
      name: `${uniqueName} current`,
      expenseDate: new Date(cutoff - 1),
    }),
  );
  const future = await createDatabaseExpense(
    db,
    expenseInput(scenario.owner.id, scenario.member.id, {
      groupId: scenario.group.id,
      name: `${uniqueName} scheduled`,
      expenseDate: new Date(cutoff),
    }),
  );
  await page.reload();
  const pending = page.getByRole('link', { name: new RegExp(`${uniqueName} scheduled`) });
  await expect(pending).toBeVisible();
  if (enabled) {
    await expect(pending).toHaveClass(/grayscale/);
    await expect(pending).toHaveCSS('opacity', '0.5');
    await expect(pending).toHaveAttribute('title', 'Future expense — not included in balances yet');
  } else {
    await expect(pending).not.toHaveClass(/grayscale/);
    await expect(pending).not.toHaveAttribute('title');
  }
  const balance = enabled ? 10 : 20;
  await expect(page.getByText(new RegExp(`E2E Member owes you.*\\b${balance}\\b`))).toBeVisible();

  await page.goto('/en/balances');
  await expect(page.getByRole('link', { name: /E2E Member/ })).toContainText(String(balance));
  await page.getByRole('link', { name: /E2E Member/ }).click();
  const friendPending = page.getByRole('link', {
    name: new RegExp(`${uniqueName} scheduled`),
  });
  await expect(friendPending).toBeVisible();
  if (enabled) {
    await expect(friendPending).toHaveClass(/grayscale/);
  } else {
    await expect(friendPending).not.toHaveClass(/grayscale/);
  }
  await friendPending.click();
  await expect(page).toHaveURL(new RegExp(`/expenses/${future.id}$`));
  await expect(page.getByText(`${uniqueName} scheduled`, { exact: true })).toBeVisible();
});
