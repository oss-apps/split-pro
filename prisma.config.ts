import 'dotenv/config';
import path from 'node:path';
import type { PrismaConfig } from 'prisma';

export default {
  schema: path.join('prisma', 'schema.prisma'),
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
