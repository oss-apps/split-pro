import { defineConfig, devices } from '@playwright/test';

const port = 3176;
const databaseUrl = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:strong-password@localhost:5432/splitpro_test';

if (!databaseUrl.includes('_test')) {
  throw new Error('E2E_DATABASE_URL must point at a disposable *_test database');
}

process.env.DATABASE_URL = databaseUrl;
process.env.NODE_ENV = 'test';
process.env.TEST_MODE = '1';
process.env.NEXTAUTH_SECRET ??= 'playwright-test-secret';
process.env.NEXTAUTH_URL = `http://127.0.0.1:${port}`;
process.env.NEXTAUTH_URL_INTERNAL = `http://127.0.0.1:${port}`;
process.env.SKIP_ENV_VALIDATION = '1';
process.env.ENABLE_SENDING_INVITES = '0';
process.env.DISABLE_EMAIL_SIGNUP = '0';
process.env.INVITE_ONLY = '0';

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: `pnpm dev --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'test',
      TEST_MODE: '1',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'playwright-test-secret',
      NEXTAUTH_URL: `http://127.0.0.1:${port}`,
      NEXTAUTH_URL_INTERNAL: `http://127.0.0.1:${port}`,
      SKIP_ENV_VALIDATION: '1',
      ENABLE_SENDING_INVITES: '0',
      DISABLE_EMAIL_SIGNUP: '0',
      INVITE_ONLY: '0',
    },
  },
});
