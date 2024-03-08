import Head from 'next/head';
import MainLayout from '~/components/Layout/MainLayout';
import Avatar from 'boring-avatars';
import clsx from 'clsx';
import { Button } from '~/components/ui/button';
import { SplitType, type User } from '@prisma/client';
import { api } from '~/utils/api';
import { useRouter } from 'next/router';
import { Check, ChevronLeft, Share, UserPlus } from 'lucide-react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
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
import { BalanceSkeleton, Skeleton } from '~/components/ui/skeleton';
import { Separator } from '~/components/ui/separator';
import useEnableAfter from '~/hooks/useEnableAfter';

const BalancePage: NextPageWithUser = ({ user }) => {
  const router = useRouter();
  const groupId = parseInt(router.query.groupId as string);

  const groupDetailQuery = api.group.getGroupDetails.useQuery({ groupId });
  const expensesQuery = api.group.getExpenses.useQuery({ groupId });

  const [isInviteCopied, setIsInviteCopied] = useState(false);
  const showProgress = useEnableAfter(350);

  async function inviteMembers() {
    if (!groupDetailQuery.data) return;
    const inviteLink =
      env.NEXT_PUBLIC_URL + '/join-group?groupId=' + groupDetailQuery.data.publicId;

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
          <AppDrawer
            title="Members"
            trigger={<InformationCircleIcon className="h-6 w-6" />}
            className="h-[85vh]"
          >
            <div className="">
              <div className="flex flex-col gap-2">
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
          </AppDrawer>
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
        {groupDetailQuery.isLoading ? (
          showProgress ? (
            <div className="mx-4 flex flex-col gap-4">
              <Skeleton className=" h-12 w-full" />
              <Separator />
            </div>
          ) : null
        ) : groupDetailQuery.data?.groupUsers.length === 1 ? (
          <NoMembers group={groupDetailQuery.data} />
        ) : (
          <div className=" mb-4 flex justify-center gap-2 overflow-y-auto border-b px-2 pb-4">
            <Link href={`/add?groupId=${groupId}`}>
              <Button size="sm" className="gap-1 text-sm lg:w-[180px]">
                Add Expense
              </Button>
            </Link>
            <Button size="sm" className="gap-1 text-sm" variant="secondary">
              {groupDetailQuery.data ? (
                <AddMembers group={groupDetailQuery.data}>
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
        )}
        {expensesQuery.isLoading ? (
          showProgress ? (
            <div className="mt-4 flex flex-col gap-4 px-4">
              <BalanceSkeleton />
              <BalanceSkeleton />
              <BalanceSkeleton />
              <BalanceSkeleton />
              <BalanceSkeleton />
            </div>
          ) : null
        ) : null}
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
                  {format(e.createdAt, 'MMM dd')
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
                  {!isSettlement ? <p>{e.name}</p> : null}
                  <p
                    className={`flex text-center ${isSettlement ? 'text-sm text-gray-400' : 'text-xs text-gray-500'}`}
                  >
                    <span className="text-[10px]">{isSettlement ? '  🎉  ' : null}</span>
                    {youPaid ? 'You' : e.paidByUser.name ?? e.paidByUser.email} paid {e.currency}{' '}
                    {toUIString(e.amount)}{' '}
                  </p>
                </div>
              </div>
              {isSettlement ? null : (
                <div>
                  <div
                    className={`text-right text-xs ${youPaid ? 'text-emerald-500' : 'text-orange-600'}`}
                  >
                    {youPaid ? 'You lent' : 'You owe'}
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
