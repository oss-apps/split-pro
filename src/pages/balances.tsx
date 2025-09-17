import { ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { Download, PlusIcon } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback } from 'react';
import { DownloadAppDrawer } from '~/components/Account/DownloadAppDrawer';
import { BalanceEntry } from '~/components/Expense/BalanceEntry';
import MainLayout from '~/components/Layout/MainLayout';
import { NotificationModal } from '~/components/NotificationModal';
import { Button } from '~/components/ui/button';
import { useIsPwa } from '~/hooks/useIsPwa';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { toUIString } from '~/utils/numbers';

const BalancePage: NextPageWithUser = () => {
  const { t } = useTranslation();
  const isPwa = useIsPwa();
  const balanceQuery = api.expense.getBalances.useQuery();

  const shareWithFriends = useCallback(() => {
    if (navigator.share) {
      navigator
        .share({
          title: t('meta.application_name'),
          text: t('ui.share_text'),
          url: window.location.origin,
        })
        .then(() => console.info('Successful share'))
        .catch((error) => console.error('Error sharing', error));
    }
  }, [t]);

  return (
    <>
      <Head>
        <title>{t('meta.title')}</title>
      </Head>
      <MainLayout
        title={t('navigation.balances')}
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
                    <p className="text-sm">
                      {t('actors.you')} {t('ui.expense.you.owe')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 mb-2 flex flex-wrap justify-center gap-1">
                  {balanceQuery.data?.youOwe.map((balance, index) => (
                    <span key={balance.currency} className="flex gap-1">
                      <span className="text-orange-600">
                        {balance.currency.toUpperCase()} {toUIString(balance.amount)}
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
                    <p className="text-sm">
                      {t('actors.you')} {t('ui.expense.you.lent')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 mb-2 flex flex-wrap justify-center gap-1">
                  {balanceQuery.data?.youGet.map((balance, index) => (
                    <span key={balance.currency} className="flex gap-1">
                      <p className="text-emerald-500">
                        {balance.currency.toUpperCase()} {toUIString(balance.amount)}
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
            {balanceQuery.data?.balances.map((balance) => (
              <BalanceEntry
                key={balance.friend.id}
                id={balance.friend.id}
                entity={balance.friend}
                amount={balance.amount}
                isPositive={0n < balance.amount}
                currency={balance.currency}
                hasMore={balance.hasMore}
              />
            ))}

            {!balanceQuery.isPending && !balanceQuery.data?.balances.length ? (
              <div className="mt-[40vh] flex -translate-y-[130%] flex-col items-center justify-center gap-6">
                <DownloadAppDrawer>
                  <Button className="w-[250px]">
                    <Download className="mr-2 h-5 w-5 text-black" />
                    {t('account_page:ui.download_app')}
                  </Button>
                </DownloadAppDrawer>
                {!isPwa && <p>{t('ui.or', { ns: 'common' })}</p>}
                <Link href="/add">
                  <Button className="w-[250px]">
                    <PlusIcon className="mr-2 h-5 w-5 text-black" />
                    {t('actions.add_expense', { ns: 'common' })}
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

BalancePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common', 'account_page']);

export default BalancePage;
