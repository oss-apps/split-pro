import React, { useCallback } from 'react';
import { api } from '~/utils/api';
import { LoadingSpinner } from '../../ui/spinner';
import { Button } from '../../ui/button';
import type { TransactionAddInputModel } from '~/types';
import { useTranslationWithUtils } from '~/hooks/useTranslationWithUtils';
import { BankTransactionItem } from './BankTransactionItem';
import type { TransactionOutputItem } from '~/types/bank.types';
import { AppDrawer } from '~/components/ui/drawer';
import { Landmark } from 'lucide-react';

export type TransactionWithPendingStatus = TransactionOutputItem & {
  pending: boolean;
};

export const BankingTransactionList: React.FC<{
  addMultipleExpenses: () => void;
  multipleTransactions: TransactionAddInputModel[];
  setMultipleTransactions: (a: TransactionAddInputModel[]) => void;
  isTransactionLoading: boolean;
  bankConnectionEnabled: boolean;
}> = ({
  addMultipleExpenses,
  multipleTransactions,
  setMultipleTransactions,
  isTransactionLoading,
  bankConnectionEnabled,
}) => {
  const { t } = useTranslationWithUtils();

  const [open, setOpen] = React.useState(false);

  const userQuery = api.user.me.useQuery();
  const transactions = api.bankTransactions.getTransactions.useQuery(
    userQuery.data?.obapiProviderId,
  );

  const expensesQuery = api.user.getOwnExpenses.useQuery();

  const returnTransactionsArray = (): TransactionWithPendingStatus[] => {
    const data = transactions?.data?.transactions;

    if (!data) {
      return [];
    }

    const mapTransactions = (items: TransactionOutputItem[], pendingStatus: boolean) =>
      items?.map((cItem) => ({ ...cItem, pending: pendingStatus })) || [];

    const pending = mapTransactions(data.pending, true);
    const booked = mapTransactions(data.booked, false);

    return [...pending, ...booked];
  };

  const alreadyAdded = useCallback(
    (transactionId: string) =>
      expensesQuery?.data?.some((item) => item.transactionId === transactionId) ?? false,
    [expensesQuery?.data],
  );

  const returnGroupName = (transactionId: string) => {
    const transaction = expensesQuery?.data?.find((item) => item.transactionId === transactionId);
    return transaction?.group?.name ? ` to ${transaction.group.name}` : '';
  };

  if (!bankConnectionEnabled) {
    return null;
  }

  const transactionsArray = returnTransactionsArray();

  const onTransactionRowClick = useCallback(
    (item: TransactionWithPendingStatus) => {
      const transactionData = {
        date: new Date(item.bookingDate),
        amount: item.transactionAmount.amount.replace('-', ''),
        currency: item.transactionAmount.currency,
        description: item.description,
        transactionId: item.transactionId,
      };

      const isInMultipleTransactions = multipleTransactions?.some(
        (cItem) => cItem.transactionId === item.transactionId,
      );

      setMultipleTransactions(
        isInMultipleTransactions
          ? multipleTransactions.filter((cItem) => cItem.transactionId !== item.transactionId)
          : [...multipleTransactions, transactionData],
      );
    },
    [multipleTransactions, setMultipleTransactions],
  );

  return (
    <AppDrawer
      trigger={
        <div className="flex w-full justify-center">
          <Button
            variant="outline"
            className="text-md hover:text-foreground/80 justify-between rounded-full border-teal-500"
          >
            <div className="flex items-center gap-4">
              <Landmark className="h-5 w-5 text-teal-500" />
              {t('expense_details.bank_transactions')}
            </div>
          </Button>
        </div>
      }
      title={t('expense_details.bank_transactions')}
      open={open}
      onOpenChange={setOpen}
      className="h-[80vh]"
      actionTitle={t('expense_details.submit_all')}
      actionOnClick={addMultipleExpenses}
      actionDisabled={(multipleTransactions?.length || 0) === 0 || isTransactionLoading}
      shouldCloseOnAction
    >
      <div className="flex flex-col gap-4">
        {transactions?.isLoading ? (
          <div className="mt-10 flex justify-center">
            <LoadingSpinner className="text-primary" />
          </div>
        ) : (
          <>
            {transactionsArray?.length === 0 && (
              <div className="mt-[30vh] text-center text-gray-400">
                {t('expense_details.no_transactions_yet')}
              </div>
            )}
            {transactionsArray.map((item, index) => (
              <BankTransactionItem
                key={item.transactionId}
                index={index}
                item={item}
                alreadyAdded={alreadyAdded(item.transactionId)}
                onTransactionRowClick={onTransactionRowClick}
                groupName={returnGroupName(item.transactionId)}
                multipleTransactions={multipleTransactions}
              />
            ))}
          </>
        )}
      </div>
    </AppDrawer>
  );
};
