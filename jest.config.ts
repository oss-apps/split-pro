import type { Config } from 'jest';
import nextJest from 'next/jest.js';

// @ts-expect-error we are extending BigInt prototype for JSON serialization
// oxlint-disable-next-line no-extend-native
BigInt.prototype.toJSON = function toJSON() {
  return this.toString();
};

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  coverageProvider: 'v8',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup/component.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.{test,spec}.{ts,tsx}'],
  testPathIgnorePatterns: ['<rootDir>/src/tests/integration/'],
};

export default createJestConfig(config);
