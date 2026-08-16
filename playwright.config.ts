import { defineConfig, devices } from '@playwright/test';

const defaultPort = 3176;
const databaseUrl =
  process.env.E2E_DATABASE_URL ??
  'postgresql://postgres:strong-password@localhost:5432/splitpro_test';
const database = new URL(databaseUrl);
const baseUrl = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${defaultPort}`;
const baseUrlDetails = new URL(baseUrl);

if (
  !['localhost', '127.0.0.1', '::1'].includes(database.hostname) ||
  !database.pathname.endsWith('_test')
) {
  throw new Error('E2E_DATABASE_URL must point at a local disposable *_test database');
}
if (!['localhost', '127.0.0.1', '::1'].includes(baseUrlDetails.hostname)) {
  throw new Error('E2E_BASE_URL must point at a local test server');
}

const port = Number(baseUrlDetails.port) || 80;

process.env.DATABASE_URL = databaseUrl;
process.env.TEST_MODE = '1';
process.env.NEXTAUTH_SECRET ??= 'playwright-test-secret';
process.env.NEXTAUTH_URL = baseUrl;
process.env.NEXTAUTH_URL_INTERNAL = baseUrl;
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
    baseURL: baseUrl,
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
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      NODE_ENV: 'test',
      TEST_MODE: '1',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'playwright-test-secret',
      NEXTAUTH_URL: baseUrl,
      NEXTAUTH_URL_INTERNAL: baseUrl,
      SKIP_ENV_VALIDATION: '1',
      ENABLE_SENDING_INVITES: '0',
      DISABLE_EMAIL_SIGNUP: '0',
      INVITE_ONLY: '0',
    },
  },
});
