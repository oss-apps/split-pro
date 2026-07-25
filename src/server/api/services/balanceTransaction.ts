import { Prisma } from '@prisma/client';

import { db } from '~/server/db';

const MAX_TRANSACTION_ATTEMPTS = 3;

export const runBalanceTransaction = async <T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  attempt = 1,
): Promise<T> => {
  try {
    return await db.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    const canRetry =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      'P2034' === error.code &&
      attempt < MAX_TRANSACTION_ATTEMPTS;

    if (!canRetry) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 20));
    return runBalanceTransaction(operation, attempt + 1);
  }
};
