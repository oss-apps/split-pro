// Backoff is capped by the wall-clock timeout below, including time spent on connection attempts.
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000] as const;
const RETRY_TIMEOUT_MS = 60_000;
const FLUSH_TIMEOUT_MS = 2000;

interface RetryOptions {
  delaysMs?: readonly number[];
  logger?: Pick<Console, 'warn'>;
  now?: () => number;
  sleep?: (delayMs: number) => Promise<void>;
  timeoutMs?: number;
}

interface TerminationOptions {
  exit?: (code: number) => never;
  flush?: () => Promise<void>;
  flushTimeoutMs?: number;
  logger?: Pick<Console, 'error'>;
}

const defaultSleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

const flushStream = (stream: NodeJS.WriteStream): Promise<void> =>
  new Promise((resolve, reject) => {
    stream.write('', (error) => (error ? reject(error) : resolve()));
  });

const flushOutput = (): Promise<void> =>
  Promise.all([flushStream(process.stdout), flushStream(process.stderr)]).then(() => undefined);

export const terminateAfterMigrationFailure = async (
  error: unknown,
  options: TerminationOptions = {},
): Promise<never> => {
  const exit = options.exit ?? ((code: number): never => process.exit(code));
  const flush = options.flush ?? flushOutput;
  const flushTimeoutMs = options.flushTimeoutMs ?? FLUSH_TIMEOUT_MS;
  const logger = options.logger ?? console;

  logger.error('Database migrations failed:', error);

  let flushTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
  const flushDeadline = new Promise<void>((resolve) => {
    flushTimeout = setTimeout(resolve, flushTimeoutMs);
  });

  try {
    // Console writes to Docker pipes can be asynchronous.
    // Ordered empty writes wait for prior stdout and stderr output before termination.
    // A blocked pipe may never call back, so the deadline guarantees the exit below still runs.
    await Promise.race([flush(), flushDeadline]);
  } catch (flushError) {
    // A logging failure must not leave Next.js running with its rejected instrumentation promise.
    logger.error('Failed to flush database migration logs:', flushError);
  } finally {
    clearTimeout(flushTimeout);
  }

  // Next.js caches a rejected instrumentation promise for the life of the process.
  // Exiting lets the container restart instead of serving permanent 5xx responses.
  return exit(1);
};

export const waitForDatabase = async (
  checkDatabase: () => Promise<void>,
  options: RetryOptions = {},
): Promise<void> => {
  const delaysMs = options.delaysMs ?? RETRY_DELAYS_MS;
  const logger = options.logger ?? console;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const timeoutMs = options.timeoutMs ?? RETRY_TIMEOUT_MS;
  const deadline = now() + timeoutMs;
  let lastError: unknown = undefined;

  const runAttempt = async (attemptIndex: number): Promise<void> => {
    try {
      await checkDatabase();
    } catch (error) {
      lastError = error;
      const remainingMs = deadline - now();
      if (0 >= remainingMs) {
        throw error;
      }

      const configuredDelayMs =
        delaysMs[Math.min(attemptIndex, delaysMs.length - 1)] ?? remainingMs;
      const delayMs = Math.min(configuredDelayMs, remainingMs);
      logger.warn(
        `Database is not ready (attempt ${attemptIndex + 1}). Retrying in ${delayMs}ms:`,
        error,
      );
      await sleep(delayMs);

      if (deadline <= now()) {
        throw error;
      }

      await runAttempt(attemptIndex + 1);
    }
  };

  let timeout: ReturnType<typeof setTimeout> | undefined = undefined;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(
        new Error(`Database did not become ready within ${timeoutMs}ms.`, {
          cause: lastError,
        }),
      );
    }, timeoutMs);
  });

  try {
    // The race enforces the wall-clock budget even if an individual Prisma query does not return.
    await Promise.race([runAttempt(0), timeoutPromise]);
  } finally {
    clearTimeout(timeout);
  }
};
