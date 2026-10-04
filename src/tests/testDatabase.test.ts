import { assertTestDatabaseUrl } from './helpers/testDatabase';

describe('disposable database guard', () => {
  it.each([
    'postgresql://user:password@localhost:55439/app_test',
    'postgresql://user:password@127.0.0.1:55439/app_test?schema=public',
    'postgresql://user:password@[::1]:55439/app_test',
  ])('accepts a local disposable PostgreSQL URL: %s', (url) => {
    expect(assertTestDatabaseUrl(url).pathname).toBe('/app_test');
  });
  it.each([
    'postgresql://user:password@database.example/app_test',
    'postgresql://user:password@localhost/development',
    'postgresql://user:password@localhost/app_test_backup',
    'postgresql://user:password@localhost/app_test/production',
    'https://localhost/app_test',
    'not a URL',
  ])('refuses unsafe or malformed database targets: %s', (url) => {
    expect(() => assertTestDatabaseUrl(url)).toThrow();
  });
});
