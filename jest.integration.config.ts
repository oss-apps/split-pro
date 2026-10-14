import { configureJest } from './jest.shared.ts';
import { getTestDatabaseUrl } from './src/tests/helpers/testDatabase.ts';
import { loadTestEnvironment } from './src/tests/helpers/environment.ts';

loadTestEnvironment();
process.env.DATABASE_URL = getTestDatabaseUrl();
process.env.SKIP_ENV_VALIDATION = '1';

export default () =>
  configureJest({
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup/integration.ts'],
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/tests/integration/**/*.{test,spec}.{ts,tsx}'],
    maxWorkers: 1,
  });
