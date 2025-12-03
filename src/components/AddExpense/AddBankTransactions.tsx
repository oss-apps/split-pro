import React, { useCallback } from 'react';
import { calculateParticipantSplit, useAddExpenseStore } from '~/store/addStore';
import type { TransactionAddInputModel } from '~/types';
import { BankingTransactionList } from './BankTransactions/BankingTransactionList';
import { useRouter } from 'next/router';
import { api } from '~/utils/api';
import { type CreateExpense } from '~/types/expense.types';

const AddBankTransactions: React.FC<{
  bankConnectionEnabled: boolean;
  children: React.ReactNode;
}> = ({ bankConnectionEnabled, children }) => {
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

  const {
    resetState,
    setSplitScreenOpen,
    setMultipleTransactions,
    setIsTransactionLoading,
    setSingleTransaction,
  } = useAddExpenseStore((s) => s.actions);

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
        const tempExpense: CreateExpense = {
          name: tempItem.description,
          currency: tempItem.currency,
          amount: tempItem.amount,
          groupId: group?.id ?? null,
          splitType,
          paidBy: paidBy.id,
          participants: participants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0n,
          })),
          category,
          fileKey,
          expenseDate: tempItem.date,
          expenseId: tempItem.expenseId,
          transactionId: tempItem.transactionId,
          otherConversion: null,
        };

        const { participants: tempParticipants } = calculateParticipantSplit({
          ...tempExpense,
          splitShares,
          amountStr: tempItem.amountStr,
          isNegative: false,
        });

        return {
          ...tempExpense,
          participants: tempParticipants.map((p) => ({
            userId: p.id,
            amount: p.amount ?? 0n,
          })),
        };
      }) as CreateExpense[];

    await addExpenseMutation.mutateAsync(expenses, {
      onSuccess: () => {
        setMultipleTransactions([]);
        setIsTransactionLoading(false);
        router.back();
        resetState();
      },
      onError: () => {
        setIsTransactionLoading(false);
      },
    });
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
      setSingleTransaction(transactionToAdd);
    }
  }, [multipleTransactions, setMultipleTransactions, setSingleTransaction]);

  const handleSetMultipleTransactions = useCallback(
    (a: TransactionAddInputModel[]) => {
      setMultipleTransactions(a);
    },
    [setMultipleTransactions],
  );

  return (
    <BankingTransactionList
      add={setSingleTransaction}
      addAllMultipleExpenses={addAllMultipleExpenses}
      addOneByOneMultipleExpenses={addOneByOneMultipleExpenses}
      multipleTransactions={multipleTransactions}
      setMultipleTransactions={handleSetMultipleTransactions}
      isTransactionLoading={isTransactionLoading}
      bankConnectionEnabled={bankConnectionEnabled}
      clearFields={resetState}
    >
      {children}
    </BankingTransactionList>
  );
};

export default AddBankTransactions;
