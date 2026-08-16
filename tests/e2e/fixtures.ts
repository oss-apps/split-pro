import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test as base, expect } from '@playwright/test';
import { db } from '~/server/db';

type Fixtures = { userId: number; uniqueName: string };
type AuthMeta = { userId: number };

const metaPath = join(process.cwd(), 'playwright', '.auth', 'user-meta.json');

export const test = base.extend<Fixtures>({
  userId: async ({}, use) => {
    const meta = JSON.parse(await readFile(metaPath, 'utf8')) as AuthMeta;
    await use(meta.userId);
  },
  uniqueName: async ({}, use, testInfo) => {
    await use(`E2E ${testInfo.project.name} ${testInfo.workerIndex} ${testInfo.testId}`);
  },
});

export { db, expect };
