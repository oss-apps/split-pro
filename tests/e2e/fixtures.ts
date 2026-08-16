import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test as base, expect } from '@playwright/test';
import { db } from '~/server/db';

interface Fixtures {
  userId: number;
  uniqueName: string;
}

interface AuthMeta {
  userId: number;
}

const metaPath = join(process.cwd(), 'playwright', '.auth', 'user-meta.json');

export const test = base.extend<Fixtures>({
  userId: async ({ page: _page }, use) => {
    const parsed: unknown = JSON.parse(await readFile(metaPath, 'utf8'));
    if (
      !parsed ||
      'object' !== typeof parsed ||
      !('userId' in parsed) ||
      'number' !== typeof parsed.userId
    ) {
      throw new Error('Playwright authentication metadata has no numeric userId');
    }
    const meta: AuthMeta = { userId: parsed.userId };
    await use(meta.userId);
  },
  uniqueName: async ({ page: _page }, use, testInfo) => {
    await use(`E2E ${testInfo.project.name} ${testInfo.workerIndex} ${testInfo.testId}`);
  },
});

export { db, expect };
