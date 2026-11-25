import { PrismaClient } from '@prisma/client';

import { createDatabaseAdapter } from '~/server/databaseAdapter';

describe('database adapter initialization', () => {
  it('can import the server client during a production build without database credentials', async () => {
    const client = new PrismaClient({
      adapter: createDatabaseAdapter('postgresql://undefined:undefined@undefined:undefined'),
    });

    await expect(client.$disconnect()).resolves.toBeUndefined();
  });
});
