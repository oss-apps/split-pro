import { type GroupUser, type Group, type User } from '@prisma/client';
import { type GetServerSideProps, type NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import { AddExpensePage } from '~/components/AddExpense/AddExpensePage';
import MainLayout from '~/components/Layout/MainLayout';
import { getServerAuthSessionForSSG } from '~/server/auth';
import { db } from '~/server/db';
import { useAddExpenseStore } from '~/store/addStore';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';

// 🧾

const AddPage: NextPageWithUser = ({ user }) => {
  const { setCurrentUser, setGroup, setParticipants, setCurrency } = useAddExpenseStore(
    (s) => s.actions,
  );
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
  const { friendId, groupId } = router.query;

  const _groupId = parseInt(groupId as string);
  const _friendId = parseInt(friendId as string);

  const groupQuery = api.group.getGroupDetails.useQuery(
    { groupId: _groupId },
    { enabled: !!_groupId },
  );

  const friendQuery = api.user.getFriend.useQuery(
    { friendId: _friendId },
    { enabled: !!_friendId },
  );

  useEffect(() => {
    // Set group
    if (groupId && !groupQuery.isLoading && groupQuery.data && currentUser) {
      setGroup(groupQuery.data);

      setParticipants([
        currentUser,
        ...groupQuery.data.groupUsers.map((gu) => gu.user).filter((u) => u.id !== currentUser.id),
      ]);
      useAddExpenseStore.setState({ showFriends: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, groupQuery.isLoading, groupQuery.data, currentUser]);

  useEffect(() => {
    if (friendId && currentUser && friendQuery.data) {
      setParticipants([currentUser, friendQuery.data]);
      useAddExpenseStore.setState({ showFriends: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId, friendQuery.isLoading, friendQuery.data, currentUser]);

  return (
    <>
      <Head>
        <title>Add Expense</title>
      </Head>
      <MainLayout hideAppBar>{currentUser ? <AddExpensePage /> : <div></div>}</MainLayout>
    </>
  );
};

AddPage.auth = true;

export default AddPage;
