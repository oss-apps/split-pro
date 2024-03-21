import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import { SplitType } from '@prisma/client';
import { api } from '~/utils/api';
import { UserAvatar } from '~/components/ui/avatar';
import Link from 'next/link';
import { ChevronLeftIcon, PlusIcon, Trash, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '~/components/ui/separator';
import { Button } from '~/components/ui/button';
import { SettleUp } from '~/components/Friend/Settleup';
import { toUIString } from '~/utils/numbers';
import { CategoryIcon } from '~/components/ui/categoryIcons';
import { useRouter } from 'next/router';
import { type NextPageWithUser } from '~/types';
import { motion } from 'framer-motion';
import { DeleteFriend } from '~/components/Friend/DeleteFriend';

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
          youLent?.length === 0 && youOwe?.length === 0 ? (
            <DeleteFriend friendId={_friendId} />
          ) : null
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
        {balances.isLoading ||
        expenses.isLoading ||
        friendQuery.isLoading ||
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
              {/* <Button size="sm" className="gap-1 text-sm lg:w-[180px]" variant="secondary">
                <Bell className="h-4 w-4 text-gray-400" />
                Remind
              </Button> */}
            </div>
            <Separator className="px-4" />
            <div className="mx-4 mt-4 flex  flex-col gap-3">
              {expenses.data?.map((e) => {
                const youPaid = e.paidBy === user.id;
                const yourExpense = e.expenseParticipants.find(
                  (p) => p.userId === (youPaid ? friendQuery.data?.id : user.id),
                );
                const isSettlement = e.splitType === SplitType.SETTLEMENT;

                return (
                  <Link
                    href={`/balances/${friendQuery.data?.id}/expenses/${e.id}`}
                    key={e.id}
                    className="flex items-start justify-between px-2 py-2"
                  >
                    <div className="flex items-center gap-3 px-1">
                      <div className="text-xs text-gray-500">
                        {format(e.expenseDate, 'MMM dd')
                          .split(' ')
                          .map((d) => (
                            <div className="text-center" key={d}>
                              {d}
                            </div>
                          ))}
                      </div>
                      <div className="">
                        <CategoryIcon category={e.category} className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        {!isSettlement ? (
                          <p className=" max-w-[180px] truncate text-sm lg:max-w-md lg:text-base">
                            {e.name}
                          </p>
                        ) : null}
                        <p
                          className={`flex ${isSettlement ? 'text-sm text-gray-400' : 'text-xs text-gray-500'}`}
                        >
                          <span className={`text-[8px] ${isSettlement ? 'mr-1' : ''} `}>
                            {isSettlement ? '  🎉 ' : null}
                          </span>
                          <span>
                            {youPaid ? 'You' : friendQuery.data?.name} paid {e.currency}{' '}
                            {toUIString(e.amount)}{' '}
                          </span>
                        </p>
                      </div>
                    </div>
                    {isSettlement ? null : (
                      <div className="min-w-10 shrink-0">
                        <div
                          className={`text-right text-xs ${youPaid ? 'text-emerald-500' : 'text-orange-700'}`}
                        >
                          {youPaid ? 'You lent' : 'You owe'}
                        </div>
                        <div
                          className={`text-right ${youPaid ? 'text-emerald-500' : 'text-orange-700'}`}
                        >
                          <span className="font-light ">{e.currency}</span>{' '}
                          {toUIString(yourExpense?.amount ?? 0)}
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </MainLayout>
    </>
  );
};

FriendPage.auth = true;

export default FriendPage;
