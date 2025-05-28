import Avatar from 'boring-avatars';
import clsx from 'clsx';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  BarChartHorizontal,
  Check,
  ChevronLeft,
  DoorOpen,
  Info,
  Merge,
  Share,
  Trash2,
  UserPlus,
} from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { Fragment, useState } from 'react';
import { toast } from 'sonner';

import { BalanceList } from '~/components/Expense/BalanceList';
import { ExpenseList } from '~/components/Expense/ExpenseList';
import AddMembers from '~/components/group/AddMembers';
import GroupMyBalance from '~/components/group/GroupMyBalance';
import NoMembers from '~/components/group/NoMembers';
import MainLayout from '~/components/Layout/MainLayout';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import { UserAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { env } from '~/env';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { toUIString } from '~/utils/numbers';

const BalancePage: NextPageWithUser<{
  enableSendingInvites: boolean;
}> = ({ user, enableSendingInvites }) => {
  const router = useRouter();
  const groupId = parseInt(router.query.groupId as string);

  const groupDetailQuery = api.group.getGroupDetails.useQuery({ groupId });
  const groupTotalQuery = api.group.getGroupTotals.useQuery({ groupId });
  const expensesQuery = api.group.getExpenses.useQuery({ groupId });
  const deleteGroupMutation = api.group.delete.useMutation();
  const leaveGroupMutation = api.group.leaveGroup.useMutation();
  const toggleSimplifyDebtsMutation = api.group.toggleSimplifyDebts.useMutation();

  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const [showDeleteTrigger, setShowDeleteTrigger] = useState(false);
  const [showLeaveTrigger, setShowLeaveTrigger] = useState(false);

  async function inviteMembers() {
    if (!groupDetailQuery.data) return;
    const inviteLink =
      window.location.origin + '/join-group?groupId=' + groupDetailQuery.data.publicId;

    if (navigator.share) {
      navigator
        .share({
          title: `Join to ${groupDetailQuery.data.name} in Splitpro`,
          text: 'Join to the group and you can add, manage expenses, and track your balances',
          url: inviteLink,
        })
        .then(() => console.log('Successful share'))
        .catch((error) => console.log('Error sharing', error));
    } else {
      await navigator.clipboard.writeText(inviteLink);
      setIsInviteCopied(true);
      setTimeout(() => {
        setIsInviteCopied(false);
      }, 2000);
    }
  }

  const isAdmin = groupDetailQuery.data?.userId === user.id;
  const canDelete =
    groupDetailQuery.data?.userId === user.id &&
    !groupDetailQuery.data?.groupBalances.find((b) => b.amount !== 0);
  const canLeave = !groupDetailQuery.data?.groupBalances.find(
    (b) => b.amount !== 0 && b.userId === user.id,
  );

  function onGroupDelete() {
    deleteGroupMutation.mutate(
      { groupId },
      {
        onSuccess: () => {
          router.replace('/groups').catch(console.error);
          setShowDeleteTrigger(false);
        },
        onError: () => {
          setShowDeleteTrigger(false);
          toast.error('Something went wrong');
        },
      },
    );
  }

  function onGroupLeave() {
    leaveGroupMutation.mutate(
      { groupId },
      {
        onSuccess: () => {
          router.replace('/groups').catch(console.error);
          setShowLeaveTrigger(false);
        },
        onError: () => {
          setShowLeaveTrigger(false);
          toast.error('Something went wrong');
        },
      },
    );
  }

  console.log('expensesQuery.data', expensesQuery.data);

  return (
    <>
      <Head>
        <title>Group outstanding balances</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <MainLayout
        title={
          <div className="flex items-center">
            <Button
              variant="ghost"
              onClick={async () => {
                await router.replace(`/groups`);
              }}
              className="mr-2 p-0"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <p className="text-lg">{groupDetailQuery.data?.name}</p>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <AppDrawer
              title="Group statistics"
              trigger={<BarChartHorizontal className="h-6 w-6" />}
              className="h-[85vh]"
            >
              <div className="">
                <p className="font-semibold">Total expenses</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {groupTotalQuery.data?.map((total, index, arr) => {
                    return total._sum.amount != null ? (
                      <Fragment key={total.currency}>
                        <div className="flex flex-wrap gap-1">
                          {total.currency} {toUIString(total._sum.amount)}
                        </div>
                        {index < arr.length - 1 ? <span>+</span> : null}
                      </Fragment>
                    ) : null;
                  })}
                </div>
                {expensesQuery?.data && expensesQuery?.data?.length > 0 && (
                  <div className="mt-8">
                    <p className="font-semibold">First expense</p>
                    <p>
                      {expensesQuery.data[expensesQuery.data.length - 1]?.createdAt
                        ? format(
                            expensesQuery.data[expensesQuery.data.length - 1]!.createdAt,
                            'MMM dd, yyyy',
                          )
                        : '--'}
                    </p>
                  </div>
                )}
              </div>
            </AppDrawer>
            <AppDrawer
              title="Group info"
              trigger={<Info className="h-6 w-6" />}
              className="h-[85vh]"
            >
              <div className="">
                <p className="font-semibold">Members</p>
                <div className="mt-2 flex flex-col gap-2">
                  {groupDetailQuery.data?.groupUsers.map((groupUser) => (
                    <div
                      key={groupUser.userId}
                      className={clsx('flex items-center gap-2 rounded-md py-1.5')}
                    >
                      <UserAvatar user={groupUser.user} />
                      <p>{groupUser.user.name ?? groupUser.user.email}</p>
                    </div>
                  ))}
                </div>
              </div>
              {groupDetailQuery?.data?.createdAt && (
                <div className="mt-8">
                  <p className="font-semibold ">Group created</p>
                  <p>{format(groupDetailQuery.data?.createdAt, 'MMM dd, yyyy')}</p>
                </div>
              )}
              <div className="mt-8">
                <p className="font-semibold ">Actions</p>
                <div className="mt-2 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label htmlFor="simplify-debts" className="flex items-center">
                      <Merge className="mr-2 h-4 w-4" /> Simplify debts
                    </label>
                    <Switch
                      id="simplify-debts"
                      checked={groupDetailQuery.data?.simplifyDebts ?? false}
                      onCheckedChange={() => {
                        toggleSimplifyDebtsMutation.mutate(
                          { groupId },
                          {
                            onSuccess: () => {
                              void groupDetailQuery.refetch();
                            },
                            onError: () => {
                              toast.error('Failed to update setting');
                            },
                          },
                        );
                      }}
                    />
                  </div>
                  {isAdmin ? (
                    <>
                      <AlertDialog
                        open={showDeleteTrigger}
                        onOpenChange={(status) =>
                          status !== showDeleteTrigger ? setShowDeleteTrigger(status) : null
                        }
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="justify-start p-0 text-left text-red-500 hover:text-red-500 hover:opacity-90"
                            onClick={() => setShowDeleteTrigger(true)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete group
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-xs rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {canDelete ? 'Are you absolutely sure?' : ''}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {canDelete
                                ? 'This action cannot be reversed'
                                : "Can't delete the group until everyone settles up the balance"}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            {canDelete ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={onGroupDelete}
                                disabled={deleteGroupMutation.isLoading}
                                loading={deleteGroupMutation.isLoading}
                              >
                                Delete
                              </Button>
                            ) : null}
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  ) : (
                    <>
                      <AlertDialog
                        open={showLeaveTrigger}
                        onOpenChange={(status) =>
                          status !== showLeaveTrigger ? setShowLeaveTrigger(status) : null
                        }
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="justify-start p-0 text-left text-red-500 hover:text-red-500 hover:opacity-90"
                            onClick={() => setShowLeaveTrigger(true)}
                          >
                            <DoorOpen className="mr-2 h-5 w-5" /> Leave group
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-xs rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {canLeave ? 'Are you absolutely sure?' : ''}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {canLeave
                                ? 'This action cannot be reversed'
                                : "Can't leave the group until your outstanding balance is settled"}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            {canLeave ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={onGroupLeave}
                                disabled={leaveGroupMutation.isLoading}
                                loading={leaveGroupMutation.isLoading}
                              >
                                Leave
                              </Button>
                            ) : null}
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </div>
            </AppDrawer>
          </div>
        }
        header={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={async () => {
                await router.replace(`/groups`);
              }}
              className="mr-2 p-0"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Avatar
              size={30}
              name={groupDetailQuery.data?.name}
              variant="bauhaus"
              colors={['#80C7B7', '#D9C27E', '#F4B088', '#FFA5AA', '#9D9DD3']}
            />
            <p className="text-lg">{groupDetailQuery.data?.name}</p>
          </div>
        }
      >
        {groupDetailQuery.isLoading ? null : groupDetailQuery.data?.groupUsers.length === 1 &&
          !expensesQuery.data?.length ? (
          <NoMembers group={groupDetailQuery.data} enableSendingInvites={enableSendingInvites} />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-4 px-4">
              <GroupMyBalance
                userId={user.id}
                groupBalances={groupDetailQuery.data?.groupBalances ?? []}
                users={groupDetailQuery.data?.groupUsers.map((gu) => gu.user) ?? []}
              />
            </div>
            <div className=" mb-4 flex justify-center gap-2 overflow-y-auto border-b px-2 pb-4">
              <Link href={`/add?groupId=${groupId}`}>
                <Button size="sm" className="gap-1 text-sm lg:w-[180px]">
                  Add Expense
                </Button>
              </Link>
              <Button size="sm" className="gap-1 text-sm" variant="secondary">
                {groupDetailQuery.data ? (
                  <AddMembers
                    group={groupDetailQuery.data}
                    enableSendingInvites={enableSendingInvites}
                  >
                    <UserPlus className="h-4 w-4 text-gray-400" /> Add members
                  </AddMembers>
                ) : null}
              </Button>
              <Button
                size="sm"
                className="gap-1 text-sm lg:w-[180px]"
                variant="secondary"
                onClick={inviteMembers}
              >
                {isInviteCopied ? (
                  <>
                    <Check className="h-4 w-4 text-gray-400" /> Copied
                  </>
                ) : (
                  <>
                    <Share className="h-4 w-4 text-gray-400" /> Invite
                  </>
                )}
              </Button>
            </div>
            <Tabs defaultValue="expenses" className="px-2">
              <TabsList className="mx-auto grid w-full max-w-96 grid-cols-2">
                <TabsTrigger value="expenses">Expenses</TabsTrigger>
                <TabsTrigger value="balances">Balances</TabsTrigger>
              </TabsList>
              <TabsContent value="expenses">
                <ExpenseList
                  userId={user.id}
                  expenses={expensesQuery.data ?? []}
                  contactId={groupId}
                  isLoading={expensesQuery.isLoading}
                />
              </TabsContent>
              <TabsContent value="balances">
                <BalanceList
                  balances={groupDetailQuery.data?.groupBalances ?? []}
                  users={groupDetailQuery.data?.groupUsers.map((gu) => gu.user) ?? []}
                />
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </MainLayout>
    </>
  );
};

BalancePage.auth = true;

export default BalancePage;

export async function getServerSideProps() {
  return {
    props: {
      enableSendingInvites: env.ENABLE_SENDING_INVITES,
    },
  };
}
