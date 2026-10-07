import { ChevronLeftIcon, HandCoins, Pencil, PlusIcon } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { DefaultSplitSettings } from '~/components/DefaultSplit/DefaultSplitSettings';
import { ExpenseList } from '~/components/Expense/ExpenseList';
import { DeleteFriend } from '~/components/Friend/DeleteFriend';
import { Export } from '~/components/Friend/Export';
import { SettleUp } from '~/components/Friend/Settleup';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { type GetServerSideProps } from 'next';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { CumulatedBalances } from '~/components/Expense/CumulatedBalances';
import { deserializeDefaultSplit } from '~/lib/defaultSplit';

const FriendPage: NextPageWithUser = ({ user }) => {
  const { t, displayName } = useTranslationWithUtils();
  const router = useRouter();
  const { friendId } = router.query;

  const _friendId = parseInt(Array.isArray(friendId) ? (friendId[0] ?? '') : (friendId ?? ''));

  const friendQuery = api.user.getFriend.useQuery(
    { friendId: _friendId },
    { enabled: Boolean(_friendId) },
  );

  const expenses = api.expense.getExpensesWithFriend.useQuery(
    { friendId: _friendId },
    { enabled: Boolean(_friendId) },
  );
  const balances = api.user.getBalancesWithFriend.useQuery(
    { friendId: _friendId },
    { enabled: Boolean(_friendId) },
  );
  const upsertFriendDefaultSplitMutation = api.user.upsertFriendDefaultSplit.useMutation();
  const clearFriendDefaultSplitMutation = api.user.clearFriendDefaultSplit.useMutation();

  // Aggregate balances by currency for CumulatedBalances display
  const aggregatedBalances = useMemo(() => {
    if (!balances.data) {
      return undefined;
    }

    const currencyMap = new Map<string, bigint>();
    for (const b of balances.data) {
      const current = currencyMap.get(b.currency) ?? 0n;
      currencyMap.set(b.currency, current + b.amount);
    }

    return Array.from(currencyMap.entries())
      .filter(([, amount]) => 0n !== amount)
      .map(([currency, amount]) => ({ currency, amount }));
  }, [balances.data]);

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
          <div className="flex items-center gap-2">
            <DeleteFriend friendId={_friendId} disabled={!(0 === balances.data?.length)} />
            <AppDrawer
              title={t('balances.user_preferences.title')}
              trigger={
                <Button variant="ghost" size="icon" disabled={!friendQuery.data}>
                  <Pencil className="size-4" />
                </Button>
              }
            >
              {!friendQuery.data ? null : (
                <div>
                  <p className="font-semibold">{t('group_details.group_info.default_split')}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <DefaultSplitSettings
                      participants={[
                        {
                          ...user,
                          emailVerified: null,
                          name: user.name ?? null,
                          email: user.email ?? null,
                          image: user.image ?? null,
                          obapiProviderId: user.obapiProviderId ?? null,
                          bankingId: user.bankingId ?? null,
                          preferredLanguage: user.preferredLanguage ?? '',
                          hiddenFriendIds: user.hiddenFriendIds ?? [],
                          currency: user.currency ?? 'USD',
                          defaultCurrency: user.defaultCurrency ?? null,
                        },
                        friendQuery.data,
                      ]}
                      defaultSplit={friendQuery.data.defaultSplit}
                      triggerLabel={t('group_details.group_info.configure_default_split')}
                      onSave={(defaultSplit) => {
                        upsertFriendDefaultSplitMutation.mutate(
                          {
                            friendId: friendQuery.data!.id,
                            defaultSplit,
                          },
                          {
                            onSuccess: () => {
                              toast.success(t('balances.default_split.updated'));
                              void friendQuery.refetch();
                            },
                            onError: () => {
                              toast.error(t('errors.setting_update_failed'));
                            },
                          },
                        );
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={
                        !deserializeDefaultSplit(friendQuery.data.defaultSplit) ||
                        clearFriendDefaultSplitMutation.isPending
                      }
                      onClick={() => {
                        clearFriendDefaultSplitMutation.mutate(
                          { friendId: friendQuery.data!.id },
                          {
                            onSuccess: () => {
                              toast.success(t('balances.default_split.cleared'));
                              void friendQuery.refetch();
                            },
                            onError: () => {
                              toast.error(t('errors.setting_update_failed'));
                            },
                          },
                        );
                      }}
                    >
                      {t('expense_details.clear')}
                    </Button>
                  </div>
                </div>
              )}
            </AppDrawer>
          </div>
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
            <CumulatedBalances entityId={friendQuery.data.id} balances={aggregatedBalances} />
            <div className="mt-6 mb-4 flex justify-center gap-2">
              <SettleUp balances={balances.data} friend={friendQuery.data}>
                <Button
                  size="sm"
                  className="flex w-[150px] items-center gap-2 rounded-md border bg-cyan-500 px-3 text-sm font-normal text-black focus:bg-cyan-600 focus:ring-0 focus-visible:outline-hidden lg:w-[180px]"
                  disabled={!balances.data?.length}
                >
                  <HandCoins className="size-4" /> {t('actions.settle_up')}
                </Button>
              </SettleUp>
              <Link href={`/add?friendId=${friendQuery.data.id}`}>
                <Button size="sm" variant="secondary" responsiveIcon>
                  <PlusIcon className="size-4" /> {t('actions.add_expense')}
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
            <ExpenseList
              expenses={expenses.data}
              contactId={_friendId}
              isLoading={expenses.isPending}
              userId={user.id}
            />
          </div>
        )}
      </MainLayout>
    </>
  );
};

FriendPage.auth = true;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    ...(await customServerSideTranslations(context.locale, ['common'])),
  },
});

export default FriendPage;
