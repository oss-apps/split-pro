import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/integration.ts'],
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/tests/integration/**/*.{test,spec}.{ts,tsx}'],
};

export default createJestConfig(config);
