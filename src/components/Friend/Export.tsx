import { type Expense, type ExpenseParticipant, SplitType } from '@prisma/client';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import React from 'react';

import { Button } from '~/components/ui/button';
import { toUIString } from '~/utils/numbers';

interface ExportCSVProps {
  expenses: (Expense & { expenseParticipants: ExpenseParticipant[] })[];
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
        toUIString(expense?.amount),
        expense.splitType,
        format(new Date(expense.expenseDate), 'yyyy-MM-dd HH:mm:ss'),
        expense.currency,
        youPaid && !isSettlement ? toUIString(yourExpense?.amount) : 0n,
        !youPaid && !isSettlement ? toUIString(yourExpense?.amount) : 0n,
        isSettlement ? toUIString(yourExpense?.amount) : 0n,
      ];
    });

    const csvContent = [
      csvHeaders,
      ...csvData.map((row) =>
        row
          .map((cell) => ('string' === typeof cell && cell.includes(',') ? `"${cell}"` : cell))
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
      size="sm"
      variant="secondary"
      className="w-[150px] gap-1 text-sm lg:w-[180px]"
      onClick={exportToCSV}
      disabled={disabled}
    >
      <Download className="h-4 w-4 text-white" size={20} /> Export
    </Button>
  );
};
