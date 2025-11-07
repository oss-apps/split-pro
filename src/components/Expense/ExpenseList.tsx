import { SplitType } from '@prisma/client';
import { type inferRouterOutputs } from '@trpc/server';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import {
  CURRENCY_CONVERSION_ICON,
  CategoryIcon,
  SETTLEUP_ICON,
} from '~/components/ui/categoryIcons';
import type { ExpenseRouter } from '~/server/api/routers/expense';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { api } from '~/utils/api';
import { useRouter } from 'next/router';
import { Separator } from '../ui/separator';
import { cn } from '~/lib/utils';

type ExpensesOutput =
  | inferRouterOutputs<ExpenseRouter>['getGroupExpenses']
  | inferRouterOutputs<ExpenseRouter>['getExpensesWithFriend'];

type SingleExpenseOutput = ExpensesOutput[number];

type ExpenseComponent = React.FC<{
  e: SingleExpenseOutput;
  userId: number;
}>;

export const ExpenseList: React.FC<{
  userId: number;
  expenses?: ExpensesOutput;
  contactId: number;
  isGroup?: boolean;
  isLoading?: boolean;
}> = ({ userId, isGroup = false, expenses = [], contactId, isLoading }) => {
  if (!isLoading && expenses.length === 0) {
    return <NoExpenses />;
  }

  const { i18n } = useTranslationWithUtils();

  let lastDate: Date | null = null;

  return (
    <>
      {expenses.map((e) => {
        const currentDate = e.expenseDate;
        let isFirstOfMonth = false;

        if (
          lastDate === null ||
          currentDate.getMonth() !== lastDate.getMonth() ||
          currentDate.getFullYear() !== lastDate.getFullYear()
        ) {
          isFirstOfMonth = true;
        }

        lastDate = currentDate;

        const isSettlement = e.splitType === SplitType.SETTLEMENT;
        const isCurrencyConversion = e.splitType === SplitType.CURRENCY_CONVERSION;

        return (
          <React.Fragment key={e.id}>
            {isFirstOfMonth && (
              <div className="flex flex-row items-center justify-start gap-3 pt-2">
                <div className="text-xs font-medium text-gray-700 uppercase">
                  {new Intl.DateTimeFormat(i18n.language, {
                    month: 'long',
                    year: 'numeric',
                  }).format(currentDate)}
                </div>
                <Separator className="flex-1 bg-gray-800" />
              </div>
            )}
            <Link
              href={`/${isGroup ? 'groups' : 'balances'}/${contactId}/expenses/${e.id}`}
              className={cn('flex items-center justify-between', isFirstOfMonth ? 'pb-2' : 'py-2')}
            >
              {isSettlement && <Settlement e={e} userId={userId} />}
              {isCurrencyConversion && <CurrencyConversion e={e} userId={userId} />}
              {!isSettlement && !isCurrencyConversion && <Expense e={e} userId={userId} />}
            </Link>
          </React.Fragment>
        );
      })}
    </>
  );
};

const Expense: ExpenseComponent = ({ e, userId }) => {
  const { displayName, toUIDate, t, getCurrencyHelpersCached } = useTranslationWithUtils();
  const router = useRouter();
  const { friendId } = router.query;

  const youPaid = e.paidBy === userId && e.amount >= 0n;
  const yourExpense = e.expenseParticipants.find((participant) => participant.userId === userId);
  const theirExpense = e.expenseParticipants.find(
    (participant) => participant.userId.toString() === friendId,
  );
  const yourExpenseAmount = youPaid
    ? (theirExpense?.amount ?? yourExpense?.amount ?? 0n)
    : -(yourExpense?.amount ?? 0n);

  const { toUIString } = getCurrencyHelpersCached(e.currency);

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="inline-block max-w-min text-center text-xs text-gray-500">
          {toUIDate(e.expenseDate)}
        </div>
        <CategoryIcon category={e.category} className="size-5 text-gray-400" />
        <div>
          <p className="max-w-[180px] truncate text-sm lg:max-w-md lg:text-base">{e.name}</p>
          <p className="flex text-center text-xs text-gray-500">
            {displayName(e.paidByUser, userId)}{' '}
            {t(`ui.expense.user.${e.amount < 0n ? 'received' : 'paid'}`)} {toUIString(e.amount)}
          </p>
        </div>
      </div>
      <div className="min-w-10 shrink-0">
        {youPaid || 0n !== yourExpenseAmount ? (
          <>
            <div
              className={`text-right text-xs ${youPaid ? 'text-emerald-500' : 'text-orange-600'}`}
            >
              {t('actors.you')} {t(`ui.expense.you.${youPaid ? 'lent' : 'owe'}`)}
            </div>
            <div className={`text-right ${youPaid ? 'text-emerald-500' : 'text-orange-600'}`}>
              {toUIString(yourExpenseAmount)}
            </div>
          </>
        ) : (
          <div>
            <p className="text-xs text-gray-400">{t('ui.not_involved')}</p>
          </div>
        )}
      </div>
    </>
  );
};

const Settlement: ExpenseComponent = ({ e, userId }) => {
  const { displayName, toUIDate, t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const { toUIString } = getCurrencyHelpersCached(e.currency);

  const receiverId = e.expenseParticipants.find((p) => p.userId !== e.paidBy)?.userId;
  const userDetails = api.user.getUserDetails.useQuery({ userId: receiverId! });

  return (
    <div className="flex items-center gap-4">
      <div className="inline-block max-w-min text-center text-xs text-gray-500">
        {toUIDate(e.expenseDate)}
      </div>
      <SETTLEUP_ICON className="size-5 text-gray-400" />
      <div>
        <p className="flex text-center text-sm text-gray-400">
          {displayName(e.paidByUser, userId)}{' '}
          {t(`ui.expense.user.${e.amount < 0n ? 'received' : 'paid'}`)} {toUIString(e.amount)}{' '}
          {t('ui.expense.to')} {displayName(userDetails.data, userId)}
        </p>
      </div>
    </div>
  );
};

const CurrencyConversion: ExpenseComponent = ({ e, userId }) => {
  const { displayName, toUIDate, t, getCurrencyHelpersCached } = useTranslationWithUtils();

  const receiverId = e.expenseParticipants.find((p) => p.userId !== e.paidBy)?.userId;
  const userDetails = api.user.getUserDetails.useQuery({ userId: receiverId! });

  return (
    <div className="flex items-center gap-4">
      <div className="inline-block max-w-min text-center text-xs text-gray-500">
        {toUIDate(e.expenseDate)}
      </div>
      <CURRENCY_CONVERSION_ICON className="size-5 text-gray-400" />
      <div>
        <p className="max-w-[180px] truncate text-sm lg:max-w-md lg:text-base">
          {getCurrencyHelpersCached(e.currency).toUIString(e.amount)} ➡️{' '}
          {
            /* @ts-ignore */
            getCurrencyHelpersCached(e.conversionTo.currency).toUIString(e.conversionTo.amount)
          }
        </p>
        <p className="flex text-center text-xs text-gray-500">
          {t('ui.expense.for')} {displayName(e.paidByUser, userId)} {t('ui.and')}{' '}
          {displayName(userDetails.data, userId)}
        </p>
      </div>
    </div>
  );
};

const NoExpenses = () => (
  <div className="mt-20 flex flex-col items-center justify-center">
    <Image src="/add_expense.svg" alt="Empty" width={200} height={200} className="mb-4" />
  </div>
);
