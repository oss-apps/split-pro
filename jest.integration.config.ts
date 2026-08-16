import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/integration.ts'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/integration/**/*.{test,spec}.{ts,tsx}'],
  maxWorkers: 1,
};

export default createJestConfig(config);
