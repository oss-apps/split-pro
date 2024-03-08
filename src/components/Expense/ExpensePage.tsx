import { type ExpenseParticipant, type Expense, type User } from '@prisma/client';
import { type User as NextUser } from 'next-auth';
import { format } from 'date-fns';
import React from 'react';
import { toUIString } from '~/utils/numbers';
import { UserAvatar } from '../ui/avatar';
import Image from 'next/image';
import { AppDrawer, Drawer, DrawerContent, DrawerTrigger } from '../ui/drawer';
import { Separator } from '../ui/separator';
import { CategoryIcons } from '../ui/categoryIcons';
import { Banknote } from 'lucide-react';
import { env } from '~/env';

type ExpenseDetailsProps = {
  user: NextUser;
  expense: Expense & {
    expenseParticipants: Array<ExpenseParticipant & { user: User }>;
    addedByUser: User;
    paidByUser: User;
    deletedByUser: User | null;
  };
};

const ExpenseDetails: React.FC<ExpenseDetailsProps> = ({ user, expense }) => {
  const youPaid = expense.paidBy === user.id;

  const CategoryIcon = CategoryIcons[expense.category] ?? Banknote;

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
            {expense.deletedByUser ? (
              <p className=" text-sm text-orange-600">
                Deleted by {expense.deletedByUser.name ?? expense.addedByUser.email} on{' '}
                {format(expense.deletedAt ?? expense.expenseDate, 'dd MMM yyyy')}
              </p>
            ) : (
              <p className=" text-sm text-gray-500">
                Added by {expense.addedByUser.name ?? expense.addedByUser.email} on{' '}
                {format(expense.expenseDate, 'dd MMM yyyy')}
              </p>
            )}
          </div>
        </div>
        <div>
          {expense.fileKey ? (
            <AppDrawer
              trigger={
                <Image
                  src={`${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${expense.fileKey}`}
                  alt="Expense receipt"
                  width={56}
                  height={56}
                  className=" h-14 w-14 rounded-md object-cover object-center"
                />
              }
              leftAction="Close"
              title="Expense Receipt"
              className="h-[98vh]"
            >
              <div className="mb-8 overflow-scroll">
                <Image
                  src={`${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${expense.fileKey}`}
                  width={300}
                  height={800}
                  alt="Expense receipt"
                  className="h-full w-full rounded-2xl object-cover"
                />
              </div>
            </AppDrawer>
          ) : null}
        </div>
      </div>
      <Separator />
      <div className="mt-10 flex items-center gap-5 px-6">
        <UserAvatar user={expense.paidByUser} size={35} />
        <p>
          {youPaid ? 'You' : expense.paidByUser.name ?? expense.paidByUser.email} paid{' '}
          {expense.currency} {toUIString(expense.amount)}
        </p>
      </div>
      <div className="ml-14 mt-4 flex flex-col gap-4 px-6">
        {expense.expenseParticipants.map((p) => (
          <div key={p.userId} className="flex items-center gap-2 text-sm text-gray-500">
            <UserAvatar user={p.user} size={25} />
            <p>
              {user.id === p.userId ? 'You Owe' : `${p.user.name ?? p.user.email} owes`}{' '}
              {expense.currency}{' '}
              {toUIString((expense.paidBy === p.userId ? expense.amount ?? 0 : 0) - p.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExpenseDetails;
