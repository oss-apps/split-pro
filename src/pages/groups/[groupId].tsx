import { clsx } from 'clsx';
import {
  Archive,
  BarChartHorizontal,
  Check,
  ChevronLeft,
  Construction,
  DoorOpen,
  Info,
  Merge,
  PlusIcon,
  Share,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { type GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Fragment, useCallback, useState } from 'react';
import { toast } from 'sonner';
import { BalanceList } from '~/components/Expense/BalanceList';
import { ExpenseList } from '~/components/Expense/ExpenseList';
import AddMembers from '~/components/group/AddMembers';
import GroupMyBalance from '~/components/group/GroupMyBalance';
import NoMembers from '~/components/group/NoMembers';
import MainLayout from '~/components/Layout/MainLayout';
import { EntityAvatar } from '~/components/ui/avatar';
import { Button } from '~/components/ui/button';
import { AppDrawer } from '~/components/ui/drawer';
import { Label } from '~/components/ui/label';
import { SimpleConfirmationDialog } from '~/components/SimpleConfirmationDialog';
import { Switch } from '~/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { UpdateName } from '~/components/Account/UpdateName';
import { env } from '~/env';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { db } from '~/server/db';
import { type NextPageWithUser } from '~/types';
import { api } from '~/utils/api';
import { customServerSideTranslations } from '~/utils/i18n/server';
import { toUIString } from '~/utils/numbers';

const BalancePage: NextPageWithUser<{
  enableSendingInvites: boolean;
}> = ({ user, enableSendingInvites }) => {
  const { displayName, toUIDate, t } = useTranslationWithUtils(['groups_details']);
  const router = useRouter();
  const groupId = parseInt(router.query.groupId as string);

  const groupDetailQuery = api.group.getGroupDetails.useQuery({ groupId });
  const groupTotalQuery = api.group.getGroupTotals.useQuery({ groupId });
  const expensesQuery = api.expense.getGroupExpenses.useQuery({ groupId });
  const deleteGroupMutation = api.group.delete.useMutation();
  const leaveGroupMutation = api.group.leaveGroup.useMutation();
  const toggleArchiveMutation = api.group.toggleArchive.useMutation();
  const toggleSimplifyDebtsMutation = api.group.toggleSimplifyDebts.useMutation();
  const updateGroupDetailsMutation = api.group.updateGroupDetails.useMutation();
  const recalculateGroupBalancesMutation = api.group.recalculateBalances.useMutation();

  const [isInviteCopied, setIsInviteCopied] = useState(false);

  const inviteMembers = useCallback(async () => {
    if (!groupDetailQuery.data) {
      return;
    }
    const inviteLink = `${window.location.origin}/join-group?groupId=${groupDetailQuery.data.publicId}`;

    if (navigator.share) {
      navigator
        .share({
          title: `${t('invite_message.join_to')} ${groupDetailQuery.data.name} ${t('invite_message.in_splitpro')}`,
          text: t('invite_message.text'),
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
  }, [groupDetailQuery.data, t]);

  const isAdmin = groupDetailQuery.data?.userId === user.id;
  const isArchived = !!groupDetailQuery.data?.archivedAt;
  const canDeleteOrArchive =
    groupDetailQuery.data?.userId === user.id &&
    !groupDetailQuery.data?.groupBalances.find((bal) => 0n !== bal.amount);
  const canLeave = !groupDetailQuery.data?.groupBalances.find(
    (bal) => 0n !== bal.amount && bal.userId === user.id,
  );

  const onRecalculateBalances = useCallback(() => {
    recalculateGroupBalancesMutation.mutate(
      { groupId },
      {
        onSuccess: () => {
          void groupDetailQuery.refetch();
          toast.success(t('ui.messages.balances_recalculated'));
        },
        onError: (e) => {
          toast.error(t('ui.errors.something_went_wrong', { ns: 'common' }));
          console.error(e);
        },
      },
    );
  }, [groupId, groupDetailQuery, recalculateGroupBalancesMutation, t]);

  const onGroupDelete = useCallback(() => {
    deleteGroupMutation.mutate(
      { groupId },
      {
        onSuccess: () => {
          router.replace('/groups').catch(console.error);
        },
        onError: (e) => {
          toast.error(t('ui.errors.something_went_wrong', { ns: 'common' }));
          console.error(e);
        },
      },
    );
  }, [groupId, deleteGroupMutation, router, t]);

  const onGroupLeave = useCallback(
    (userId?: number) => {
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
          onError: (e) => {
            toast.error(t('ui.errors.something_went_wrong', { ns: 'common' }));
            console.error(e);
          },
        },
      );
    },
    [groupId, leaveGroupMutation, groupDetailQuery, router, t],
  );

  return (
    <>
      <Head>
        <title>{t('ui.title')}</title>
      </Head>
      <MainLayout
        title={
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => router.replace(`/groups`)} className="mr-2 p-0">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <p className="text-lg">{groupDetailQuery.data?.name}</p>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <AppDrawer
              title={t('ui.group_statistics.title')}
              trigger={<BarChartHorizontal className="h-6 w-6" />}
              className="h-[85vh]"
            >
              <>
                <p className="font-semibold">{t('ui.group_statistics.total_expenses')}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {groupTotalQuery.data?.map((total, index, arr) =>
                    null != total._sum.amount ? (
                      <Fragment key={total.currency}>
                        <div className="flex flex-wrap gap-1">
                          {total.currency} {toUIString(total._sum.amount)}
                        </div>
                        {index < arr.length - 1 ? <span>+</span> : null}
                      </Fragment>
                    ) : null,
                  )}
                </div>
                {expensesQuery?.data && expensesQuery.data[expensesQuery.data.length - 1] && (
                  <div className="mt-8">
                    <p className="font-semibold">{t('ui.group_statistics.first_expense')}</p>
                    <p>
                      {toUIDate(expensesQuery.data[expensesQuery.data.length - 1]!.createdAt, {
                        year: true,
                      })}
                    </p>
                  </div>
                )}
              </>
            </AppDrawer>
            <AppDrawer
              title={t('ui.group_info.title')}
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
                          toast.success(t('ui.messages.group_name_updated'), { duration: 1500 });
                          await groupDetailQuery.refetch();
                        } catch (error) {
                          toast.error(t('ui.errors.group_name_update_failed'));
                          console.error(error);
                        }
                      }}
                    />
                  )}
                </div>

                <p className="mt-5 font-semibold">{t('ui.group_info.members')}</p>
                <div className="mt-2 flex flex-col gap-2">
                  {groupDetailQuery.data?.groupUsers.map((groupUser) => (
                    <div key={groupUser.userId} className="flex items-center justify-between">
                      <div className={clsx('flex items-center gap-2 rounded-md py-1.5')}>
                        <EntityAvatar entity={groupUser.user} />
                        <p>{displayName(groupUser.user)}</p>
                      </div>
                      {groupUser.userId === groupDetailQuery.data?.userId ? (
                        <p className="text-sm text-gray-400">
                          {t('actors.owner', { ns: 'common' })}
                        </p>
                      ) : (
                        isAdmin &&
                        (() => {
                          const canLeave = !groupDetailQuery.data?.groupBalances.find(
                            (b) => 0n !== b.amount && b.userId === groupUser.userId,
                          );

                          return (
                            <SimpleConfirmationDialog
                              title={canLeave ? t('ui.group_info.remove_member_details.title') : ''}
                              description={
                                canLeave
                                  ? t('ui.group_info.remove_member_details.can_remove')
                                  : t('ui.group_info.remove_member_details.cant_remove')
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
              {groupDetailQuery.data?.createdAt && (
                <div className="mt-8">
                  <p className="font-semibold">{t('ui.group_info.group_created')}</p>
                  <p>{toUIDate(groupDetailQuery.data.createdAt, { year: true })}</p>
                </div>
              )}
              <div className="mt-8">
                <p className="font-semibold">{t('ui.group_info.actions')}</p>
                <div className="child:h-7 mt-2 flex flex-col">
                  <Label className="flex cursor-pointer items-center justify-between">
                    <p className="flex items-center">
                      <Merge className="mr-2 size-4" /> {t('ui.group_info.simplify_debts')}
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
                              toast.error(t('ui.errors.setting_update_failed'));
                            },
                          },
                        );
                      }}
                    />
                  </Label>
                  {isAdmin && (
                    <SimpleConfirmationDialog
                      title={t('ui.group_info.recalculate_balances_details.title')}
                      description={t('ui.group_info.recalculate_balances_details.description')}
                      hasPermission
                      onConfirm={onRecalculateBalances}
                      loading={recalculateGroupBalancesMutation.isPending}
                      variant="default"
                    >
                      <Button variant="ghost" className="text-primary justify-start p-0 text-left">
                        <Construction className="mr-2 h-5 w-5" />{' '}
                        {t('ui.group_info.recalculate_balances')}
                      </Button>
                    </SimpleConfirmationDialog>
                  )}
                  <Label className="flex cursor-pointer items-center justify-between">
                    <p className="flex items-center">
                      <Archive className="mr-2 size-4" /> {t('ui.group_info.archive_group')}
                    </p>
                    <Switch
                      id="archive-group"
                      checked={groupDetailQuery.data?.archivedAt !== null}
                      onCheckedChange={() => {
                        toggleArchiveMutation.mutate(
                          { groupId },
                          {
                            onSuccess: () => {
                              void groupDetailQuery.refetch();
                            },
                            onError: (error) => {
                              toast.error(error.message);
                            },
                          },
                        );
                      }}
                    />
                  </Label>
                  {isAdmin ? (
                    <SimpleConfirmationDialog
                      title={
                        canDeleteOrArchive ? t('ui.group_info.delete_group_details.title') : ''
                      }
                      description={
                        canDeleteOrArchive
                          ? t('ui.group_info.delete_group_details.can_delete')
                          : t('ui.group_info.delete_group_details.cant_delete')
                      }
                      hasPermission={canDeleteOrArchive}
                      onConfirm={onGroupDelete}
                      loading={deleteGroupMutation.isPending}
                      variant="destructive"
                    >
                      <Button
                        variant="ghost"
                        className="justify-start p-0 text-left text-red-500 hover:text-red-500 hover:opacity-90"
                      >
                        <Trash2 className="mr-2 size-4" /> {t('ui.group_info.delete_group')}
                      </Button>
                    </SimpleConfirmationDialog>
                  ) : (
                    <SimpleConfirmationDialog
                      title={canLeave ? t('ui.group_info.leave_group_details.title') : ''}
                      description={
                        canLeave
                          ? t('ui.group_info.leave_group_details.can_leave')
                          : t('ui.group_info.leave_group_details.cant_leave')
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
                        <DoorOpen className="mr-2 h-5 w-5" /> {t('ui.group_info.leave_group')}
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
            <Button variant="ghost" onClick={() => router.replace(`/groups`)} className="mr-2 p-0">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <EntityAvatar entity={groupDetailQuery.data} size={30} />
            <p className="text-lg">{groupDetailQuery.data?.name}</p>
          </div>
        }
        loading={groupDetailQuery.isPending}
      >
        {1 === groupDetailQuery.data?.groupUsers.length && !expensesQuery.data?.length ? (
          <div className="h-[85vh]">
            <NoMembers group={groupDetailQuery.data} enableSendingInvites={enableSendingInvites} />
          </div>
        ) : (
          <div className="transition-discrete starting:opacity-0">
            <div className="mb-4">
              {isArchived && (
                <div className="mb-4 flex justify-center gap-2 overflow-y-auto pb-4">
                  <p>
                    {t('ui.group_info.archived')} {t('common:ui.on')}{' '}
                    {toUIDate(groupDetailQuery.data!.archivedAt!)}
                  </p>
                </div>
              )}
              <GroupMyBalance
                userId={user.id}
                groupBalances={groupDetailQuery.data?.groupBalances}
                users={groupDetailQuery.data?.groupUsers.map((gu) => gu.user)}
              />
            </div>
            <div className="mb-4 flex justify-center gap-2 overflow-y-auto border-b pb-4">
              <Link href={`/add?groupId=${groupId}`}>
                <Button size="sm" className="w-40 gap-1 text-sm lg:w-[180px]" disabled={isArchived}>
                  <PlusIcon className="size-4" /> {t('actions.add_expense', { ns: 'common' })}
                </Button>
              </Link>

              <AddMembers group={groupDetailQuery.data} enableSendingInvites={enableSendingInvites}>
                <Button size="sm" responsiveIcon variant="secondary" disabled={isArchived}>
                  <UserPlus className="size-4 text-gray-400" /> {t('ui.add_members')}
                </Button>
              </AddMembers>

              <Button
                size="sm"
                responsiveIcon
                variant="secondary"
                onClick={inviteMembers}
                disabled={isArchived}
              >
                {isInviteCopied ? (
                  <>
                    <Check className="size-4" /> {t('ui.copied')}
                  </>
                ) : (
                  <>
                    <Share className="size-4 text-gray-400" />{' '}
                    {t('actions.invite', { ns: 'common' })}
                  </>
                )}
              </Button>
            </div>
            <Tabs defaultValue="expenses">
              <TabsList className="mx-auto grid w-full max-w-96 grid-cols-2">
                <TabsTrigger value="expenses">{t('ui.tabs.expenses')}</TabsTrigger>
                <TabsTrigger value="balances">{t('ui.tabs.balances')}</TabsTrigger>
              </TabsList>
              <TabsContent value="expenses">
                <ExpenseList
                  userId={user.id}
                  expenses={expensesQuery.data}
                  contactId={groupId}
                  isLoading={expensesQuery.isPending}
                  isGroup
                />
              </TabsContent>
              <TabsContent value="balances">
                <BalanceList
                  groupBalances={groupDetailQuery.data?.groupBalances}
                  users={groupDetailQuery.data?.groupUsers.map((gu) => gu.user)}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </MainLayout>
    </>
  );
};

BalancePage.auth = true;

export default BalancePage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const group = await db.group.findFirst({
    where: {
      id: Number(context.query.groupId),
    },
  });

  if (!group) {
    return {
      redirect: {
        destination: '/groups',
        permanent: false,
      },
    };
  }

  return {
    props: {
      ...(await customServerSideTranslations(context.locale, [
        'common',
        'groups_details',
        'expense_details',
        'friend_details',
        'currencies',
      ])),
      enableSendingInvites: env.ENABLE_SENDING_INVITES,
    },
  };
};
