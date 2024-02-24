import { type GetServerSideProps, type NextPage } from 'next';
import Head from 'next/head';
import { useState } from 'react';
import MainLayout from '~/components/Layout/MainLayout';
import Avatar from 'boring-avatars';
import clsx from 'clsx';
import { Separator } from '~/components/ui/separator';
import { Button } from '~/components/ui/button';
import {
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
  ArrowUpOnSquareIcon,
} from '@heroicons/react/24/outline';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { SplitType, type User } from '@prisma/client';
import { api } from '~/utils/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { UserAvatar } from '~/components/ui/avatar';
import { AppRouter } from '~/server/api/root';
import { toUIString } from '~/utils/numbers';

function getPaymentString(
  user: User,
  amount: number,
  paidBy: number,
  expenseUserAmt: number,
  isSettlement: boolean,
  currency: string,
) {
  if (isSettlement) {
    return (
      <div className={`${user.id === paidBy ? ' text-emerald-500' : 'text-orange-500'} text-sm`}>
        {user.id === paidBy ? 'You paid ' : 'You received '} {currency} {toUIString(amount)}
      </div>
    );
  } else {
    return (
      <div className={`${user.id === paidBy ? ' text-emerald-500' : 'text-orange-500'} text-sm`}>
        {user.id === paidBy
          ? `You paid ${currency}
        ${toUIString(amount - Math.abs(expenseUserAmt))}`
          : `You owe ${currency} ${toUIString(expenseUserAmt)}`}
      </div>
    );
  }
}

const ActivityPage: NextPage<{ user: User }> = ({ user }) => {
  const expensesQuery = api.user.getAllExpenses.useQuery();

  return (
    <>
      <Head>
        <title>Activity</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout user={user} title="Activity">
        <div className="h-full px-4">
          <div className="flex flex-col gap-4">
            {expensesQuery.data?.map((e) => (
              <div key={e.expenseId} className="flex  gap-2">
                <div className="mt-1">
                  <UserAvatar user={e.expense.paidByUser} size={30} />
                </div>
                <div>
                  <p className="text-gray-300">
                    <span className="  font-semibold text-gray-300">
                      {e.expense.paidBy === user.id
                        ? 'You'
                        : e.expense.paidByUser.name ?? e.expense.paidByUser.email}
                    </span>
                    {' paid for '}
                    <span className=" font-semibold text-gray-300">{e.expense.name}</span>
                  </p>
                  <p>
                    {getPaymentString(
                      user,
                      e.expense.amount,
                      e.expense.paidBy,
                      e.amount,
                      e.expense.splitType === SplitType.SETTLEMENT,
                      e.expense.currency,
                    )}
                  </p>
                  <p className="text-xs text-gray-500">{format(e.expense.expenseDate, 'dd MMM')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MainLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  return getServerAuthSessionForSSG(context);
};

export default ActivityPage;
