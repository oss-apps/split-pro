import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { env } from '~/env';

// oxlint-disable-next-line no-shadow-restricted-names
declare namespace globalThis {
  // oxlint-disable-next-line no-unused-vars
  let prisma: PrismaClient | undefined;
}

/**
 * The `client` (WASM) engine has no built-in connection management, so it always runs
 * through a driver adapter. `@prisma/adapter-pg` talks to any Postgres over TCP (local
 * dev, Docker). For Cloudflare Workers — which can't hold a TCP socket — swap this for
 * `@prisma/adapter-neon` (Neon's HTTP/WebSocket driver); nothing else changes.
 */
const createPrismaClient = () => {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: 'development' === env.NODE_ENV ? ['error', 'warn'] : ['error'],
  });
};

export const db = globalThis.prisma ?? createPrismaClient();

if ('production' !== env.NODE_ENV) {
  globalThis.prisma = db;
}
