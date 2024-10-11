import React from 'react';
import { Button } from '~/components/ui/button';
import { format } from 'date-fns';
import { SplitType } from '@prisma/client';
import { Download } from 'lucide-react';
import { toUIString } from '~/utils/numbers';

interface ExpenseParticipant {
  expenseId: string;
  userId: number;
  amount: number;
}

interface Expense {
  id: string;
  paidBy: number;
  addedBy: number;
  name: string;
  category: string;
  amount: number;
  splitType: SplitType;
  expenseDate: Date;
  createdAt: Date;
  updatedAt: Date;
  currency: string;
  fileKey: string | null;
  groupId: number | null;
  deletedAt: Date | null;
  deletedBy: number | null;
  expenseParticipants: ExpenseParticipant[];
}

interface ExportCSVProps {
  expenses: Expense[];
  fileName: string;
  currentUserId: number;
  friendName: string;
  friendId: string | number;
  disabled?: boolean;
}

export const Export: React.FC<ExportCSVProps> = ({
  expenses,
  fileName,
  currentUserId,
  friendName,
  friendId,
  disabled = false,
}) => {
  const headers = [
    'Paid By',
    'Name',
    'Category',
    'Amount',
    'Split Type',
    'Expense Date',
    'Currency',
    'You Lent',
    'You Owe',
    'Settlement',
  ];

  const exportToCSV = () => {
    const csvHeaders = headers.join(',');
    const csvData = expenses.map((expense) => {
      const youPaid = expense.paidBy === currentUserId;
      const yourExpense = expense.expenseParticipants.find(
        (p) => p.userId === (youPaid ? friendId : currentUserId),
      );

      const isSettlement = expense.splitType === SplitType.SETTLEMENT;

      return [
        expense.paidBy === currentUserId ? 'You' : friendName,
        expense.name,
        expense.category,
        toUIString(expense?.amount ?? 0),
        expense.splitType,
        format(new Date(expense.expenseDate), 'yyyy-MM-dd HH:mm:ss'),
        expense.currency,
        youPaid && !isSettlement ? toUIString(yourExpense?.amount ?? 0) : 0,
        !youPaid && !isSettlement ? toUIString(yourExpense?.amount ?? 0) : 0,
        isSettlement ? toUIString(yourExpense?.amount ?? 0) : 0,
      ];
    });

    const csvContent = [
      csvHeaders,
      ...csvData.map((row) =>
        row
          .map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell))
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${fileName}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Button
      className="bg-transparent hover:bg-transparent"
      size="sm"
      onClick={exportToCSV}
      disabled={disabled}
    >
      <Download className="h-4 w-4 text-white" size={20} />
    </Button>
  );
};
