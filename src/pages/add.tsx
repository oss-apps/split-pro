import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

import { AddOrEditExpensePage } from '~/components/AddExpense/AddExpensePage';
import MainLayout from '~/components/Layout/MainLayout';
import { env } from '~/env';
import { type CurrencyCode } from '~/lib/currency';
import { isStorageConfigured } from '~/server/storage';
import { useAddExpenseStore } from '~/store/addStore';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';

const AddPage: NextPageWithUser<{
  isStorageConfigured: boolean;
  enableSendingInvites: boolean;
}> = ({ user, isStorageConfigured, enableSendingInvites }) => {
  const {
    setCurrentUser,
    setGroup,
    setParticipants,
    setCurrency,
    setAmount,
    setDescription,
    setPaidBy,
    setAmountStr,
    setSplitType,
    setExpenseDate,
  } = useAddExpenseStore((s) => s.actions);
  const currentUser = useAddExpenseStore((s) => s.currentUser);

  useEffect(() => {
    setCurrentUser({
      ...user,
      emailVerified: null,
      name: user.name ?? null,
      email: user.email ?? null,
      image: user.image ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();
  const { friendId, groupId, expenseId } = router.query;

  const _groupId = parseInt(groupId as string);
  const _friendId = parseInt(friendId as string);
  const _expenseId = expenseId as string;
  const groupQuery = api.group.getGroupDetails.useQuery(
    { groupId: _groupId },
    { enabled: !!_groupId },
  );

  const friendQuery = api.user.getFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId },
  );

  const expenseQuery = api.user.getExpenseDetails.useQuery(
    { expenseId: _expenseId },
    { enabled: !!_expenseId, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    // Set group
    if (groupId && !groupQuery.isPending && groupQuery.data && currentUser) {
      setGroup(groupQuery.data);

      setParticipants([
        currentUser,
        ...groupQuery.data.groupUsers.map((gu) => gu.user).filter((u) => u.id !== currentUser.id),
      ]);
      useAddExpenseStore.setState({ showFriends: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, groupQuery.isPending, groupQuery.data, currentUser]);

  useEffect(() => {
    if (friendId && currentUser && friendQuery.data) {
      setParticipants([currentUser, friendQuery.data]);
      useAddExpenseStore.setState({ showFriends: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId, friendQuery.isPending, friendQuery.data, currentUser]);

  useEffect(() => {
    if (_expenseId && expenseQuery.data) {
      expenseQuery.data.group && setGroup(expenseQuery.data.group);
      setParticipants(
        expenseQuery.data.expenseParticipants.map((ep) => ({
          ...ep.user,
          amount: ep.amount,
        })),
      );
      setCurrency(expenseQuery.data.currency as CurrencyCode);
      setAmountStr(expenseQuery.data.amount.toString());
      setDescription(expenseQuery.data.name);
      setPaidBy(expenseQuery.data.paidByUser);
      setAmount(expenseQuery.data.amount);
      setSplitType(expenseQuery.data.splitType);
      useAddExpenseStore.setState({ showFriends: false });
      setExpenseDate(expenseQuery.data.expenseDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_expenseId, expenseQuery.data]);

  return (
    <>
      <Head>
        <title>Add Expense</title>
      </Head>
      <MainLayout hideAppBar>
        {currentUser && (!_expenseId || expenseQuery.data) ? (
          <AddOrEditExpensePage
            isStorageConfigured={isStorageConfigured}
            enableSendingInvites={enableSendingInvites}
            expenseId={_expenseId}
          />
        ) : (
          <div></div>
        )}
      </MainLayout>
    </>
  );
};

AddPage.auth = true;

export default AddPage;

export async function getServerSideProps() {
  return {
    props: {
      isStorageConfigured: !!isStorageConfigured(),
      enableSendingInvites: !!env.ENABLE_SENDING_INVITES,
    },
  };
}
