import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import Avatar from 'boring-avatars';
import clsx from 'clsx';
import { Button } from '~/components/ui/button';
import { SplitType } from '@prisma/client';
import { api } from '~/utils/api';
import { useRouter } from 'next/router';
import {
  Check,
  ChevronLeft,
  DoorOpen,
  Share,
  Trash2,
  UserPlus,
  BarChartHorizontal,
  Info,
} from 'lucide-react';
import { AppDrawer } from '~/components/ui/drawer';
import { UserAvatar } from '~/components/ui/avatar';
import NoMembers from '~/components/group/NoMembers';
import { format } from 'date-fns';
import AddMembers from '~/components/group/AddMembers';
import Image from 'next/image';
import { toUIString } from '~/utils/numbers';
import Link from 'next/link';
import { CategoryIcon } from '~/components/ui/categoryIcons';
import { env } from '~/env';
import { useState } from 'react';
import { type NextPageWithUser } from '~/types';
import { motion } from 'framer-motion';
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
import { toast } from 'sonner';
import GroupMyBalance from '~/components/group/GroupMyBalance';
import {useTranslation} from "react-i18next";

const BalancePage: NextPageWithUser<{
  enableSendingInvites: boolean;
}> = ({ user, enableSendingInvites }) => {
  const router = useRouter();
  const groupId = parseInt(router.query.groupId as string);
  const { t } = useTranslation('groups_details');

  const groupDetailQuery = api.group.getGroupDetails.useQuery({ groupId });
  const groupTotalQuery = api.group.getGroupTotals.useQuery({ groupId });
  const expensesQuery = api.group.getExpenses.useQuery({ groupId });
  const deleteGroupMutation = api.group.delete.useMutation();
  const leaveGroupMutation = api.group.leaveGroup.useMutation();

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
          title: `${t('invite_message/join_to')} ${groupDetailQuery.data.name} ${t('invite_message/in_splitpro')}`,
          text: t('invite_message/text'),
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
    !groupDetailQuery.data.groupBalances.find((b) => b.amount !== 0);
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
          toast.error(t('errors/something_went_wrong'));
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
          toast.error(t('errors/something_went_wrong'));
        },
      },
    );
  }

  console.log('expensesQuery.data', expensesQuery.data);

  return (
    <>
      <Head>
        <title>{t('ui/title')}</title>
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
              title={t('ui/group_statistics/title')}
              trigger={<BarChartHorizontal className="h-6 w-6" />}
              className="h-[85vh]"
            >
              <div className="">
                <p className="font-semibold">{t('ui/group_statistics/total_expenses')}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {groupTotalQuery.data?.map((total, index, arr) => {
                    return total._sum.amount != null ? (
                      <>
                        <div key={total.currency} className="flex flex-wrap gap-1">
                          {total.currency} {toUIString(total._sum.amount)}
                        </div>
                        {index < arr.length - 1 ? <span>+</span> : null}
                      </>
                    ) : null;
                  })}
                </div>
                {expensesQuery?.data && expensesQuery?.data?.length > 0 && (
                  <div className="mt-8">
                    <p className="font-semibold">{t('ui/group_statistics/first_expense')}</p>
                    <p>
                      {expensesQuery.data[expensesQuery.data.length - 1]?.createdAt
                        ? format(
                            expensesQuery.data[expensesQuery.data.length - 1]!.createdAt,
                              process.env.NEXT_PUBLIC_DATE_FORMAT_VARIANT_5 ?? 'MMM dd, yyyy',
                          )
                        : '--'}
                    </p>
                  </div>
                )}
              </div>
            </AppDrawer>
            <AppDrawer
              title={t('ui/group_info/title')}
              trigger={<Info className="h-6 w-6" />}
              className="h-[85vh]"
            >
              <div className="">
                <p className="font-semibold">{t('ui/group_info/members')}</p>
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
                  <p className="font-semibold ">{t('ui/group_info/group_created')}</p>
                  <p>{format(groupDetailQuery.data?.createdAt, process.env.NEXT_PUBLIC_DATE_FORMAT_VARIANT_5 ?? 'MMM dd, yyyy')}</p>
                </div>
              )}
              <div className="mt-8">
                <p className="font-semibold ">{t('ui/group_info/actions')}</p>
                <div className="mt-2 flex flex-col gap-1">
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
                            <Trash2 className="mr-2 h-4 w-4" /> {t('ui/group_info/delete_group')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-xs rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {canDelete ? t('ui/group_info/delete_group_details/title') : ''}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {canDelete
                                ? t('ui/group_info/delete_group_details/can_delete')
                                : t('ui/group_info/delete_group_details/cant_delete')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('ui/group_info/delete_group_details/cancel')}</AlertDialogCancel>
                            {canDelete ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={onGroupDelete}
                                disabled={deleteGroupMutation.isLoading}
                                loading={deleteGroupMutation.isLoading}
                              >
                                {t('ui/group_info/delete_group_details/delete')}
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
                            <DoorOpen className="mr-2 h-5 w-5" /> {t('ui/group_info/leave_group')}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="max-w-xs rounded-lg">
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              {canLeave ? t('ui/group_info/leave_group_details/title') : ''}
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              {canLeave
                                ? t('ui/group_info/leave_group_details/can_leave')
                                : t('ui/group_info/leave_group_details/cant_leave')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('ui/group_info/leave_group_details/cancel')}</AlertDialogCancel>
                            {canLeave ? (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={onGroupLeave}
                                disabled={leaveGroupMutation.isLoading}
                                loading={leaveGroupMutation.isLoading}
                              >
                                {t('ui/group_info/leave_group_details/leave')}
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
                  {t('ui/add_expense')}
                </Button>
              </Link>
              <Button size="sm" className="gap-1 text-sm" variant="secondary">
                {groupDetailQuery.data ? (
                  <AddMembers
                    group={groupDetailQuery.data}
                    enableSendingInvites={enableSendingInvites}
                  >
                    <UserPlus className="h-4 w-4 text-gray-400" /> {t('ui/add_members')}
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
                    <Check className="h-4 w-4 text-gray-400" /> {t('ui/copied')}
                  </>
                ) : (
                  <>
                    <Share className="h-4 w-4 text-gray-400" /> {t('ui/invite')}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
        {expensesQuery.data?.map((e) => {
          const youPaid = e.paidBy === user.id;
          const yourExpense = e.expenseParticipants.find((p) => p.userId === user.id);
          const isSettlement = e.splitType === SplitType.SETTLEMENT;
          const yourExpenseAmount = youPaid
            ? yourExpense?.amount ?? 0
            : -(yourExpense?.amount ?? 0);

          return (
            <Link
              href={`/groups/${groupId}/expenses/${e.id}`}
              key={e.id}
              className="flex items-center justify-between px-2 py-2"
            >
              <div className="flex items-center gap-4">
                <div className="text-xs text-gray-500">
                  {format(e.expenseDate, process.env.NEXT_PUBLIC_DATE_FORMAT_VARIANT_4 ?? 'MMM dd')
                    .split(' ')
                    .map((d) => (
                      <div className="text-center" key={d}>
                        {d}
                      </div>
                    ))}
                </div>
                <div>
                  <CategoryIcon category={e.category} className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  {!isSettlement ? (
                    <p className=" max-w-[180px] truncate text-sm lg:max-w-md lg:text-base">
                      {e.name}
                    </p>
                  ) : null}
                  <p
                    className={`flex text-center ${isSettlement ? 'text-sm text-gray-400' : 'text-xs text-gray-500'}`}
                  >
                    <span className="text-[10px]">{isSettlement ? '  🎉  ' : null}</span>
                    {youPaid ? (t('ui/you_paid') + ' ' + e.currency + ' ') :
                               (e.paidByUser.name  + ' ' + t('ui/user_paid') + ' ' + e.currency + ' ')   ??
                               (e.paidByUser.email + ' ' + t('ui/user_paid') + ' ' + e.currency + ' ')}
                    {toUIString(e.amount)}{' '}
                  </p>
                </div>
              </div>
              {isSettlement ? null : (
                <div className="min-w-10 shrink-0">
                  <div
                    className={`text-right text-xs ${youPaid ? 'text-emerald-500' : 'text-orange-600'}`}
                  >
                    {youPaid ? t('ui/you_lent') : t('ui/you_owe')}
                  </div>
                  <div className={`text-right ${youPaid ? 'text-emerald-500' : 'text-orange-600'}`}>
                    <span className="font-light ">{e.currency}</span>{' '}
                    {toUIString(yourExpenseAmount)}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
        {expensesQuery.data?.length === 0 &&
        !groupDetailQuery.isLoading &&
        groupDetailQuery.data?.groupUsers.length !== 1 ? (
          <div className="mt-20 flex flex-col items-center justify-center ">
            <Image src="/add_expense.svg" alt="Empty" width={200} height={200} className="mb-4" />
          </div>
        ) : null}
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
