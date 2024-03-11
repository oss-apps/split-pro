import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import clsx from 'clsx';
import { Button } from '~/components/ui/button';
import { ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { type User } from '@prisma/client';
import { api } from '~/utils/api';
import Link from 'next/link';
import { toUIString } from '~/utils/numbers';
import { PlusIcon } from 'lucide-react';
import { UserAvatar } from '~/components/ui/avatar';
import InstallApp from '~/components/InstallApp';
import { type NextPageWithUser } from '~/types';
import useEnableAfter from '~/hooks/useEnableAfter';
import { LoadingSpinner } from '~/components/ui/spinner';
import { NotificationModal } from '~/components/NotificationModal';

const BalancePage: NextPageWithUser = () => {
  function shareWithFriends() {
    if (navigator.share) {
      navigator
        .share({
          title: 'SplitPro',
          text: "Check out SplitPro. It's an open source free alternative for Splitwise",
          url: 'https://splitpro.app',
        })
        .then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
    }
  }

  const balanceQuery = api.user.getBalances.useQuery();
  const showProgress = useEnableAfter(350);

  return (
    <>
      <Head>
        <title>Outstanding balances</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title="Balances"
        actions={
          typeof window !== 'undefined' && !!window.navigator?.share ? (
            <Button variant="ghost" onClick={shareWithFriends}>
              <ArrowUpOnSquareIcon className="h-6 w-6 " />
            </Button>
          ) : (
            <div className="h-6 w-10" />
          )
        }
      >
        <NotificationModal />
        <div className="">
          <div className="mx-4 flex items-stretch justify-between gap-4">
            {balanceQuery.data?.youOwe.length ? (
              <div className="w-1/2  rounded-2xl border px-2 py-2">
                {/* <ArrowLeftCircleIcon className=" h-6 w-6 rotate-45 transform text-gray-600" /> */}
                <div className="mt-2 px-1">
                  <div className="flex items-center justify-center gap-2 text-center">
                    {/* <ArrowLeftCircleIcon className=" h-6 w-6 rotate-45 transform text-orange-700" /> */}
                    <p className="text-sm">You owe</p>
                  </div>
                </div>
                <div className="mb-2 mt-4 flex flex-wrap justify-center gap-1">
                  {balanceQuery.data?.youOwe.map((b, index) => (
                    <span key={b.currency} className="flex gap-1">
                      <span className="text-orange-600">
                        {b.currency.toUpperCase()} {toUIString(b.amount)}
                      </span>
                      {index !== balanceQuery.data.youOwe.length - 1 ? (
                        <span className="">+</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {balanceQuery.data?.youGet.length ? (
              <div className="w-1/2 rounded-2xl border  px-2 py-2 ">
                <div className="mt-2 flex flex-col justify-center bg-opacity-40 px-1">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-sm">You get</p>
                  </div>
                </div>
                <div className="mb-2 mt-4 flex flex-wrap justify-center gap-1">
                  {balanceQuery.data?.youGet.map((b, index) => (
                    <span key={b.currency} className="flex gap-1">
                      <p className=" text-emerald-500">
                        {b.currency.toUpperCase()} {toUIString(b.amount)}
                      </p>{' '}
                      {index !== balanceQuery.data.youGet.length - 1 ? (
                        <span className="text-gray-400">+</span>
                      ) : null}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-col gap-8 px-4 pb-36">
            {balanceQuery.isLoading ? (
              showProgress ? (
                <div className="flex h-full w-full items-center justify-center">
                  <LoadingSpinner className="text-primary" />
                </div>
              ) : null
            ) : null}

            {balanceQuery.data?.balances.map((b) => (
              <FriendBalance
                key={b.friend.id}
                id={b.friend.id}
                friend={b.friend}
                amount={b.amount}
                isPositive={b.amount > 0}
                currency={b.currency}
                hasMore={b.hasMore}
              />
            ))}

            {!balanceQuery.isLoading && !balanceQuery.data?.balances.length ? (
              <div className="mt-[40vh] flex -translate-y-[130%] flex-col items-center justify-center gap-6">
                <InstallApp />

                <Link href="/add">
                  <Button className="w-[250px]">
                    <PlusIcon className="mr-2 h-5 w-5 text-black" />
                    Add Expense
                  </Button>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </MainLayout>
    </>
  );
};

const FriendBalance: React.FC<{
  friend: User;
  amount: number;
  isPositive: boolean;
  currency: string;
  id: number;
  hasMore?: boolean;
}> = ({ friend, amount, isPositive, currency, id, hasMore }) => {
  return (
    <Link className="flex items-center justify-between" href={`/balances/${id}`}>
      <div className="flex items-center gap-3">
        <UserAvatar user={friend} />
        <div className=" text-foreground">{friend.name ?? friend.email}</div>
      </div>
      {amount === 0 ? (
        <div>
          <p className="text-xs">Settled up</p>
        </div>
      ) : (
        <div>
          <div
            className={clsx(
              'text-right text-xs',
              isPositive ? 'text-emerald-500' : 'text-orange-600',
            )}
          >
            {isPositive ? 'you get' : 'you owe'}
          </div>
          <div className={`${isPositive ? 'text-emerald-500' : 'text-orange-600'} flex text-right`}>
            {currency} {toUIString(amount)}
            <span className="mt-0.5 text-xs">{hasMore ? '*' : ''}</span>
          </div>
        </div>
      )}
    </Link>
  );
};

BalancePage.auth = true;

export default BalancePage;
