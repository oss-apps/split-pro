import { type GetServerSideProps, type NextPage } from 'next';
import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { SplitType, type User } from '@prisma/client';
import { api } from '~/utils/api';
import { db } from '~/server/db';
import { UserAvatar } from '~/components/ui/avatar';
import Link from 'next/link';
import { Banknote, Bell, ChevronLeftIcon, DollarSign, PlusIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Separator } from '~/components/ui/separator';
import { Button } from '~/components/ui/button';
import { SettleUp } from '~/components/Friend/Settleup';
import { toUIString } from '~/utils/numbers';
import { CategoryIcon, CategoryIcons } from '~/components/ui/categoryIcons';

const FriendPage: NextPage<{ user: User; friend: User }> = ({ user, friend }) => {
  const expenses = api.user.getExpensesWithFriend.useQuery({ friendId: friend.id });
  const balances = api.user.getBalancesWithFriend.useQuery({ friendId: friend.id });

  const youLent = balances.data?.filter((b) => b.amount > 0);
  const youOwe = balances.data?.filter((b) => b.amount < 0);

  return (
    <>
      <Head>
        <title>Outstanding balances</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        user={user}
        title={
          <div className="flex items-center gap-2">
            <Link href="/balances">
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-lg font-normal">{friend.name}</p>
          </div>
        }
        header={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/balances">
                <ChevronLeftIcon className="mr-1 h-6 w-6" />
              </Link>
              <UserAvatar user={friend} size={25} />
              {friend.name}
            </div>
            <div></div>
          </div>
        }
      >
        <div className="mb-28">
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
          <div className="mb-4 mt-6 flex justify-center gap-2 px-2">
            {balances.data ? (
              <SettleUp
                balances={balances.data}
                key={`${friend.id}-${balances.data.length}`}
                friend={friend}
                currentUser={user}
              />
            ) : (
              <Button size="sm" variant="outline" className="gap-1 text-sm" disabled>
                Settle up
              </Button>
            )}

            <Link href={`/add?friendId=${friend.id}`}>
              <Button size="sm" variant="secondary" className="gap-1 text-sm">
                <PlusIcon className="h-4 w-4 text-gray-400" /> Add Expense
              </Button>
            </Link>
            <Button size="sm" className="gap-1 text-sm" variant="secondary">
              <Bell className="h-4 w-4 text-gray-400" />
              Remind
            </Button>
          </div>
          <Separator className="px-4" />
          <div className="mx-4 mt-4 flex  flex-col gap-3">
            {expenses.data?.map((e) => {
              const youPaid = e.paidBy === user.id;
              const yourExpense = e.expenseParticipants.find(
                (p) => p.userId === (youPaid ? friend.id : user.id),
              );
              const isSettlement = e.splitType === SplitType.SETTLEMENT;

              return (
                <Link
                  href={`/balances/${friend.id}/expenses/${e.id}`}
                  key={e.id}
                  className="flex items-center justify-between px-2 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">
                      {format(e.createdAt, 'MMM dd')
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
                      {!isSettlement ? <p>{e.name}</p> : null}
                      <p
                        className={`flex items-center text-center ${isSettlement ? 'text-sm text-gray-400' : 'text-xs text-gray-500'}`}
                      >
                        <span className={`text-[8px] ${isSettlement ? 'mr-1' : ''} `}>
                          {isSettlement ? '  🎉 ' : null}
                        </span>
                        <span>
                          {youPaid ? 'You' : friend.name} paid {e.currency} {toUIString(e.amount)}{' '}
                        </span>
                      </p>
                    </div>
                  </div>
                  {isSettlement ? null : (
                    <div>
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
        </div>
      </MainLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const serverState = await getServerAuthSessionForSSG(context);
  if (serverState.redirect) {
    return serverState;
  }

  const friendId = context.params?.friendId as string;

  if (!friendId) {
    return {
      notFound: true,
    };
  }

  const friend = await db.user.findUnique({
    where: {
      id: parseInt(friendId),
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return {
    props: {
      user: serverState.props.user,
      friend,
    },
  };
};

export default FriendPage;
