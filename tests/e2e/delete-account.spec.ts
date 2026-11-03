import { randomUUID } from 'node:crypto';

import { createDatabaseExpense, expect, expenseInput, test } from './fixtures';

test('cancels deletion without changing the account', async ({ page, scenario, db }) => {
  await page.goto('/en/account');
  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('outstanding balances');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(await db.user.findUniqueOrThrow({ where: { id: scenario.owner.id } })).toMatchObject({
    deletedAt: null,
    email: scenario.owner.email,
  });
});

test('deletes the account, revokes other sessions, and preserves history for another member', async ({
  page,
  browser,
  baseURL,
  scenario,
  db,
}) => {
  const expense = await createDatabaseExpense(
    db,
    expenseInput(scenario.owner.id, scenario.member.id, { groupId: scenario.group.id }),
  );
  const balances = await db.balanceView.findMany({ where: { groupId: scenario.group.id } });
  const otherToken = randomUUID();
  const memberToken = randomUUID();
  await db.session.createMany({
    data: [
      {
        userId: scenario.owner.id,
        sessionToken: otherToken,
        expires: new Date(Date.now() + 60_000),
      },
      {
        userId: scenario.member.id,
        sessionToken: memberToken,
        expires: new Date(Date.now() + 60_000),
      },
    ],
  });
  await page.goto('/en/account');
  await page.evaluate(async (email) => {
    const cache = await caches.open('apis');
    await cache.put('/api/trpc/user.me', new Response(JSON.stringify({ email })));
  }, scenario.owner.email);
  expect(await page.evaluate(() => caches.has('apis'))).toBe(true);
  await page.getByRole('button', { name: 'Delete account', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Permanently delete account' })
    .click();
  await expect(page).toHaveURL(/\/auth\/signin/);
  expect(await page.evaluate(() => caches.has('apis'))).toBe(false);
  expect(
    (await page.context().cookies()).some((cookie) => 'next-auth.session-token' === cookie.name),
  ).toBe(false);
  expect(await db.session.count({ where: { userId: scenario.owner.id } })).toBe(0);
  expect(await db.user.findUniqueOrThrow({ where: { id: scenario.owner.id } })).toMatchObject({
    name: 'Deleted user',
    email: null,
    deletedAt: expect.any(Date),
  });
  expect(await db.group.findUniqueOrThrow({ where: { id: scenario.group.id } })).toMatchObject({
    userId: scenario.member.id,
  });
  expect(await db.balanceView.findMany({ where: { groupId: scenario.group.id } })).toEqual(
    balances,
  );

  const memberContext = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    const cookie = {
      name: 'next-auth.session-token',
      domain: new URL(baseURL!).hostname,
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
    };
    await memberContext.addCookies([{ ...cookie, value: otherToken }]);
    const staleSession = await memberContext.request.get(`${baseURL}/api/auth/session`);
    expect(await staleSession.json()).toEqual({});
    // Even an accidentally recreated session for the tombstone cannot authenticate.
    await db.session.create({
      data: {
        userId: scenario.owner.id,
        sessionToken: otherToken,
        expires: new Date(Date.now() + 60_000),
      },
    });
    expect(await (await memberContext.request.get(`${baseURL}/api/auth/session`)).json()).toEqual(
      {},
    );
    await memberContext.addCookies([{ ...cookie, value: memberToken }]);
    const memberPage = await memberContext.newPage();
    await memberPage.goto(`/en/groups/${scenario.group.id}/expenses/${expense.id}`);
    await expect(memberPage.getByText('Deleted user', { exact: true }).first()).toBeVisible();
    await expect(memberPage.getByText(scenario.owner.email!, { exact: true })).not.toBeVisible();
  } finally {
    await memberContext.close();
  }
});

['unavailable', 'failure'].forEach((cacheState) => {
  test(`still signs out when Cache Storage is ${cacheState}`, async ({ page, scenario, db }) => {
    await page.goto('/en/account');
    await page.evaluate((state) => {
      if ('unavailable' === state) {
        Reflect.deleteProperty(window, 'caches');
        return;
      }
      Object.defineProperty(window, 'caches', {
        configurable: true,
        value: { delete: () => Promise.reject(new Error('Cache Storage unavailable')) },
      });
    }, cacheState);
    if ('unavailable' === cacheState) {
      expect(await page.evaluate(() => 'caches' in window)).toBe(false);
    }
    await page.getByRole('button', { name: 'Delete account', exact: true }).click();
    await page
      .getByRole('alertdialog')
      .getByRole('button', { name: 'Permanently delete account' })
      .click();
    await expect(page).toHaveURL(/\/auth\/signin/);
    expect(await db.session.count({ where: { userId: scenario.owner.id } })).toBe(0);
    expect(await db.user.findUniqueOrThrow({ where: { id: scenario.owner.id } })).toMatchObject({
      deletedAt: expect.any(Date),
    });
  });
});
