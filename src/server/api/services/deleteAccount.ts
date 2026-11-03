import { randomInt } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';

import { extractTemplateExpenseId } from '~/lib/cron';

import { deleteAccountAvatar } from './deleteAccountAvatar';

export const DELETED_USER_NAME = 'Deleted user';

/** Keep the user as a tombstone: deleting it would cascade into shared expenses. */
export const deleteAccount = async (
  db: PrismaClient,
  userId: number,
  attempt = 0,
): Promise<void> => {
  try {
    const image = await db.$transaction(
      async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        if (user.deletedAt) {
          return null;
        }

        // Claim deletion before touching relations; concurrent deletions serialize.
        await tx.user.update({
          where: { id: userId },
          data: {
            deletedAt: new Date(),
            name: DELETED_USER_NAME,
            email: null,
            emailVerified: null,
            image: null,
            bankingId: null,
            obapiProviderId: null,
            currency: 'USD',
            defaultCurrency: null,
            preferredLanguage: '',
            hiddenFriendIds: [],
          },
        });

        const groups = await tx.group.findMany({
          where: { userId },
          include: { groupUsers: { where: { user: { deletedAt: null, id: { not: userId } } } } },
        });
        await groups.reduce(async (previous, group) => {
          await previous;
          if (0 === group.groupUsers.length) {
            return;
          }
          const successor = group.groupUsers[randomInt(group.groupUsers.length)]!;
          await tx.group.update({ where: { id: group.id }, data: { userId: successor.userId } });
        }, Promise.resolve());

        // Stop only schedules whose template was created by this account.
        // Preserve derived expenses even if another member edited them.
        const recurrences = await tx.expenseRecurrence.findMany({
          where: { expense: { some: { addedBy: userId } } },
          include: { job: true },
        });
        await recurrences.reduce(async (previous, recurrence) => {
          await previous;
          const templateId = extractTemplateExpenseId(recurrence.job.command);
          if (!templateId) {
            return;
          }
          const template = await tx.expense.findUnique({ where: { id: templateId } });
          if (template?.addedBy === userId) {
            await tx.$queryRaw`SELECT cron.unschedule(${recurrence.jobId}::bigint)`;
            await tx.expenseRecurrence.delete({ where: { id: recurrence.id } });
          }
        }, Promise.resolve());

        await tx.account.deleteMany({ where: { userId } });
        await tx.session.deleteMany({ where: { userId } });
        if (user.email) {
          await tx.verificationToken.deleteMany({ where: { identifier: user.email } });
        }
        await tx.cachedBankData.deleteMany({ where: { userId } });
        await tx.pushNotification.deleteMany({ where: { userId } });
        await tx.friendDefaultSplit.deleteMany({
          where: { OR: [{ userAId: userId }, { userBId: userId }] },
        });
        return user.image;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    // Filesystem cleanup cannot roll back the database transaction.
    // Unexpected failures must not report account deletion as failed.
    await deleteAccountAvatar(db, userId, image ?? null).catch((error: unknown) => {
      console.error('Failed to remove deleted account avatar', userId, error);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      'P2034' === error.code &&
      2 > attempt
    ) {
      return deleteAccount(db, userId, attempt + 1);
    }
    throw error;
  }
};
