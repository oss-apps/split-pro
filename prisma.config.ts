import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnvFile } from 'node:process';
import type { PrismaConfig } from 'prisma/config';

if (existsSync('.env')) {
  loadEnvFile('.env');
}

export default {
  schema: path.join('prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
  experimental: {
    externalTables: true,
  },
  tables: {
    external: ['cron.job', 'cron.job_run_details'],
  },
} satisfies PrismaConfig;
