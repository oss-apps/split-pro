import { SplitType } from '@prisma/client';
import { type User } from 'next-auth';
import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '~/components/Layout/MainLayout';
import { UserAvatar } from '~/components/ui/avatar';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { BigMath, toUIString } from '~/utils/numbers';
import { toUIDate } from '~/utils/strings';
import { type TFunction } from 'next-i18next';
import { useTranslationWithUtils } from '~/hooks/useCommonTranslation';
import { withI18nStaticProps } from '~/utils/i18n/server';

function getPaymentString(
  user: User,
  amount: bigint,
  paidBy: number,
  expenseUserAmt: bigint,
  isSettlement: boolean,
  currency: string,
  t: TFunction,
  isDeleted?: boolean,
) {
  if (isDeleted) {
    return null;
  } else if (0n === expenseUserAmt) {
    return <div className="text-sm text-gray-400">{t('ui.not_involved')}</div>;
  } else if (isSettlement) {
    return (
      <div className={`${user.id === paidBy ? 'text-emerald-500' : 'text-orange-500'} text-sm`}>
        t('ui.actors.you'){' '}
        {user.id === paidBy ? t('ui.expense.you.paid') : t('ui.expense.you.received')} {currency}{' '}
        {toUIString(amount)}
      </div>
    );
  } else {
    return (
      <div className={`${user.id === paidBy ? 'text-emerald-500' : 'text-orange-500'} text-sm`}>
        {user.id === paidBy
          ? `${t('ui.actors.you')} ${t('ui.expense.you.lent')} ${currency} ${toUIString(BigMath.abs(expenseUserAmt))}`
          : `${t('ui.actors.you')} ${t('ui.expense.you.owe')} ${currency} ${toUIString(expenseUserAmt)}`}
      </div>
    );
  }
}

const ActivityPage: NextPageWithUser = ({ user }) => {
  const { displayName, t } = useTranslationWithUtils();
  const expensesQuery = api.expense.getAllExpenses.useQuery();

  return (
    <>
      <Head>
        <title>{t('navigation.activity')}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout title={t('navigation.activity')} loading={expensesQuery.isPending}>
        <div className="flex flex-col gap-4">
          {!expensesQuery.data?.length ? (
            <div className="mt-[30vh] text-center text-gray-400">{t('ui.no_activity')}</div>
          ) : null}
          {expensesQuery.data?.map((e) => (
            <Link href={`/expenses/${e.expenseId}`} key={e.expenseId} className="flex gap-2">
              <div className="mt-1">
                <UserAvatar user={e.expense.paidByUser} size={30} />
              </div>
              <div>
                {e.expense.deletedByUser ? (
                  <p className="text-red-500 opacity-70">
                    <span className="font-semibold">
                      {displayName(e.expense.deletedByUser, user.id)}
                    </span>{' '}
                    {t('ui.expense.user.deleted')}{' '}
                    <span className="font-semibold">{e.expense.name}</span>
                  </p>
                ) : (
                  <p className="text-gray-300">
                    <span className="font-semibold text-gray-300">
                      {displayName(e.expense.paidByUser, user.id)}
                    </span>{' '}
                    {t('ui.expense.user.paid')} {t('ui.expense.for')}{' '}
                    <span className="font-semibold text-gray-300">{e.expense.name}</span>
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
                    t,
                    !!e.expense.deletedBy,
                  )}
                </div>
                <p className="text-xs text-gray-500">{toUIDate(e.expense.expenseDate)}</p>
              </div>
            </Link>
          ))}
        </div>
      </MainLayout>
    </>
  );
};

ActivityPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default ActivityPage;
