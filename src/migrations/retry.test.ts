import { terminateAfterMigrationFailure, waitForDatabase } from './retry';

describe('terminateAfterMigrationFailure', () => {
  it('logs and flushes stderr before exiting with a nonzero status', async () => {
    const exitError = new Error('process exited');
    const events: string[] = [];
    const exit = jest.fn((): never => {
      events.push('exit');
      throw exitError;
    });
    const flush = jest.fn().mockImplementation(async () => {
      events.push('flush');
    });
    const logger = {
      error: jest.fn(() => {
        events.push('log');
      }),
    };
    const migrationError = new Error(
      'Cannot connect to postgresql://splitpro:secret@postgres:5432/splitpro',
    );

    await expect(
      terminateAfterMigrationFailure(migrationError, { exit, flush, logger }),
    ).rejects.toBe(exitError);
    expect(logger.error).toHaveBeenCalledWith('Database migrations failed:', migrationError);
    expect(exit).toHaveBeenCalledWith(1);
    expect(events).toEqual(['log', 'flush', 'exit']);
  });

  it('still exits when flushing stderr fails', async () => {
    const exitError = new Error('process exited');
    const flushError = new Error('stderr closed');
    const exit = jest.fn((): never => {
      throw exitError;
    });
    const flush = jest.fn().mockRejectedValue(flushError);
    const logger = { error: jest.fn() };

    await expect(
      terminateAfterMigrationFailure(new Error('Migration failed'), { exit, flush, logger }),
    ).rejects.toBe(exitError);
    expect(logger.error).toHaveBeenLastCalledWith(
      'Failed to flush database migration logs:',
      flushError,
    );
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('exits when flushing stderr never settles', async () => {
    jest.useFakeTimers();
    const exitError = new Error('process exited');
    const exit = jest.fn((): never => {
      throw exitError;
    });
    const flush = jest.fn(() => new Promise<void>(() => undefined));
    const logger = { error: jest.fn() };

    const termination = terminateAfterMigrationFailure(new Error('Migration failed'), {
      exit,
      flush,
      flushTimeoutMs: 1000,
      logger,
    });
    const expectation = expect(termination).rejects.toBe(exitError);

    await jest.advanceTimersByTimeAsync(999);
    expect(exit).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await expectation;
    expect(exit).toHaveBeenCalledWith(1);
    jest.useRealTimers();
  });
});

describe('waitForDatabase', () => {
  const delaysMs = [1000, 2000] as const;

  it('returns after the first successful check', async () => {
    const checkDatabase = jest.fn().mockResolvedValue(undefined);
    const sleep = jest.fn().mockResolvedValue(undefined);

    await waitForDatabase(checkDatabase, { delaysMs, sleep });

    expect(checkDatabase).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries every readiness failure using the configured delays', async () => {
    const checkDatabase = jest
      .fn()
      .mockRejectedValueOnce(new Error('database system is starting up'))
      .mockRejectedValueOnce(new Error('Authentication failed'))
      .mockResolvedValue(undefined);
    const sleep = jest.fn().mockResolvedValue(undefined);
    const logger = { warn: jest.fn() };

    await waitForDatabase(checkDatabase, { delaysMs, logger, sleep });

    expect(checkDatabase).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it('caps retry delays at the wall-clock budget', async () => {
    let currentTime = 0;
    const error = new Error('Database unavailable');
    const checkDatabase = jest.fn().mockRejectedValue(error);
    const sleep = jest.fn().mockImplementation(async (delayMs: number) => {
      currentTime += delayMs;
    });
    const logger = { warn: jest.fn() };

    await expect(
      waitForDatabase(checkDatabase, {
        delaysMs,
        logger,
        now: () => currentTime,
        sleep,
        timeoutMs: 2500,
      }),
    ).rejects.toBe(error);
    expect(checkDatabase).toHaveBeenCalledTimes(2);
    expect(sleep.mock.calls).toEqual([[1000], [1500]]);
  });

  it('uses a 60-second wall-clock budget by default', async () => {
    let currentTime = 0;
    const error = new Error('Database unavailable');
    const checkDatabase = jest.fn().mockRejectedValue(error);
    const sleep = jest.fn().mockImplementation(async (delayMs: number) => {
      currentTime += delayMs;
    });
    const logger = { warn: jest.fn() };

    await expect(
      waitForDatabase(checkDatabase, { logger, now: () => currentTime, sleep }),
    ).rejects.toBe(error);
    expect(currentTime).toBe(60_000);
    expect(sleep.mock.calls).toEqual([[1000], [2000], [4000], [8000], [16000], [29000]]);
  });

  it('times out a readiness check that never settles', async () => {
    jest.useFakeTimers();
    const checkDatabase = jest.fn(() => new Promise<void>(() => undefined));
    const readiness = waitForDatabase(checkDatabase, { timeoutMs: 1000 });
    const expectation = expect(readiness).rejects.toThrow(
      'Database did not become ready within 1000ms.',
    );

    await jest.advanceTimersByTimeAsync(1000);
    await expectation;
    jest.useRealTimers();
  });
});
