export const DEFAULT_TEST_DATABASE_URL =
  'postgresql://splitpro:test-password@127.0.0.1:55439/splitpro_harness_test';
export const DEFAULT_E2E_DATABASE_URL =
  'postgresql://splitpro:test-password@127.0.0.1:55440/splitpro_e2e_test';

export const assertTestDatabaseUrl = (value: string) => {
  const url = new URL(value);
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !/^\/[a-zA-Z_][a-zA-Z0-9_]*_test$/.test(url.pathname)
  ) {
    throw new Error('Tests require a local PostgreSQL database whose name ends in _test');
  }
  return url;
};

export const getTestDatabaseUrl = (suite: 'integration' | 'e2e' = 'integration') => {
  const value =
    'e2e' === suite
      ? (process.env.E2E_DATABASE_URL ?? DEFAULT_E2E_DATABASE_URL)
      : (process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL);
  assertTestDatabaseUrl(value);
  const otherValue =
    'e2e' === suite
      ? (process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL)
      : (process.env.E2E_DATABASE_URL ?? DEFAULT_E2E_DATABASE_URL);
  const url = new URL(value);
  const other = new URL(otherValue);
  if ((url.port || '5432') === (other.port || '5432')) {
    throw new Error('Integration and E2E databases require separate PostgreSQL ports/clusters');
  }
  return value;
};
