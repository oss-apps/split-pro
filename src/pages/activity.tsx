import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import { SplitType } from '@prisma/client';
import { api } from '~/utils/api';
import { format } from 'date-fns';
import { UserAvatar } from '~/components/ui/avatar';
import { toUIString } from '~/utils/numbers';
import Link from 'next/link';
import { type NextPageWithUser } from '~/types';
import { type User } from 'next-auth';
import { BalanceSkeleton } from '~/components/ui/skeleton';
import useEnableAfter from '~/hooks/useEnableAfter';
import { LoadingSpinner } from '~/components/ui/spinner';

function getPaymentString(
  user: User,
  amount: number,
  paidBy: number,
  expenseUserAmt: number,
  isSettlement: boolean,
  currency: string,
  isDeleted?: boolean,
) {
  if (isDeleted) {
    return null;
  } else if (isSettlement) {
    return (
      <div className={`${user.id === paidBy ? ' text-emerald-500' : 'text-orange-500'} text-sm`}>
        {user.id === paidBy ? 'You paid ' : 'You received '} {currency} {toUIString(amount)}
      </div>
    );
  } else {
    return (
      <div className={`${user.id === paidBy ? ' text-emerald-500' : 'text-orange-500'} text-sm`}>
        {user.id === paidBy
          ? `You lent ${currency}
        ${toUIString(Math.abs(expenseUserAmt))}`
          : `You owe ${currency} ${toUIString(expenseUserAmt)}`}
      </div>
    );
  }
}

const ActivityPage: NextPageWithUser = ({ user }) => {
  const expensesQuery = api.user.getAllExpenses.useQuery();
  const showProgress = useEnableAfter(350);

  return (
    <>
      <Head>
        <title>Activity</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout title="Activity">
        <div className=" h-full px-4">
          <div className="flex flex-col gap-4">
            {expensesQuery.isLoading ? (
              showProgress ? (
                <div className="mt-10 flex justify-center">
                  <LoadingSpinner className="text-primary" />
                </div>
              ) : null
            ) : (
              <>
                {!expensesQuery.data?.length ? (
                  <div className="mt-[30vh] text-center text-gray-400">No activities yet</div>
                ) : null}
                {expensesQuery.data?.map((e) => (
                  <Link href={`/expenses/${e.expenseId}`} key={e.expenseId} className="flex  gap-2">
                    <div className="mt-1">
                      <UserAvatar user={e.expense.paidByUser} size={30} />
                    </div>
                    <div>
                      {e.expense.deletedByUser ? (
                        <p className="text-red-500 opacity-70">
                          <span className="  font-semibold ">
                            {e.expense.deletedBy === user.id
                              ? 'You'
                              : e.expense.deletedByUser.name ?? e.expense.deletedByUser.email}
                          </span>
                          {' deleted the expense '}
                          <span className=" font-semibold ">{e.expense.name}</span>
                        </p>
                      ) : (
                        <p className="text-gray-300">
                          <span className="  font-semibold text-gray-300">
                            {e.expense.paidBy === user.id
                              ? 'You'
                              : e.expense.paidByUser.name ?? e.expense.paidByUser.email}
                          </span>
                          {' paid for '}
                          <span className=" font-semibold text-gray-300">{e.expense.name}</span>
                        </p>
                      )}

                      <div>
                        {getPaymentString(
                          user,
                          e.expense.amount,
                          e.expense.paidBy,
                          e.amount,
                          e.expense.splitType === SplitType.SETTLEMENT,
                          e.expense.currency,
                          !!e.expense.deletedBy,
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {format(e.expense.expenseDate, 'dd MMM')}
                      </p>
                    </div>
                  </Link>
                ))}
              </>
            )}
          </div>
          <div className="h-28"></div>
        </div>
      </MainLayout>
    </>
  );
};

ActivityPage.auth = true;

export default ActivityPage;
