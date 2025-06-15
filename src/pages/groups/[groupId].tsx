import Avatar from 'boring-avatars';
import clsx from 'clsx';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  BarChartHorizontal,
  Check,
  ChevronLeft,
  Construction,
  DoorOpen,
  Info,
  Merge,
  Share,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { Fragment, useState } from 'react';
import { toast } from 'sonner';

import { UpdateName } from '~/components/Account/UpdateDetails';
import { BalanceList } from '~/components/Expense/BalanceList';
import { ExpenseList } from '~/components/Expense/ExpenseList';
import AddMembers from '~/components/group/AddMembers';
import GroupMyBalance from '~/components/group/GroupMyBalance';
import NoMembers from '~/components/group/NoMembers';
import MainLayout from '~/components/Layout/MainLayout';
import { UserAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { Label } from '~/components/ui/label';
import { SimpleConfirmationDialog } from '~/components/ui/SimpleConfirmationDialog';
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
  const updateGroupDetailsMutation = api.group.updateGroupDetails.useMutation();
  const recalculateGroupBalancesMutation = api.group.recalculateBalances.useMutation();

  const [isInviteCopied, setIsInviteCopied] = useState(false);

  async function inviteMembers() {
    if (!groupDetailQuery.data) {
      return;
    }
    const inviteLink =
      window.location.origin + '/join-group?groupId=' + groupDetailQuery.data.publicId;

    if (navigator.share) {
      navigator
        .share({
          title: `Join to ${groupDetailQuery.data.name} in Splitpro`,
          text: 'Join to the group and you can add, manage expenses, and track your balances',
          url: inviteLink,
        })
        .then(() => console.info('Successful share'))
        .catch((error) => console.error('Error sharing', error));
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
    !groupDetailQuery.data?.groupBalances.find((b) => 0n !== b.amount);
  const canLeave = !groupDetailQuery.data?.groupBalances.find(
    (b) => 0n !== b.amount && b.userId === user.id,
  );

  function onRecalculateBalances() {
    recalculateGroupBalancesMutation.mutate(
      { groupId },
      {
        onSuccess: () => {
          void groupDetailQuery.refetch();
          toast.success('Balances recalculated successfully');
        },
        onError: () => {
          toast.error('Something went wrong');
        },
      },
    );
  }

  function onGroupDelete() {
    deleteGroupMutation.mutate(
      { groupId },
      {
        onSuccess: () => {
          router.replace('/groups').catch(console.error);
        },
        onError: () => {
          toast.error('Something went wrong');
        },
      },
    );
  }

  function onGroupLeave(userId?: number) {
    leaveGroupMutation.mutate(
      { groupId, userId },
      {
        onSuccess: () => {
          if (!userId) {
            router.replace('/groups').catch(console.error);
          } else {
            groupDetailQuery.refetch().catch(console.error);
          }
        },
        onError: () => {
          toast.error('Something went wrong');
        },
      },
    );
  }

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
                    return null != total._sum.amount ? (
                      <Fragment key={total.currency}>
                        <div className="flex flex-wrap gap-1">
                          {total.currency} {toUIString(total._sum.amount)}
                        </div>
                        {index < arr.length - 1 ? <span>+</span> : null}
                      </Fragment>
                    ) : null;
                  })}
                </div>
                {expensesQuery?.data && 0 < expensesQuery?.data?.length && (
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
              <>
                <div className="flex items-center justify-between">
                  <div className="text-primary text-xl font-semibold">
                    {groupDetailQuery.data?.name ?? ''}
                  </div>
                  {isAdmin && (
                    <UpdateName
                      className="mr-2 size-5"
                      defaultName={groupDetailQuery.data?.name ?? ''}
                      onNameSubmit={async (values) => {
                        try {
                          await updateGroupDetailsMutation.mutateAsync({
                            groupId,
                            name: values.name,
                          });
                          toast.success('Updated group name', { duration: 1500 });
                          await groupDetailQuery.refetch();
                        } catch (error) {
                          toast.error('Error in updating group name');
                          console.error(error);
                        }
                      }}
                    />
                  )}
                </div>

                <p className="mt-5 font-semibold">Members</p>
                <div className="mt-2 flex flex-col gap-2">
                  {groupDetailQuery.data?.groupUsers.map((groupUser) => (
                    <div key={groupUser.userId} className="flex items-center justify-between">
                      <div className={clsx('flex items-center gap-2 rounded-md py-1.5')}>
                        <UserAvatar user={groupUser.user} />
                        <p>{groupUser.user.name ?? groupUser.user.email}</p>
                      </div>
                      {groupUser.userId === groupDetailQuery.data?.userId ? (
                        <p className="text-sm text-gray-400">owner</p>
                      ) : (
                        isAdmin &&
                        (() => {
                          const canLeave = !groupDetailQuery.data?.groupBalances.find(
                            (b) => 0n !== b.amount && b.userId === groupUser.userId,
                          );

                          return (
                            <SimpleConfirmationDialog
                              title={canLeave ? 'Are you absolutely sure?' : ''}
                              description={
                                canLeave
                                  ? 'You are about to remove this member from the group'
                                  : "Can't remove member until their outstanding balance is settled"
                              }
                              hasPermission={canLeave}
                              onConfirm={() => onGroupLeave(groupUser.userId)}
                              loading={leaveGroupMutation.isPending}
                              variant="destructive"
                            >
                              <Button
                                variant="ghost"
                                className="justify-start p-0 text-left text-red-500 hover:text-red-500 hover:opacity-90"
                              >
                                <X className="mr-2 h-5 w-5" />
                              </Button>
                            </SimpleConfirmationDialog>
                          );
                        })()
                      )}
                    </div>
                  ))}
                </div>
              </>
              {groupDetailQuery?.data?.createdAt && (
                <div className="mt-8">
                  <p className="font-semibold">Group created</p>
                  <p>{format(groupDetailQuery.data?.createdAt, 'MMM dd, yyyy')}</p>
                </div>
              )}
              <div className="mt-8">
                <p className="font-semibold">Actions</p>
                <div className="child:h-7 mt-2 flex flex-col">
                  <Label className="flex cursor-pointer items-center justify-between">
                    <p className="flex items-center">
                      <Merge className="mr-2 size-4" /> Simplify debts
                    </p>
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
                  </Label>
                  {isAdmin && (
                    <SimpleConfirmationDialog
                      title="Are you sure?"
                      description="If balances do not match expenses, you can recalculate them. Note that it may take some time if the expense count is large. Balances outside the group will not be affected."
                      hasPermission
                      onConfirm={onRecalculateBalances}
                      loading={recalculateGroupBalancesMutation.isPending}
                      variant="default"
                    >
                      <Button variant="ghost" className="text-primary justify-start p-0 text-left">
                        <Construction className="mr-2 h-5 w-5" /> Recalculate balances
                      </Button>
                    </SimpleConfirmationDialog>
                  )}
                  {isAdmin ? (
                    <SimpleConfirmationDialog
                      title={canDelete ? 'Are you absolutely sure?' : ''}
                      description={
                        canDelete
                          ? 'This action cannot be reversed'
                          : "Can't delete the group until everyone settles up the balance"
                      }
                      hasPermission={canDelete}
                      onConfirm={onGroupDelete}
                      loading={deleteGroupMutation.isPending}
                      variant="destructive"
                    >
                      <Button
                        variant="ghost"
                        className="justify-start p-0 text-left text-red-500 hover:text-red-500 hover:opacity-90"
                      >
                        <Trash2 className="mr-2 size-4" /> Delete group
                      </Button>
                    </SimpleConfirmationDialog>
                  ) : (
                    <SimpleConfirmationDialog
                      title={canLeave ? 'Are you absolutely sure?' : ''}
                      description={
                        canLeave
                          ? 'This action cannot be reversed'
                          : "Can't leave the group until your outstanding balance is settled"
                      }
                      hasPermission={canLeave}
                      onConfirm={onGroupLeave}
                      loading={leaveGroupMutation.isPending}
                      variant="destructive"
                    >
                      <Button
                        variant="ghost"
                        className="justify-start p-0 text-left text-red-500 hover:text-red-500 hover:opacity-90"
                      >
                        <DoorOpen className="mr-2 h-5 w-5" /> Leave group
                      </Button>
                    </SimpleConfirmationDialog>
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
        {groupDetailQuery.isPending ? null : 1 === groupDetailQuery.data?.groupUsers.length &&
          !expensesQuery.data?.length ? (
          <div className="h-[85vh]">
            <NoMembers group={groupDetailQuery.data} enableSendingInvites={enableSendingInvites} />
          </div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="mb-4 px-4">
              <GroupMyBalance
                userId={user.id}
                groupBalances={groupDetailQuery.data?.groupBalances ?? []}
                users={groupDetailQuery.data?.groupUsers.map((gu) => gu.user) ?? []}
              />
            </div>
            <div className="mb-4 flex justify-center gap-2 overflow-y-auto border-b px-2 pb-4">
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
                    <UserPlus className="size-4 text-gray-400" /> Add members
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
                    <Check className="size-4 text-gray-400" /> Copied
                  </>
                ) : (
                  <>
                    <Share className="size-4 text-gray-400" /> Invite
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
                  isLoading={expensesQuery.isPending}
                />
              </TabsContent>
              <TabsContent value="balances">
                <BalanceList
                  groupBalances={groupDetailQuery.data?.groupBalances ?? []}
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
