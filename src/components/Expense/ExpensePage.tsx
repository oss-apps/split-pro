import { type Expense, type ExpenseParticipant, type User } from '@prisma/client';
import { format, isSameDay } from 'date-fns';
import { Banknote } from 'lucide-react';
import Image from 'next/image';
import { type User as NextUser } from 'next-auth';
import React from 'react';

// import { api } from '~/utils/api';
import { toUIString } from '~/utils/numbers';

import { UserAvatar } from '../ui/avatar';
import { CategoryIcons } from '../ui/categoryIcons';
import { AppDrawer } from '../ui/drawer';
import { Separator } from '../ui/separator';

interface ExpenseDetailsProps {
  user: NextUser;
  expense: Expense & {
    expenseParticipants: Array<ExpenseParticipant & { user: User }>;
    addedByUser: User;
    paidByUser: User;
    deletedByUser: User | null;
    updatedByUser: User | null;
  };
  storagePublicUrl?: string;
}

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ user, expense, storagePublicUrl }) => {
  const youPaid = expense.paidBy === user.id;

  const CategoryIcon = CategoryIcons[expense.category] ?? Banknote;

  // const sendNotificationMutation = api.user.sendExpensePushNotification.useMutation();

  return (
    <div className="">
      <div className="mb-4 flex items-start justify-between gap-2 px-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg border p-2 text-xl">
            <CategoryIcon className="text-gray-400" size={24} />
          </div>
          <div className="flex flex-col gap-2">
            <p className="">{expense.name}</p>
            <p className="text-2xl font-semibold">
              {expense.currency} {toUIString(expense.amount ?? 0)}
            </p>
            {!isSameDay(expense.expenseDate, expense.createdAt) ? (
              <p className="text-sm text-gray-500">{format(expense.expenseDate, 'dd MMM yyyy')}</p>
            ) : null}
            {expense.updatedByUser ? (
              <p className="text-sm text-gray-500">
                Edited by {expense.updatedByUser?.name ?? expense.updatedByUser?.email} on{' '}
                {format(expense.updatedAt, 'dd MMM yyyy')}
              </p>
            ) : null}
            {expense.deletedByUser ? (
              <p className="text-sm text-orange-600">
                Deleted by {expense.deletedByUser.name ?? expense.addedByUser.email} on{' '}
                {format(expense.deletedAt ?? expense.createdAt, 'dd MMM yyyy')}
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Added by {expense.addedByUser.name ?? expense.addedByUser.email} on{' '}
                {format(expense.createdAt, 'dd MMM yyyy')}
              </p>
            )}
          </div>
        </div>
        <div>
          {expense.fileKey ? (
            <AppDrawer
              trigger={
                <Image
                  src={`${storagePublicUrl}/${expense.fileKey}`}
                  alt="Expense receipt"
                  width={56}
                  height={56}
                  data-loaded="false"
                  onLoad={(event) => {
                    event.currentTarget.setAttribute('data-loaded', 'true');
                  }}
                  className="h-14 w-14 rounded-md object-cover object-center data-[loaded=false]:animate-pulse data-[loaded=false]:bg-gray-100/10"
                />
              }
              leftAction="Close"
              title="Expense Receipt"
              className="h-[98vh]"
            >
              <div className="mb-8 overflow-scroll">
                <Image
                  src={`${storagePublicUrl}/${expense.fileKey}`}
                  width={300}
                  height={800}
                  alt="Expense receipt"
                  data-loaded="false"
                  onLoad={(event) => {
                    event.currentTarget.setAttribute('data-loaded', 'true');
                  }}
                  className="h-full w-full rounded-2xl object-cover data-[loaded=false]:animate-pulse data-[loaded=false]:bg-gray-100/10"
                />
              </div>
            </AppDrawer>
          ) : null}
        </div>
      </div>
      <Separator />
      <div className="mt-10 flex items-center gap-5 px-6">
        {/* <button
          onClick={() => {
            sendNotificationMutation.mutate({
              expenseId: expense.id,
            });
          }}
          className="rounded-md bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
        >
          Test Notification
        </button> */}
        <UserAvatar user={expense.paidByUser} size={35} />
        <p>
          {youPaid ? 'You' : (expense.paidByUser.name ?? expense.paidByUser.email)} paid{' '}
          {expense.currency} {toUIString(expense.amount)}
        </p>
      </div>
      <div className="mt-4 ml-14 flex flex-col gap-4 px-6">
        {expense.expenseParticipants
          .filter((p) => (expense.paidBy === p.userId ? (expense.amount ?? 0n) : 0n) !== p.amount)
          .map((p) => (
            <div key={p.userId} className="flex items-center gap-2 text-sm text-gray-500">
              <UserAvatar user={p.user} size={25} />
              <p>
                {user.id === p.userId ? 'You Owe' : `${p.user.name ?? p.user.email} owes`}{' '}
                {expense.currency}{' '}
                {toUIString((expense.paidBy === p.userId ? (expense.amount ?? 0n) : 0n) - p.amount)}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default ExpenseDetails;
