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
import { api } from '~/utils/api';

// 🧾

const AddPage: NextPage<{
  user: User;
  group?: Group & { groupUsers: Array<GroupUser & { user: User }> };
  friend?: User;
}> = ({ user, group, friend }) => {
  const { setCurrentUser, setGroup, setParticipants, addOrUpdateParticipant, setCurrency } =
    useAddExpenseStore((s) => s.actions);
  const currentUser = useAddExpenseStore((s) => s.currentUser);
  const groupState = useAddExpenseStore((s) => s.group);

  useEffect(() => {
    setCurrentUser(user);
    setCurrency(user.currency ?? 'USD');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();
  const { friendId, groupId } = router.query;

  useEffect(() => {
    // Set group
    if (groupId && currentUser && group) {
      console.log('Setting group', group, groupId, currentUser, group, groupState !== group);
      setGroup(group);

      setParticipants([
        currentUser,
        ...group.groupUsers.map((gu) => gu.user).filter((u) => u.id !== currentUser.id),
      ]);
      useAddExpenseStore.setState({ showFriends: false });
    }
  }, [groupId, currentUser, group]);

  useEffect(() => {
    if (friendId && currentUser && friend) {
      setParticipants([currentUser, friend]);
      useAddExpenseStore.setState({ showFriends: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId, currentUser]);

  return (
    <>
      <Head>
        <title>Add Expense</title>
      </Head>
      <MainLayout user={user} hideAppBar>
        {currentUser ? <AddExpensePage /> : <div></div>}
      </MainLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const serverProps = await getServerAuthSessionForSSG(context);

  const friendId = context.query.friendId as string | undefined;

  if (serverProps.redirect) {
    return serverProps;
  }

  if (friendId) {
    const friendIdNumber = parseInt(friendId);
    const friend = await db.user.findUnique({
      where: {
        id: friendIdNumber,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
      },
    });

    if (!friend) {
      return {
        notFound: true,
      };
    }

    return {
      props: {
        ...serverProps.props,
        friend,
      },
    };
  }

  const groupId = context.query.groupId as string | undefined;

  if (groupId) {
    const groupIdNumber = parseInt(groupId);

    const group = await db.group.findUnique({
      where: {
        id: groupIdNumber,
      },

      include: {
        groupUsers: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return {
        notFound: true,
      };
    }
    const { createdAt, updatedAt, ...groupWithoutTimestamps } = group;

    return {
      props: {
        ...serverProps.props,
        group: groupWithoutTimestamps,
      },
    };
  }

  return serverProps;
};

export default AddPage;
