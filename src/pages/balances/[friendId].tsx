import { motion } from 'framer-motion';
import { ChevronLeftIcon, PlusIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { ExpenseList } from '~/components/Expense/ExpenseList';
import { DeleteFriend } from '~/components/Friend/DeleteFriend';
import { Export } from '~/components/Friend/Export';
import { SettleUp } from '~/components/Friend/Settleup';
import MainLayout from '~/components/Layout/MainLayout';
import { UserAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { toUIString } from '~/utils/numbers';

const FriendPage: NextPageWithUser = ({ user }) => {
  const router = useRouter();
  const { friendId } = router.query;

  const _friendId = parseInt(friendId as string);

  const friendQuery = api.user.getFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId },
  );

  const expenses = api.user.getExpensesWithFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId },
  );
  const balances = api.user.getBalancesWithFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId },
  );

  const youLent = balances.data?.filter((b) => b.amount > 0);
  const youOwe = balances.data?.filter((b) => b.amount < 0);

  return (
    <>
      <Head>
        <title>Outstanding balances</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href="/balances">
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-lg font-normal">{friendQuery.data?.name}</p>
          </div>
        }
        actions={
          <DeleteFriend
            friendId={_friendId}
            disabled={!(youLent?.length === 0 && youOwe?.length === 0)}
          />
        }
        header={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/balances">
                <ChevronLeftIcon className="mr-1 h-6 w-6" />
              </Link>
              <UserAvatar user={friendQuery.data} size={25} />
              {friendQuery.data?.name}
            </div>
          </div>
        }
      >
        {balances.isPending ||
        expenses.isPending ||
        friendQuery.isPending ||
        !friendQuery.data ? null : (
          <motion.div className="mb-28" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mx-4 flex flex-wrap gap-2">
              <div className=" text-orange-700">
                {(youOwe?.length ?? 0) > 0 && (
                  <>
                    You owe{' '}
                    {youOwe?.map((b, index) => (
                      <span key={b.currency}>
                        <span className=" font-semibold tracking-wide">
                          {b.currency} {toUIString(b.amount)}
                        </span>
                        {youOwe.length - 1 === index ? '' : ' + '}
                      </span>
                    ))}
                  </>
                )}
              </div>
              <div>{(youOwe?.length ?? 0) > 0 && (youLent?.length ?? 0) > 0 ? '+' : null}</div>
              <div className=" text-emerald-600">
                {(youLent?.length ?? 0) > 0 && (
                  <>
                    You lent{' '}
                    {youLent?.map((b, index) => (
                      <span key={b.currency}>
                        <span className=" font-semibold tracking-wide">
                          {b.currency} {toUIString(b.amount)}
                        </span>
                        {youLent.length - 1 === index ? '' : ' + '}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="mb-4 mt-6 flex justify-center gap-2 px-2 ">
              {balances.data ? (
                <SettleUp
                  balances={balances.data}
                  key={`${friendQuery.data?.id}-${balances.data.length}`}
                  friend={friendQuery.data}
                  currentUser={user}
                />
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-[150px] gap-1 text-sm lg:w-[180px]"
                  disabled
                >
                  Settle up
                </Button>
              )}

              <Link href={`/add?friendId=${friendQuery.data.id}`}>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-[150px] gap-1 text-sm lg:w-[180px]"
                >
                  <PlusIcon className="h-4 w-4 text-gray-400" /> Add Expense
                </Button>
              </Link>
              <Export
                expenses={expenses.data ?? []}
                fileName={`expenses_with_${friendQuery.data?.name}`}
                currentUserId={user.id}
                friendName={friendQuery.data?.name ?? ''}
                friendId={friendQuery.data?.id ?? ''}
                disabled={!expenses.data || expenses.data.length === 0}
              />
              {/* <Button size="sm" className="gap-1 text-sm lg:w-[180px]" variant="secondary">
                <Bell className="h-4 w-4 text-gray-400" />
                Remind
              </Button> */}
            </div>
            <Separator className="px-4" />
            <div className="mx-4 mt-4 flex  flex-col gap-3">
              <ExpenseList
                expenses={expenses.data ?? []}
                contactId={_friendId}
                isLoading={expenses.isPending}
                userId={user.id}
              />
            </div>
          </motion.div>
        )}
      </MainLayout>
    </>
  );
};

FriendPage.auth = true;

export default FriendPage;
