import { type env as AppEnv } from '~/env';

describe('recurrence execution time with skipped environment validation', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    [undefined, '00:00'],
    ['', '00:00'],
    ['06:35', '06:35'],
  ])('resolves %p to %s', (value, expected) => {
    const testEnvironment: NodeJS.ProcessEnv = { ...process.env, SKIP_ENV_VALIDATION: '1' };
    delete testEnvironment.RECURRENCE_TIME;
    if (undefined !== value) {
      testEnvironment.RECURRENCE_TIME = value;
    }
    jest.replaceProperty(process, 'env', testEnvironment);

    jest.isolateModules(() => {
      const { env } = require('~/env') as { env: typeof AppEnv };
      expect(env.RECURRENCE_TIME).toBe(expected);
    });
  });
});
