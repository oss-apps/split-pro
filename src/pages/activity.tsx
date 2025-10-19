import { SplitType } from '@prisma/client';
import { type User } from 'next-auth';
import Head from 'next/head';
import Link from 'next/link';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { BigMath, getCurrencyHelpers } from '~/utils/numbers';
import { type TFunction } from 'next-i18next';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { withI18nStaticProps } from '~/utils/i18n/server';

function getPaymentString(
  user: User,
  amount: bigint,
  paidBy: number,
  expenseUserAmt: bigint,
  isSettlement: boolean,
  t: TFunction,
  toUIString: (value: bigint) => string,
  isDeleted?: boolean,
) {
  if (isDeleted) {
    return null;
  } else if (0n === expenseUserAmt) {
    return <div className="text-sm text-gray-400">{t('ui.not_involved')}</div>;
  } else if (isSettlement) {
    return (
      <div className={`${user.id === paidBy ? 'text-emerald-500' : 'text-orange-500'} text-sm`}>
        {t('ui.actors.you')}{' '}
        {user.id === paidBy ? t('ui.expense.you.paid') : t('ui.expense.you.received')}{' '}
        {toUIString(amount)}
      </div>
    );
  } else {
    return (
      <div
        className={`${(user.id === paidBy) !== amount < 0n ? 'text-emerald-500' : 'text-orange-500'} text-sm`}
      >
        {t(`ui.actors.you`)}{' '}
        {t(`ui.expense.you.${(user.id === paidBy) !== amount < 0n ? 'lent' : 'owe'}`)}{' '}
        {toUIString(expenseUserAmt)}
      </div>
    );
  }
}

const ActivityPage: NextPageWithUser = ({ user }) => {
  const { displayName, t, toUIDate, i18n } = useTranslationWithUtils();
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
          {expensesQuery.data?.map((e) => {
            const { toUIString } = getCurrencyHelpers({
              locale: i18n.language,
              currency: e.expense.currency,
            });

            return (
              <Link href={`/expenses/${e.expenseId}`} key={e.expenseId} className="flex gap-2">
                <div className="mt-1">
                  <EntityAvatar entity={e.expense.paidByUser} size={30} />
                </div>
                <div>
                  {e.expense.deletedByUser ? (
                    <p className="text-red-500 opacity-70">
                      <span className="font-semibold">
                        {displayName(e.expense.deletedByUser, user.id)}
                      </span>{' '}
                      {t(
                        `ui.expense.${e.expense.deletedByUser.id === user.id ? 'you' : 'user'}.deleted`,
                      )}{' '}
                      <span className="font-semibold">{e.expense.name}</span>
                    </p>
                  ) : (
                    <p className="text-gray-300">
                      <span className="font-semibold text-gray-300">
                        {displayName(e.expense.paidByUser, user.id)}
                      </span>{' '}
                      {t(
                        `ui.expense.${e.expense.paidByUser.id === user.id ? 'you' : 'user'}.${e.expense.amount > 0n ? 'paid' : 'received'}`,
                      )}{' '}
                      {toUIString(e.expense.amount)} {t('ui.expense.for')}{' '}
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
                      t,
                      toUIString,
                      !!e.expense.deletedBy,
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{toUIDate(e.expense.expenseDate)}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </MainLayout>
    </>
  );
};

ActivityPage.auth = true;

export const getStaticProps = withI18nStaticProps(['common']);

export default ActivityPage;
