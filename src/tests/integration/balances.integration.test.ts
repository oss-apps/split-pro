jest.mock('~/server/db', () => {
  const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
  return { db: new PrismaClient({ datasourceUrl: process.env.DATABASE_URL }) };
});

import { db } from '~/server/db';
import { resetDatabase } from './database';
import { testExpense, testUser } from './factories';

describe('balance view integration', () => {
  beforeEach(() => resetDatabase());

  it('calculates both sides of a double-entry balance', async () => {
    const payer = await testUser('Payer');
    const participant = await testUser('Participant');
    await testExpense({ paidBy: payer.id, participantId: participant.id });

    const balances = await db.balanceView.findMany({ orderBy: { userId: 'asc' } });
    expect(balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: payer.id, friendId: participant.id, amount: 1_000n }),
        expect.objectContaining({ userId: participant.id, friendId: payer.id, amount: -1_000n }),
      ]),
    );
  });
});
