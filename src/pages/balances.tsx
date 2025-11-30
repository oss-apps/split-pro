import { ArrowUpOnSquareIcon } from '@heroicons/react/24/outline';
import { Download, PlusIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useCallback } from 'react';
import { DownloadAppDrawer } from '~/components/Account/DownloadAppDrawer';
import { BalanceEntry } from '~/components/Expense/BalanceEntry';
import MainLayout from '~/components/Layout/MainLayout';
import { NotificationModal } from '~/components/NotificationModal';
import { Button } from '~/components/ui/button';
import {
  ConvertibleBalance,
  getConvertibleBalanceSessionKey,
} from '~/components/Expense/ConvertibleBalance';
import { useIsPwa } from '~/hooks/useIsPwa';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { withI18nStaticProps } from '~/utils/i18n/server';
import { cn } from '~/lib/utils';
import { useSession } from '~/hooks/useSession';
import { UI } from 'react-day-picker';
import { isCurrencyCode } from '~/lib/currency';

const BalancePage: NextPageWithUser = () => {
  const { t } = useTranslationWithUtils();
  const isPwa = useIsPwa();
  const balanceQuery = api.expense.getBalances.useQuery();

  const [totalBalancePreference, setTotalBalancePreference] = useSession(
    getConvertibleBalanceSessionKey(),
  );

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
            {isCurrencyCode(totalBalancePreference) ? (
              <CumulatedBalanceDisplay
                prefix={`${t('ui.total_balance')}`}
                cumulatedBalances={[
                  balanceQuery.data?.youOwe ?? [],
                  balanceQuery.data?.youGet ?? [],
                ].flat()}
                className="mx-auto"
              />
            ) : (
              <>
                <CumulatedBalanceDisplay
                  prefix={`${t('actors.you')} ${t('ui.expense.you.owe')}`}
                  cumulatedBalances={balanceQuery.data?.youOwe}
                />
                <CumulatedBalanceDisplay
                  prefix={`${t('actors.you')} ${t('ui.expense.you.lent')}`}
                  cumulatedBalances={balanceQuery.data?.youGet}
                />
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-8 pb-36">
          {balanceQuery.data?.balances.map((balance) => (
            <BalanceEntry
              key={balance.friend.id}
              id={balance.friend.id}
              entity={balance.friend}
              balances={balance.currencies}
            />
          ))}

          {!balanceQuery.isPending && !balanceQuery.data?.balances.length ? (
            <div className="mt-[40vh] flex -translate-y-[130%] flex-col items-center justify-center gap-6">
              <DownloadAppDrawer>
                <Button className="w-[250px]">
                  <Download className="mr-2 h-5 w-5 text-black" />
                  {t('account.download_app')}
                </Button>
              </DownloadAppDrawer>
              {!isPwa && <p>{t('ui.or')}</p>}
              <Link href="/add">
                <Button className="w-[250px]">
                  <PlusIcon className="mr-2 h-5 w-5 text-black" />
                  {t('actions.add_expense')}
                </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </MainLayout>
    </>
  );
};

const CumulatedBalanceDisplay: React.FC<{
  prefix?: string;
  className?: string;
  cumulatedBalances?: { currency: string; amount: bigint }[];
}> = ({ prefix = '', className = '', cumulatedBalances }) => {
  if (!cumulatedBalances || cumulatedBalances.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-1/2 rounded-2xl border px-2 py-2', className)}>
      <div className="mt-2 px-1">
        <div className="flex items-center justify-center gap-2 text-center">
          <p className="text-sm">{prefix}</p>
        </div>
      </div>
      <div className="mt-4 mb-2 flex flex-wrap justify-center gap-1">
        <ConvertibleBalance balances={cumulatedBalances} showMultiOption />
      </div>
    </div>
  );
};

BalancePage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default BalancePage;
