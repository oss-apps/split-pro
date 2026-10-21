import { configureJest } from './jest.shared.ts';

const jestConfig = () =>
  configureJest({
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup/unit.ts'],
    testMatch: [
      '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
      '<rootDir>/tests/**/*.{test,spec}.{ts,tsx}',
    ],
    testPathIgnorePatterns: ['<rootDir>/src/tests/integration/', '<rootDir>/tests/e2e/'],
  });

export default jestConfig;
