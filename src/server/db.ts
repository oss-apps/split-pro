import { PrismaClient } from '@prisma/client';

import { env } from '~/env';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: 'development' === env.NODE_ENV ? ['error', 'warn'] : ['error'],
  });

if ('production' !== env.NODE_ENV) {globalForPrisma.prisma = db;}
