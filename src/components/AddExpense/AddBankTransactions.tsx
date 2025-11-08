import React, { useCallback } from 'react';
import { calculateParticipantSplit, useAddExpenseStore } from '~/store/addStore';
import type { TransactionAddInputModel } from '~/types';
import { BankingTransactionList } from './BankTransactions/BankingTransactionList';
import { useRouter } from 'next/router';
import { api } from '~/utils/api';
import { type CreateExpense } from '~/types/expense.types';

const AddBankTransactions: React.FC<{
  clearFields: () => void;
  bankConnectionEnabled: boolean;
  children: React.ReactNode;
  addViaBankTransaction: (obj: TransactionAddInputModel) => void;
}> = ({ bankConnectionEnabled, children, clearFields, addViaBankTransaction }) => {
  const participants = useAddExpenseStore((s) => s.participants);
  const group = useAddExpenseStore((s) => s.group);
  const category = useAddExpenseStore((s) => s.category);
  const isExpenseSettled = useAddExpenseStore((s) => s.canSplitScreenClosed);
  const splitShares = useAddExpenseStore((s) => s.splitShares);
  const paidBy = useAddExpenseStore((s) => s.paidBy);
  const splitType = useAddExpenseStore((s) => s.splitType);
  const fileKey = useAddExpenseStore((s) => s.fileKey);
  const multipleTransactions = useAddExpenseStore((s) => s.multipleTransactions);
  const isTransactionLoading = useAddExpenseStore((s) => s.isTransactionLoading);

  const { resetState, setSplitScreenOpen, setMultipleTransactions, setIsTransactionLoading } =
    useAddExpenseStore((s) => s.actions);

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();

  const router = useRouter();

  const addAllMultipleExpenses = useCallback(async () => {
    setIsTransactionLoading(true);

    if (!paidBy) {
      return;
    }

    if (!isExpenseSettled) {
      setSplitScreenOpen(true);
      return;
    }

    const seen = new Set();

    const expenses = multipleTransactions
      .filter((item) => {
        if (seen.has(item.transactionId)) {
          return false;
        }
        seen.add(item.transactionId);
        return true;
      })
      .map((tempItem) => {
        if (tempItem) {
          const { participants: tempParticipants } = calculateParticipantSplit(
            tempItem.amount,
            participants,
            splitType,
            splitShares,
            paidBy,
          );

          return {
            name: tempItem.description,
            currency: tempItem.currency,
            amount: tempItem.amount,
            groupId: group?.id ?? null,
            splitType,
            participants: tempParticipants.map((p) => ({
              userId: p.id,
              amount: p.amount ?? 0n,
            })),
            paidBy: paidBy.id,
            category,
            fileKey,
            expenseDate: tempItem.date,
            expenseId: tempItem.expenseId,
            transactionId: tempItem.transactionId,
          };
        }
      });

    await addExpenseMutation.mutateAsync(expenses as CreateExpense[]);

    setMultipleTransactions([]);
    setIsTransactionLoading(false);
    router.back();
    resetState();
  }, [
    setSplitScreenOpen,
    router,
    resetState,
    addExpenseMutation,
    group,
    paidBy,
    splitType,
    fileKey,
    isExpenseSettled,
    multipleTransactions,
    participants,
    category,
    setIsTransactionLoading,
    splitShares,
    setMultipleTransactions,
  ]);

  const addOneByOneMultipleExpenses = useCallback(async () => {
    const allTransactions = [...multipleTransactions];
    const transactionToAdd = allTransactions.pop();
    if (transactionToAdd) {
      setMultipleTransactions(allTransactions);
      addViaBankTransaction(transactionToAdd);
    }
  }, [multipleTransactions, setMultipleTransactions, addViaBankTransaction]);

  const handleSetMultipleTransactions = useCallback(
    (a: TransactionAddInputModel[]) => {
      setMultipleTransactions(a);
    },
    [setMultipleTransactions],
  );

  return (
    <BankingTransactionList
      add={addViaBankTransaction}
      addAllMultipleExpenses={addAllMultipleExpenses}
      addOneByOneMultipleExpenses={addOneByOneMultipleExpenses}
      multipleTransactions={multipleTransactions}
      setMultipleTransactions={handleSetMultipleTransactions}
      isTransactionLoading={isTransactionLoading}
      bankConnectionEnabled={bankConnectionEnabled}
      clearFields={clearFields}
    >
      {children}
    </BankingTransactionList>
  );
};

export default AddBankTransactions;
