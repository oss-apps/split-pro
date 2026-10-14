import { defineConfig, devices } from '@playwright/test';

import { getTestDatabaseUrl } from './src/tests/helpers/testDatabase';
import { loadTestEnvironment } from './src/tests/helpers/environment';

loadTestEnvironment();
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3176';
const url = new URL(baseURL);
if ('http:' !== url.protocol || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
  throw new Error('E2E_BASE_URL must point at a local HTTP test server');
}

const testEnvironment = {
  DATABASE_URL: getTestDatabaseUrl('e2e'),
  NODE_ENV: 'test',
  TEST_MODE: '1',
  NEXTAUTH_SECRET: 'playwright-test-secret',
  NEXTAUTH_URL: baseURL,
  NEXTAUTH_URL_INTERNAL: baseURL,
  SKIP_ENV_VALIDATION: '1',
  ENABLE_SENDING_INVITES: '0',
  DISABLE_EMAIL_SIGNUP: '0',
  INVITE_ONLY: '0',
};
Object.assign(process.env, testEnvironment);

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [[process.env.CI ? 'line' : 'list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: `pnpm dev --hostname ${url.hostname.replaceAll('[', '').replaceAll(']', '')} --port ${Number(url.port) || 80}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: testEnvironment,
  },
});
