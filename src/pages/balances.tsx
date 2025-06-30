import { ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { type User } from '@prisma/client';
import { clsx } from 'clsx';
import { PlusIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import i18nConfig from 'next-i18next.config.js';

import InstallApp from '~/components/InstallApp';
import MainLayout from '~/components/Layout/MainLayout';
import { NotificationModal } from '~/components/NotificationModal';
import { UserAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { toUIString } from '~/utils/numbers';

const BalancePage: NextPageWithUser = () => {
  const { t } = useTranslation('balances');
  const { t: tCommon } = useTranslation('common');
  const balanceQuery = api.expense.getBalances.useQuery();

  const shareWithFriends = () => {
    if (navigator.share) {
      navigator
        .share({
          title: t('share.title'),
          text: t('share.text'),
          url: t('share.url'),
        })
        .then(() => console.info('Successful share'))
        .catch((error) => console.error('Error sharing', error));
    }
  };

  return (
    <>
      <Head>
        <title>{t('meta.title')}</title>
      </Head>
      <MainLayout
        title={t('title')}
        t={tCommon}
        actions={
          'undefined' !== typeof window && !!window.navigator?.share ? (
            <Button variant="ghost" onClick={shareWithFriends}>
              <ArrowUpOnSquareIcon className="h-6 w-6" />
            </Button>
          ) : (
            <div className="h-6 w-10" />
          )
        }
        loading={balanceQuery.isPending}
      >
        <NotificationModal />
        <div className="">
          <div className="mx-4 flex items-stretch justify-between gap-4">
            {balanceQuery.data?.youOwe.length ? (
              <div className="w-1/2 rounded-2xl border px-2 py-2">
                {/* <ArrowLeftCircleIcon className=" h-6 w-6 rotate-45 transform text-gray-600" /> */}
                <div className="mt-2 px-1">
                  <div className="flex items-center justify-center gap-2 text-center">
                    {/* <ArrowLeftCircleIcon className=" h-6 w-6 rotate-45 transform text-orange-700" /> */}
                    <p className="text-sm">{t('you_owe')}</p>
                  </div>
                </div>
                <div className="mt-4 mb-2 flex flex-wrap justify-center gap-1">
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
              <div className="w-1/2 rounded-2xl border px-2 py-2">
                <div className="bg-opacity-40 mt-2 flex flex-col justify-center px-1">
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-sm">{t('you_get')}</p>
                  </div>
                </div>
                <div className="mt-4 mb-2 flex flex-wrap justify-center gap-1">
                  {balanceQuery.data?.youGet.map((b, index) => (
                    <span key={b.currency} className="flex gap-1">
                      <p className="text-emerald-500">
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

          <div className="mt-5 flex flex-col gap-8 pb-36">
            {balanceQuery.data?.balances.map((b) => (
              <FriendBalance
                key={b.friend.id}
                id={b.friend.id}
                friend={b.friend}
                amount={b.amount}
                isPositive={0n < b.amount}
                currency={b.currency}
                hasMore={b.hasMore}
              />
            ))}

            {!balanceQuery.isPending && !balanceQuery.data?.balances.length ? (
              <div className="mt-[40vh] flex -translate-y-[130%] flex-col items-center justify-center gap-6">
                <InstallApp />

                <Link href="/add">
                  <Button className="w-[250px]">
                    <PlusIcon className="mr-2 h-5 w-5 text-black" />
                    {t('add_expense')}
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
  amount: bigint;
  isPositive: boolean;
  currency: string;
  id: number;
  hasMore?: boolean;
}> = ({ friend, amount, isPositive, currency, id, hasMore }) => {
  const { t } = useTranslation('balances');
  
  return (
    <Link className="flex items-center justify-between" href={`/balances/${id}`}>
      <div className="flex items-center gap-3">
        <UserAvatar user={friend} />
        <div className="text-foreground">{friend.name ?? friend.email}</div>
      </div>
      {0n === amount ? (
        <div>
          <p className="text-xs">{t('settled_up')}</p>
        </div>
      ) : (
        <div>
          <div
            className={clsx(
              'text-right text-xs',
              isPositive ? 'text-emerald-500' : 'text-orange-600',
            )}
          >
            {isPositive ? t('you_get') : t('you_owe')}
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

export const getServerSideProps = async ({ locale }: { locale: string }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['balances', 'common'], i18nConfig)),
    },
  };
};

export default BalancePage;
