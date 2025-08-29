import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useTranslation } from 'next-i18next';
import { AddOrEditExpensePage } from '~/components/AddExpense/AddExpensePage';
import MainLayout from '~/components/Layout/MainLayout';
import { env } from '~/env';
import { parseCurrencyCode } from '~/lib/currency';
import { isStorageConfigured } from '~/server/storage';
import { useAddExpenseStore } from '~/store/addStore';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { type GetServerSideProps } from 'next';

const AddPage: NextPageWithUser<{
  isStorageConfigured: boolean;
  enableSendingInvites: boolean;
}> = ({ user, isStorageConfigured, enableSendingInvites }) => {
  const { t } = useTranslation('add_page');
  const {
    setCurrentUser,
    setGroup,
    setParticipants,
    setCurrency,
    setAmount,
    setDescription,
    setPaidBy,
    setAmountStr,
    setExpenseDate,
    setCategory,
    resetState,
  } = useAddExpenseStore((s) => s.actions);
  const currentUser = useAddExpenseStore((s) => s.currentUser);

  useEffect(() => () => resetState(), [resetState]);

  useEffect(() => {
    setCurrentUser({
      ...user,
      emailVerified: null,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
      obapiProviderId: user.obapiProviderId ?? null,
      bankingId: user.bankingId ?? null,
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();
  const { friendId, groupId, expenseId } = router.query;

  const _groupId = parseInt(groupId as string);
  const _friendId = parseInt(friendId as string);
  const _expenseId = expenseId as string;
  const groupQuery = api.group.getGroupDetails.useQuery(
    { groupId: _groupId },
    { enabled: !!_groupId && !_expenseId },
  );

  const friendQuery = api.user.getFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId && !_expenseId },
  );

  const expenseQuery = api.expense.getExpenseDetails.useQuery(
    { expenseId: _expenseId },
    { enabled: !!_expenseId },
  );

  useEffect(() => {
    // Set group
    if (groupId && !groupQuery.isPending && groupQuery.data && currentUser) {
      setGroup(groupQuery.data);

      setParticipants([
        currentUser,
        ...groupQuery.data.groupUsers
          .map((gu) => gu.user)
          .filter((user) => user.id !== currentUser.id),
      ]);
      useAddExpenseStore.setState({ showFriends: false });
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, groupQuery.isPending, groupQuery.data, currentUser]);

  useEffect(() => {
    if (friendId && currentUser && friendQuery.data) {
      setParticipants([currentUser, friendQuery.data]);
      useAddExpenseStore.setState({ showFriends: false });
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId, friendQuery.isPending, friendQuery.data, currentUser]);

  useEffect(() => {
    if (!_expenseId || !expenseQuery.data) {
      return;
    }

    if (expenseQuery.data.group) {
      setGroup(expenseQuery.data.group);
    }
    setPaidBy(expenseQuery.data.paidByUser);
    setCurrency(parseCurrencyCode(expenseQuery.data.currency));
    setAmountStr((Number(expenseQuery.data.amount) / 100).toString());
    setDescription(expenseQuery.data.name);
    setCategory(expenseQuery.data.category);
    setAmount(expenseQuery.data.amount);
    setParticipants(
      expenseQuery.data.expenseParticipants.map((ep) => ({
        ...ep.user,
        amount: ep.amount,
      })),
      expenseQuery.data.splitType,
    );
    useAddExpenseStore.setState({ showFriends: false });
    setExpenseDate(expenseQuery.data.expenseDate);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [_expenseId, expenseQuery.data]);

  return (
    <>
      <Head>
        <title>
          {_expenseId
            ? t('ui.actions.edit_expense', { ns: 'common' })
            : t('ui.actions.add_expense', { ns: 'common' })}
        </title>
      </Head>
      <MainLayout hideAppBar>
        {currentUser && (!_expenseId || expenseQuery.data) && (
          <AddOrEditExpensePage
            isStorageConfigured={isStorageConfigured}
            enableSendingInvites={enableSendingInvites}
            expenseId={_expenseId}
          />
        )}
      </MainLayout>
    </>
  );
};

AddPage.auth = true;

export default AddPage;

export const getServerSideProps: GetServerSideProps = async (context) => ({
  props: {
    isStorageConfigured: !!isStorageConfigured(),
    enableSendingInvites: !!env.ENABLE_SENDING_INVITES,
    ...(await customServerSideTranslations(context.locale, [
      'common',
      'expense_details',
      'categories',
      'currencies',
    ])),
  },
});
