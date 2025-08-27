import { type Expense, type ExpenseParticipant, type User } from '@prisma/client';
import { isSameDay } from 'date-fns';
import { type User as NextUser } from 'next-auth';

import { toUIString } from '~/utils/numbers';

import { EntityAvatar } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Receipt } from './Receipt';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import type { FC } from 'react';
import { CategoryIcon } from '../ui/categoryIcons';

interface ExpenseDetailsProps {
  user: NextUser;
  expense: Expense & {
    expenseParticipants: (ExpenseParticipant & { user: User })[];
    addedByUser: User;
    paidByUser: User;
    deletedByUser: User | null;
    updatedByUser: User | null;
  };
  storagePublicUrl?: string;
}

const ExpenseDetails: FC<ExpenseDetailsProps> = ({ user, expense, storagePublicUrl }) => {
  const { displayName, toUIDate, t } = useTranslationWithUtils(['expense_details']);
  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-start gap-4">
          <div className="rounded-lg border p-2 text-xl">
            <CategoryIcon category={expense.category} className="text-gray-400" size={24} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="">{expense.name}</p>
            <p className="text-2xl font-semibold">
              {expense.currency} {toUIString(expense.amount)}
            </p>
            {!isSameDay(expense.expenseDate, expense.createdAt) ? (
              <p className="text-sm text-gray-500">
                {toUIDate(expense.expenseDate, { year: true })}
              </p>
            ) : null}
            {expense.updatedByUser ? (
              <p className="text-sm text-gray-500">
                {t('ui.edited_by', { ns: 'common' })}{' '}
                {displayName(expense.updatedByUser, user.id, 'dativus')}{' '}
                {t('ui.on', { ns: 'common' })}{' '}
                {toUIDate(expense.updatedAt, { year: true })}
              </p>
            ) : null}
            {expense.deletedByUser ? (
              <p className="text-sm text-orange-600">
                {t('ui.deleted_by', { ns: 'common' })}{' '}
                {displayName(expense.deletedByUser, user.id, 'dativus')}{' '}
                {t('ui.on', { ns: 'common' })}{' '}
                {toUIDate(expense.deletedAt ?? expense.createdAt, { year: true })}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                {t('ui.added_by', { ns: 'common' })}{' '}
                {displayName(expense.addedByUser, user.id, 'dativus')}{' '}
                {t('ui.on', { ns: 'common' })} {toUIDate(expense.createdAt, { year: true })}
              </p>
            )}
          </div>
        </div>
        <div>
          {expense.fileKey ? (
            <Receipt fileKey={expense.fileKey} url={storagePublicUrl ?? ''} />
          ) : null}
        </div>
      </div>
      <Separator />
      <div className="mt-10 flex items-center gap-5">
        {/* <button
          onClick={() => {
            sendNotificationMutation.mutate({
              expenseId: expense.id,
            });
          }}
          className="rounded-md bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
        >
          Test Notification
        </button> */}
        <EntityAvatar entity={expense.paidByUser} size={35} />
        <p>
          {displayName(expense.paidByUser, user.id)}{' '}
          {t(
            `ui.expense.${expense.paidByUser.id === user.id ? 'you' : 'user'}.${expense.amount < 0 ? 'received' : 'paid'}`,
            { ns: 'common' },
          )}{' '}
          {expense.currency} {toUIString(expense.amount)}
        </p>
      </div>
      <div className="mt-4 ml-14 flex flex-col gap-4">
        {expense.expenseParticipants
          .filter(
            (partecipant) =>
              (expense.paidBy === partecipant.userId ? (expense.amount ?? 0n) : 0n) !==
              partecipant.amount,
          )
          .map((partecipant) => (
            <div key={partecipant.userId} className="flex items-center gap-2 text-sm text-gray-500">
              <EntityAvatar entity={partecipant.user} size={25} />
              <p>
                {displayName(partecipant.user, user.id)}{' '}
                {t(
                  `ui.expense.${user.id === partecipant.userId ? 'you' : 'user'}.${expense.amount < 0 ? 'received' : 'owe'}`,
                  {
                    ns: 'common',
                  },
                )}{' '}
                {expense.currency}{' '}
                {toUIString(
                  (expense.paidBy === partecipant.userId ? (expense.amount ?? 0n) : 0n) -
                    partecipant.amount,
                )}
              </p>
            </div>
          ))}
      </div>
    </>
  );
};

export default ExpenseDetails;
