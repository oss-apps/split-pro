import { PrismaClient } from '@prisma/client';

import { env } from '~/env';

declare namespace globalThis {
  // oxlint-disable-next-line no-unused-vars
  let prisma: PrismaClient | undefined;
}

export const db =
  globalThis.prisma ??
  (await (async () => {
    const prisma = new PrismaClient({
      log: 'development' === env.NODE_ENV ? ['error', 'warn'] : ['error'],
    });
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_cron;`;
    return prisma;
  })());

if ('production' !== env.NODE_ENV) {
  globalThis.prisma = db;
}
