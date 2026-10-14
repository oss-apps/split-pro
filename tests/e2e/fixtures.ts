import { randomUUID } from 'node:crypto';
import { type Group, PrismaClient, type User } from '@prisma/client';
import { test as base, expect } from '@playwright/test';

import {
  createDatabaseExpense,
  createDatabaseGroup,
  createDatabaseUser,
  expenseInput,
} from '~/tests/helpers/databaseFactories';
import { getTestDatabaseUrl } from '~/tests/helpers/testDatabase';

interface Scenario {
  owner: User;
  member: User;
  group: Group;
}
interface Fixtures {
  scenario: Scenario;
  uniqueName: string;
}
interface WorkerFixtures {
  db: PrismaClient;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  db: [
    async ({ browserName: _browserName }, use) => {
      const db = new PrismaClient({ datasourceUrl: getTestDatabaseUrl('e2e') });
      try {
        await use(db);
      } finally {
        await db.$disconnect();
      }
    },
    { scope: 'worker' },
  ],
  uniqueName: async ({ browserName: _browserName }, use) => {
    await use(`E2E ${randomUUID()}`);
  },
  scenario: async ({ db, uniqueName }, use) => {
    const users: User[] = [];
    try {
      // Sequential creation lets teardown clean even partially-created scenarios.
      const owner = await createDatabaseUser(db, { name: 'E2E Owner' });
      users.push(owner);
      const member = await createDatabaseUser(db, { name: 'E2E Member' });
      users.push(member);
      const group = await createDatabaseGroup(db, owner.id, [member.id], { name: uniqueName });
      await use({ owner, member, group });
    } finally {
      const userIds = users.map((user) => user.id);
      await db.$transaction([
        db.expense.deleteMany({
          where: {
            OR: [
              { addedBy: { in: userIds } },
              { paidBy: { in: userIds } },
              { expenseParticipants: { some: { userId: { in: userIds } } } },
            ],
          },
        }),
        db.group.deleteMany({ where: { userId: { in: userIds } } }),
        db.user.deleteMany({ where: { id: { in: userIds } } }),
      ]);
    }
  },
  storageState: async ({ db, scenario, baseURL }, use) => {
    if (!baseURL) {
      throw new Error('Missing E2E base URL');
    }
    const token = randomUUID();
    const expires = new Date(Date.now() + 3_600_000);
    await db.session.create({ data: { userId: scenario.owner.id, sessionToken: token, expires } });
    await use({
      cookies: [
        {
          name: 'next-auth.session-token',
          value: token,
          domain: new URL(baseURL).hostname,
          path: '/',
          expires: expires.getTime() / 1000,
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ],
      origins: [],
    });
  },
});

export { createDatabaseExpense, expenseInput, expect };
