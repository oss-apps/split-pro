import { SplitType } from '@prisma/client';
import { type inferRouterOutputs } from '@trpc/server';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { CategoryIcon } from '~/components/ui/categoryIcons';
import type { ExpenseRouter } from '~/server/api/routers/expense';
import { toUIString } from '~/utils/numbers';
import { toUIDate } from '~/utils/strings';
import { useTranslationWithUtils } from '~/hooks/useCommonTranslation';

export const ExpenseList: React.FC<{
  userId: number;
  expenses?:
    | inferRouterOutputs<ExpenseRouter>['getGroupExpenses']
    | inferRouterOutputs<ExpenseRouter>['getExpensesWithFriend'];
  contactId: number;
  isGroup?: boolean;
  isLoading?: boolean;
}> = ({ userId, isGroup = false, expenses = [], contactId, isLoading }) => {
  const { displayName, t } = useTranslationWithUtils(['expense_details']);

  return (
    <>
      {expenses.map((e) => {
        const youPaid = e.paidBy === userId;
        const yourExpense = e.expenseParticipants.find(
          (partecipant) => partecipant.userId === userId,
        );
        const isSettlement = e.splitType === SplitType.SETTLEMENT;
        const yourExpenseAmount = youPaid
          ? (yourExpense?.amount ?? 0n)
          : -(yourExpense?.amount ?? 0n);

        return (
          <Link
            href={`/${isGroup ? 'groups' : 'balances'}/${contactId}/expenses/${e.id}`}
            key={e.id}
            className="flex items-center justify-between py-2"
          >
            <div className="flex items-center gap-4">
              <div className="inline-block max-w-min text-center text-xs text-gray-500">
                {toUIDate(e.expenseDate)}
              </div>
              <div>
                <CategoryIcon category={e.category} className="h-5 w-5 text-gray-400" />
              </div>
              <div>
                {!isSettlement ? (
                  <p className="max-w-[180px] truncate text-sm lg:max-w-md lg:text-base">
                    {e.name}
                  </p>
                ) : null}
                <p
                  className={`flex text-center ${isSettlement ? 'text-sm text-gray-400' : 'text-xs text-gray-500'}`}
                >
                  <span className="text-[10px]">{isSettlement ? '  🎉  ' : null}</span>
                  {displayName(e.paidByUser, userId)} {t('ui.expense.user.paid', { ns: 'common' })}{' '}
                  {e.currency} {toUIString(e.amount)}
                </p>
              </div>
            </div>
            {isSettlement ? null : (
              <div className="min-w-10 shrink-0">
                {youPaid || 0n !== yourExpenseAmount ? (
                  <>
                    <div
                      className={`text-right text-xs ${youPaid ? 'text-emerald-500' : 'text-orange-600'}`}
                    >
                      {t('ui.actors.you', { ns: 'common' })}{' '}
                      {t(`ui.expense.you.${youPaid ? 'lent' : 'owe'}`, { ns: 'common' })}
                    </div>
                    <div
                      className={`text-right ${youPaid ? 'text-emerald-500' : 'text-orange-600'}`}
                    >
                      <span className="font-light">{e.currency}</span>{' '}
                      {toUIString(yourExpenseAmount)}
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-xs text-gray-400">
                      {t('ui.not_involved', { ns: 'common' })}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Link>
        );
      })}
      {0 === expenses.length && !isLoading ? (
        <div className="mt-20 flex flex-col items-center justify-center">
          <Image src="/add_expense.svg" alt="Empty" width={200} height={200} className="mb-4" />
        </div>
      ) : null}
    </>
  );
};
