import { useRouter } from 'next/router';
import React, { useCallback } from 'react';
import { isCurrencyCode } from '~/lib/currency';
import { calculateParticipantSplit, useAddExpenseStore } from '~/store/addStore';
import type { TransactionAddInputModel } from '~/types';
import { api } from '~/utils/api';
import { BankingTransactionList } from './BankTransactions/BankingTransactionList';
import type { GetServerSideProps } from 'next';
import { env } from '~/env';
import { customServerSideTranslations } from '~/utils/i18n/server';

const AddBankTransactions: React.FC<{
  clearFields: () => void;
  onUpdateAmount: (amount: string) => void;
  bankConnectionEnabled: boolean;
}> = ({ clearFields, onUpdateAmount, bankConnectionEnabled }) => {
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
    setCurrency,
    setDescription,
    resetState,
    setSplitScreenOpen,
    setExpenseDate,
    setTransactionId,
    setMultipleTransactions,
    setIsTransactionLoading,
  } = useAddExpenseStore((s) => s.actions);

  const addExpenseMutation = api.expense.addOrEditExpense.useMutation();

  const router = useRouter();

  const addMultipleExpenses = useCallback(async () => {
    setIsTransactionLoading(true);

    if (!paidBy) {
      return;
    }

    if (!isExpenseSettled) {
      setSplitScreenOpen(true);
      return;
    }

    const seen = new Set();
    const deduplicated = multipleTransactions.filter((item) => {
      if (seen.has(item.transactionId)) {
        return false;
      }
      seen.add(item.transactionId);
      return true;
    });

    const expensePromises = deduplicated.map(async (tempItem) => {
      if (tempItem) {
        const normalizedAmount = tempItem.amount.replace(',', '.');
        const _amtBigInt = BigInt(Math.round(Number(normalizedAmount) * 100));

        const { participants: tempParticipants } = calculateParticipantSplit(
          _amtBigInt,
          participants,
          splitType,
          splitShares,
          paidBy,
        );

        return addExpenseMutation.mutateAsync({
          name: tempItem.description,
          currency: tempItem.currency,
          amount: _amtBigInt,
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
        });
      }
      return Promise.resolve();
    });

    await Promise.all(expensePromises);

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

  const addViaBankTransaction = useCallback(
    (obj: TransactionAddInputModel) => {
      setExpenseDate(obj.date);
      setDescription(obj.description);
      if (isCurrencyCode(obj.currency)) {
        setCurrency(obj.currency);
      } else {
        console.warn(`Invalid currency code: ${obj.currency}`);
      }
      onUpdateAmount(obj.amount);
      setTransactionId(obj.transactionId ?? '');
    },
    [setExpenseDate, setDescription, setCurrency, onUpdateAmount, setTransactionId],
  );

  const handleSetMultipleTransactions = useCallback(
    (a: TransactionAddInputModel[]) => {
      clearFields();
      setMultipleTransactions(a);
    },
    [clearFields, setMultipleTransactions],
  );

  return (
    <BankingTransactionList
      add={addViaBankTransaction}
      addMultipleExpenses={addMultipleExpenses}
      multipleTransactions={multipleTransactions}
      setMultipleTransactions={handleSetMultipleTransactions}
      isTransactionLoading={isTransactionLoading}
      bankConnectionEnabled={bankConnectionEnabled}
    />
  );
};

export default AddBankTransactions;
