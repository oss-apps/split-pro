import { configureJest } from './jest.shared.ts';

export default () =>
  configureJest({
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup/unit.ts'],
    testMatch: ['<rootDir>/src/**/*.{test,spec}.{ts,tsx}'],
    testPathIgnorePatterns: ['<rootDir>/src/tests/integration/'],
  });
