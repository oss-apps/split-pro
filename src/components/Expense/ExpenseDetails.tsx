import { isSameDay } from 'date-fns';
import { type User as NextUser } from 'next-auth';

import { toUIString } from '~/utils/numbers';

import type { inferRouterOutputs } from '@trpc/server';
import { Landmark, PencilIcon } from 'lucide-react';
import React, { type ComponentProps, useCallback } from 'react';
import { useIntlCronParser } from '~/hooks/useIntlCronParser';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { isCurrencyCode } from '~/lib/currency';
import type { ExpenseRouter } from '~/server/api/routers/expense';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { CurrencyConversion } from '../Friend/CurrencyConversion';
import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { CategoryIcon } from '../ui/categoryIcons';
import { Separator } from '../ui/separator';
import { Receipt } from './Receipt';
import { cronFromBackend } from '~/lib/cron';

type ExpenseDetailsOutput = NonNullable<inferRouterOutputs<ExpenseRouter>['getExpenseDetails']>;

interface ExpenseDetailsProps {
  user: NextUser;
  expense: ExpenseDetailsOutput;
  storagePublicUrl?: string;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ user, expense, storagePublicUrl }) => {
  const { displayName, toUIDate, t } = useTranslationWithUtils();

  const { cronParser, i18nReady } = useIntlCronParser();

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-start gap-4">
          <div className="rounded-lg border p-2 text-xl">
            <CategoryIcon category={expense.category} className="text-gray-400" size={24} />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex w-full items-center gap-2">
              <p>{expense.name}</p>
              {expense.transactionId && <Landmark className="h-4 w-4 text-emerald-500" />}
            </div>
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
                {t('ui.edited_by')} {displayName(expense.updatedByUser, user.id, 'dativus')}{' '}
                {t('ui.on')} {toUIDate(expense.updatedAt, { year: true })}
              </p>
            ) : null}
            {expense.deletedByUser ? (
              <p className="text-sm text-orange-600">
                {t('ui.deleted_by')} {displayName(expense.deletedByUser, user.id, 'dativus')}{' '}
                {t('ui.on')} {toUIDate(expense.deletedAt ?? expense.createdAt, { year: true })}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                {t('ui.added_by')} {displayName(expense.addedByUser, user.id, 'dativus')}{' '}
                {t('ui.on')} {toUIDate(expense.createdAt, { year: true })}
              </p>
            )}
            {expense.recurrence ? (
              <p className="text-primary text-sm">
                {t('recurrence.recurring')}
                {i18nReady
                  ? `: 
                
                ${cronParser(cronFromBackend(expense.recurrence.job.schedule))}`
                  : ''}
              </p>
            ) : null}
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
        <EntityAvatar entity={expense.paidByUser} size={35} />
        <p>
          {displayName(expense.paidByUser, user.id)}{' '}
          {t(
            `ui.expense.${expense.paidByUser.id === user.id ? 'you' : 'user'}.${expense.amount < 0 ? 'received' : 'paid'}`,
          )}{' '}
          {expense.currency} {toUIString(expense.amount)}
        </p>
      </div>
      <div className="mt-4 ml-14 flex flex-col gap-4">
        {expense.expenseParticipants
          .filter((participant) => 0n !== participant.amount)
          .map((participant) => (
            <ExpenseParticipantEntry
              key={participant.userId}
              participant={participant}
              userId={user.id}
              currency={expense.currency}
            />
          ))}
        {expense.conversionTo && (
          <>
            {expense.conversionTo.expenseParticipants
              .filter((participant) => 0n !== participant.amount)
              .map((participant) => (
                <ExpenseParticipantEntry
                  key={participant.userId}
                  participant={participant}
                  userId={user.id}
                  currency={expense.conversionTo!.currency}
                />
              ))}
          </>
        )}
      </div>
    </>
  );
};

const ExpenseParticipantEntry: React.FC<{
  participant: ExpenseDetailsOutput['expenseParticipants'][number];
  userId: number;
  currency: string;
}> = ({ participant, userId, currency }) => {
  const { displayName, t } = useTranslationWithUtils();

  return (
    <div key={participant.userId} className="flex items-center gap-2 text-sm text-gray-500">
      <EntityAvatar entity={participant.user} size={25} />
      <p>
        {displayName(participant.user, userId)}{' '}
        {t(
          `ui.expense.${userId === participant.userId ? 'you' : 'user'}.${participant.amount < 0 ? 'owe' : 'get'}`,
        )}{' '}
        {currency} {toUIString(participant.amount)}
      </p>
    </div>
  );
};

export const EditCurrencyConversion: React.FC<{ expense: ExpenseDetailsOutput }> = ({
  expense,
}) => {
  const { setCurrency } = useAddExpenseStore((s) => s.actions);

  const addOrEditCurrencyConversionMutation = api.expense.addOrEditCurrencyConversion.useMutation();
  const apiUtils = api.useUtils();

  const onClick = useCallback(() => {
    if (expense.conversionTo && isCurrencyCode(expense.conversionTo.currency)) {
      setCurrency(expense.conversionTo.currency);
    }
  }, [expense, setCurrency]);

  const sender = expense.paidByUser;
  const receiver = expense.expenseParticipants.find((p) => p.userId !== expense.paidBy)?.user;

  if (!sender || !receiver || !isCurrencyCode(expense.currency)) {
    return null;
  }

  const onSubmit: ComponentProps<typeof CurrencyConversion>['onSubmit'] = useCallback(
    async (data) => {
      await addOrEditCurrencyConversionMutation.mutateAsync({
        ...data,
        senderId: sender.id,
        receiverId: receiver.id,
        groupId: expense.groupId,
        expenseId: expense.id,
      });
      await apiUtils.invalidate();
    },
    [
      addOrEditCurrencyConversionMutation,
      sender.id,
      receiver.id,
      expense.groupId,
      expense.id,
      apiUtils,
    ],
  );

  return (
    <CurrencyConversion
      amount={expense.amount}
      currency={expense.currency}
      onSubmit={onSubmit}
      editingRate={Math.abs(Number(expense.conversionTo?.amount) / Number(expense.amount))}
    >
      <Button variant="ghost" onClick={onClick}>
        <PencilIcon className="mr-1 h-4 w-4" />
      </Button>
    </CurrencyConversion>
  );
};

export default ExpenseDetails;
