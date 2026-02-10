import { SplitType } from '@prisma/client';
import { isSameDay } from 'date-fns';
import { type User as NextUser } from 'next-auth';

import type { inferRouterOutputs } from '@trpc/server';
import { ArrowRightIcon, Landmark, Merge, PencilIcon, Users } from 'lucide-react';
import Link from 'next/link';
import React, { type ComponentProps, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { useIntlCronParser } from '~/hooks/useIntlCronParser';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { cronFromBackend } from '~/lib/cron';
import { DEFAULT_CATEGORY } from '~/lib/category';
import { isCurrencyCode } from '~/lib/currency';
import type { ExpenseRouter } from '~/server/api/routers/expense';
import { useAddExpenseStore } from '~/store/addStore';
import { api } from '~/utils/api';
import { BigMath } from '~/utils/numbers';

import { CurrencyConversion } from '../Friend/CurrencyConversion';
import { EntityAvatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { CategoryIcon } from '../ui/categoryIcons';
import { CurrencyInput } from '../ui/currency-input';
import { AppDrawer } from '../ui/drawer';
import { Separator } from '../ui/separator';
import { Receipt } from './Receipt';

type ExpenseDetailsOutput = NonNullable<inferRouterOutputs<ExpenseRouter>['getExpenseDetails']>;

interface ExpenseDetailsProps {
  user: NextUser;
  expense: ExpenseDetailsOutput;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ user, expense }) => {
  const { displayName, toUIDate, t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const { cronParser, i18nReady } = useIntlCronParser();

  const cronString = useMemo(() => {
    if (!expense.recurrence) {
      return null;
    }
    try {
      return cronParser(cronFromBackend(expense.recurrence.job.schedule));
    } catch {
      toast.error(t('errors.invalid_cron_expression'));
      console.error(
        `Failed to parse cron expression for expense: ${expense.recurrence.job.schedule}`,
      );
      return null;
    }
  }, [t, expense.recurrence, cronParser]);

  const { toUIString } = getCurrencyHelpersCached(expense.currency);

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
              {expense.transactionId && <Landmark className="text-positive h-4 w-4" />}
            </div>
            <p className="text-2xl font-semibold">{toUIString(expense.amount)}</p>
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
              <p className="text-negative text-sm">
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
              <Link href="/recurring" className="text-primary text-sm hover:underline">
                {t('recurrence.recurring')}
                {i18nReady ? `: ${cronString}` : ''}
              </Link>
            ) : null}
            {expense.group ? (
              <Link href={`/groups/${expense.group.id}`}>
                <Button variant="outline" size="sm" className="mt-2 gap-2">
                  <div className="relative">
                    <Users className="size-4" />
                    {expense.group.simplifyDebts && (
                      <Merge className="absolute -top-1 -right-1 size-2" />
                    )}
                  </div>
                  {expense.group.name}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
        <div>{expense.fileKey ? <Receipt fileKey={expense.fileKey} /> : null}</div>
      </div>
      <Separator />
      <div className="mt-10 flex items-center gap-2">
        <Link
          href={
            expense.paidByUser.id === user.id ? '/balances' : `/balances/${expense.paidByUser.id}`
          }
        >
          <Button variant="outline" size="sm" className="gap-2 px-2">
            <EntityAvatar entity={expense.paidByUser} size={25} />
            <span>{displayName(expense.paidByUser, user.id)}</span>
          </Button>
        </Link>
        <span className="text-gray-500">
          {t(
            `ui.expense.${expense.paidByUser.id === user.id ? 'you' : 'user'}.${expense.amount < 0 ? 'received' : 'paid'}`,
          )}
        </span>
        <span className={expense.amount < 0 ? 'text-negative' : 'text-positive'}>
          {toUIString(expense.amount)}
        </span>
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
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const { toUIString } = getCurrencyHelpersCached(currency);

  const isCurrentUser = userId === participant.userId;
  const isPositive = participant.amount > 0n;
  const amountColorClass = isPositive ? 'text-positive' : 'text-negative';

  return (
    <div key={participant.userId} className="flex items-center gap-2 text-sm">
      <Link href={isCurrentUser ? '/balances' : `/balances/${participant.userId}`}>
        <Button variant="outline" size="sm" className="gap-2 px-2">
          <EntityAvatar entity={participant.user} size={25} />
          <span>{displayName(participant.user, userId)}</span>
        </Button>
      </Link>
      <span className="text-gray-500">
        {t(`ui.expense.${isCurrentUser ? 'you' : 'user'}.${isPositive ? 'get' : 'owe'}`)}
      </span>
      <span className={amountColorClass}>{toUIString(participant.amount)}</span>
    </div>
  );
};

export const EditCurrencyConversion: React.FC<{ expense: ExpenseDetailsOutput }> = ({
  expense,
}) => {
  const { setCurrency } = useAddExpenseStore((s) => s.actions);
  const { t } = useTranslationWithUtils();

  if (!expense.conversionTo) {
    toast.error(t('errors.currency_conversion_malformed'));
    console.error(
      'Malformed currency conversion data: no conversionTo present, please report this issue.',
    );
    return null;
  }

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

export const EditSettlement: React.FC<{ expense: ExpenseDetailsOutput }> = ({ expense }) => {
  const { displayName, t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const sender = expense.paidByUser;
  const receiver = expense.expenseParticipants.find((p) => p.userId !== expense.paidBy)?.user;

  const [amount, setAmount] = useState<bigint>(BigMath.abs(expense.amount));
  const [amountStr, setAmountStr] = useState<string>(
    getCurrencyHelpersCached(expense.currency).toUIString(BigMath.abs(expense.amount)),
  );

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();
  const apiUtils = api.useUtils();

  const onCurrencyInputValueChange = useCallback(
    ({ strValue, bigIntValue }: { strValue?: string; bigIntValue?: bigint }) => {
      if (strValue !== undefined) {
        setAmountStr(strValue);
      }
      if (bigIntValue !== undefined) {
        setAmount(bigIntValue);
      }
    },
    [],
  );

  const saveExpense = useCallback(() => {
    if (!amount || !sender || !receiver) {
      return;
    }

    addExpenseMutation.mutate(
      {
        expenseId: expense.id,
        name: t('ui.settle_up_name'),
        currency: expense.currency,
        amount,
        splitType: SplitType.SETTLEMENT,
        participants: [
          {
            userId: sender.id,
            amount,
          },
          {
            userId: receiver.id,
            amount: -amount,
          },
        ],
        paidBy: sender.id,
        category: DEFAULT_CATEGORY,
        groupId: expense.groupId,
      },
      {
        onSuccess: () => {
          apiUtils.invalidate().catch(console.error);
        },
        onError: (error) => {
          console.error('Error while saving expense:', error);
          toast.error(t('errors.saving_expense'));
        },
      },
    );
  }, [amount, sender, receiver, expense, addExpenseMutation, apiUtils, t]);

  if (!sender || !receiver) {
    return null;
  }

  return (
    <AppDrawer
      trigger={
        <Button variant="ghost">
          <PencilIcon className="mr-1 h-4 w-4" />
        </Button>
      }
      leftAction={t('actions.back')}
      title={t('ui.settlement')}
      actionTitle={t('actions.save')}
      actionOnClick={saveExpense}
      actionDisabled={!amount}
      className="h-[70vh]"
      shouldCloseOnAction
    >
      <div className="mt-10 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-5">
            <EntityAvatar entity={sender} />
            <ArrowRightIcon className="h-6 w-6 text-gray-600" />
            <EntityAvatar entity={receiver} />
          </div>
          <p className="mt-2 text-center text-sm text-gray-400">
            {displayName(sender)} {t('ui.expense.user.pay')} {displayName(receiver)}
          </p>
          {expense.group ? (
            <p className="mt-1 text-center text-xs text-gray-500">{expense.group.name}</p>
          ) : null}
        </div>
        <CurrencyInput
          currency={expense.currency}
          strValue={amountStr}
          className="mx-auto mt-4 w-37.5 text-center text-lg"
          onValueChange={onCurrencyInputValueChange}
        />
      </div>
    </AppDrawer>
  );
};

export default ExpenseDetails;
