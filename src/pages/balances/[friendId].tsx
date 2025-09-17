import { ChevronLeftIcon, PlusIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ExpenseList } from '~/components/Expense/ExpenseList';
import { DeleteFriend } from '~/components/Friend/DeleteFriend';
import { Export } from '~/components/Friend/Export';
import { SettleUp } from '~/components/Friend/Settleup';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { toUIString } from '~/utils/numbers';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { type GetServerSideProps } from 'next';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';

const FriendPage: NextPageWithUser = ({ user }) => {
  const { t, displayName } = useTranslationWithUtils();
  const router = useRouter();
  const { friendId } = router.query;

  const _friendId = parseInt(friendId as string);

  const friendQuery = api.user.getFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId },
  );

  const expenses = api.expense.getExpensesWithFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId },
  );
  const balances = api.user.getBalancesWithFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId },
  );

  const youLent = balances.data?.filter((b) => 0 < b.amount);
  const youOwe = balances.data?.filter((b) => 0 > b.amount);

  return (
    <>
      <Head>
        <title>
          {displayName(friendQuery.data)} | {t('ui.outstanding_balances')}
        </title>
      </Head>
      <MainLayout
        title={
          <div className="flex items-center gap-2">
            <Link href="/balances">
              <ChevronLeftIcon className="mr-1 h-6 w-6" />
            </Link>
            <p className="text-lg font-normal">{displayName(friendQuery.data)}</p>
          </div>
        }
        actions={
          <DeleteFriend
            friendId={_friendId}
            disabled={!(0 === youLent?.length && 0 === youOwe?.length)}
          />
        }
        header={
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/balances">
                <ChevronLeftIcon className="mr-1 h-6 w-6" />
              </Link>
              <EntityAvatar entity={friendQuery.data} size={25} />
              {displayName(friendQuery.data)}
            </div>
          </div>
        }
        loading={balances.isPending || expenses.isPending || friendQuery.isPending}
      >
        {!friendQuery.data ? null : (
          <div className="mb-28 transition-discrete starting:opacity-0">
            <div className="mx-4 flex flex-wrap gap-2">
              <div className="text-orange-700">
                {0 < (youOwe?.length ?? 0) && (
                  <>
                    {t('actors.you')} {t('ui.expense.you.owe')}{' '}
                    {youOwe?.map((bal, index) => (
                      <span key={bal.currency}>
                        <span className="font-semibold tracking-wide">
                          {bal.currency} {toUIString(bal.amount)}
                        </span>
                        {youOwe.length - 1 === index ? '' : ' + '}
                      </span>
                    ))}
                  </>
                )}
              </div>
              <div>{0 < (youOwe?.length ?? 0) && 0 < (youLent?.length ?? 0) ? '+' : null}</div>
              <div className="text-emerald-600">
                {0 < (youLent?.length ?? 0) && (
                  <>
                    {t('actors.you')} {t('ui.expense.you.lent')}{' '}
                    {youLent?.map((bal, index) => (
                      <span key={bal.currency}>
                        <span className="font-semibold tracking-wide">
                          {bal.currency} {toUIString(bal.amount)}
                        </span>
                        {youLent.length - 1 === index ? '' : ' + '}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
            <div className="mt-6 mb-4 flex justify-center gap-2">
              <SettleUp balances={balances.data} friend={friendQuery.data} />
              <Link href={`/add?friendId=${friendQuery.data.id}`}>
                <Button size="sm" variant="secondary" responsiveIcon>
                  <PlusIcon className="size-4" /> {t('ui.actions.add_expense')}
                </Button>
              </Link>
              <Export
                expenses={expenses.data}
                fileName={`expenses_with_${displayName(friendQuery.data)}`}
                currentUserId={user.id}
                friendName={displayName(friendQuery.data) ?? ''}
                friendId={friendQuery.data?.id ?? ''}
                disabled={!expenses.data || 0 === expenses.data.length}
              />
            </div>
            <Separator />
            <div className="mx-4 mt-4 flex flex-col gap-3">
              <ExpenseList
                expenses={expenses.data}
                contactId={_friendId}
                isLoading={expenses.isPending}
                userId={user.id}
              />
            </div>
          </div>
        )}
      </MainLayout>
    </>
  );
};

FriendPage.auth = true;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    ...(await customServerSideTranslations(context.locale, ['common', 'expense_details'])),
  },
});

export default FriendPage;
