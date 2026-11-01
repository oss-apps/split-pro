import { readFile } from 'node:fs/promises';

import { createDatabaseExpense, expect, expenseInput, test } from './fixtures';

(['activity', 'friend', 'group'] as const).forEach((list) => {
  test(`${list} history loads bounded pages while scrolling`, async ({ page, scenario, db }) => {
    await Promise.all(
      Array.from({ length: 55 }, (_, index) =>
        createDatabaseExpense(
          db,
          expenseInput(scenario.owner.id, scenario.member.id, {
            groupId: scenario.group.id,
            name: `History expense ${index}`,
            expenseDate: new Date('2025-01-01T12:00:00Z'),
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
    await expect(rows).toHaveCount(50);

    if ('friend' === list) {
      // Export must include rows that have not been loaded into the list.
      const downloaded = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Export', exact: true }).click();
      const download = await downloaded;
      const file = await download.path();
      expect(file).toBeTruthy();
      const content = await readFile(file, 'utf8');
      expect(content.trim().split('\n')).toHaveLength(56);
      await expect(rows).toHaveCount(50);
    }

    await page.locator('#mainlayout').evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(rows).toHaveCount(55);
    await expect(page.getByRole('button', { name: 'Load more', exact: true })).toHaveCount(0);
    const links = await rows.evaluateAll((elements) =>
      elements.map((element) => element.getAttribute('href')),
    );
    expect(new Set(links).size).toBe(55);
  });
});
