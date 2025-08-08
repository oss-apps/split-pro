import { api } from '~/utils/api';
import { LoadingSpinner } from '../ui/spinner';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { type TransactionAddInputModel } from './AddExpensePage';
import { type Transaction } from 'nordigen-node';
import { useTranslation } from 'next-i18next';

type Props = {
  add: (obj: TransactionAddInputModel) => void;
  addMultipleExpenses: () => void;
  multipleTransactions: TransactionAddInputModel[];
  setMultipleTransactions: (a: TransactionAddInputModel[]) => void;
  isTransactionLoading: boolean;
};

type TransactionWithPendingStatus = Transaction & {
  pending: boolean;
};

export const BankingTransactions = ({
  add,
  addMultipleExpenses,
  multipleTransactions,
  setMultipleTransactions,
  isTransactionLoading,
}: Props) => {
  const { t } = useTranslation('expense_details');

  const userQuery = api.user.me.useQuery();
  const gctransactions = api.gocardless.getTransactions.useQuery(userQuery.data?.obapiProviderId);

  const expensesQuery = api.user.getOwnExpenses.useQuery();
  const gocardlessEnabled = api.gocardless.gocardlessEnabled.useQuery();

  const returnTransactionsArray = (): TransactionWithPendingStatus[] => {
    const transactions = gctransactions?.data?.transactions;
    if (!transactions) return [];

    const mapTransactions = (items: Transaction[], pendingStatus: boolean) =>
      items?.map((cItem) => ({ ...cItem, pending: pendingStatus })) || [];

    const pending = mapTransactions(transactions.pending, true);
    const booked = mapTransactions(transactions.booked, false);

    return [...pending, ...booked];
  };

  const alreadyAdded = (transactionId: string) =>
    expensesQuery?.data?.some((item) => item.transactionId === transactionId) ?? false;

  const returnGroupName = (transactionId: string) => {
    const transaction = expensesQuery?.data?.find((item) => item.transactionId === transactionId);
    return transaction?.group?.name ? ` to ${transaction.group.name}` : '';
  };

  if (!gocardlessEnabled) {
    return <></>;
  }

  const transactionsArray = returnTransactionsArray();

  const onTransactionRowClick = (item: TransactionWithPendingStatus, multiple: boolean) => {
    const transactionData = {
      date: new Date(item.bookingDate),
      amount: item.transactionAmount.amount.replace('-', ''),
      currency: item.transactionAmount.currency,
      description: item.remittanceInformationUnstructured,
      transactionId: item.transactionId,
    };

    if (multiple) {
      const isInMultipleTransactions = multipleTransactions?.some(
        (cItem) => cItem.transactionId === item.transactionId,
      );

      setMultipleTransactions(
        isInMultipleTransactions
          ? multipleTransactions.filter((cItem) => cItem.transactionId !== item.transactionId)
          : [...multipleTransactions, transactionData],
      );
    } else {
      if (alreadyAdded(item.transactionId)) {
        return;
      }
      add(transactionData);
      document.getElementById('mainlayout')?.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p>{t('ui.bank_transactions')}</p>
        <Button
          variant="ghost"
          className=" text-primary px-0"
          disabled={(multipleTransactions?.length || 0) === 0 || isTransactionLoading}
          onClick={addMultipleExpenses}
          loading={isTransactionLoading}
        >
          {t('ui.submit_all')}
        </Button>
      </div>
      {gctransactions.isInitialLoading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="text-primary" />
        </div>
      ) : (
        <>
          {transactionsArray?.length === 0 && (
            <div className="mt-[30vh] text-center text-gray-400">{t('ui.no_transactions_yet')}</div>
          )}
          {transactionsArray
            ?.filter((item) => item.transactionAmount.amount.includes('-'))
            .map((item, index) => (
              <div className="flex items-center justify-between px-2 py-2" key={index}>
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={multipleTransactions?.some(
                      (cItem) => cItem.transactionId === item.transactionId,
                    )}
                    disabled={alreadyAdded(item.transactionId)}
                    onCheckedChange={() => {
                      onTransactionRowClick(item, true);
                    }}
                    className="h-6 w-6 md:h-4 md:w-4"
                  />
                  <Button
                    className="flex items-center gap-4"
                    variant="ghost"
                    disabled={alreadyAdded(item.transactionId)}
                  >
                    <div className="text-xs text-gray-500">
                      {format(item.bookingDate, 'MMM dd')
                        .split(' ')
                        .map((d) => (
                          <div className="text-center" key={d}>
                            {d}
                          </div>
                        ))}
                    </div>
                    <div onClick={() => onTransactionRowClick(item, false)}>
                      <p
                        className={
                          'line-clamp-2 whitespace-break-spaces text-left text-sm lg:text-base' +
                          (alreadyAdded(item.transactionId) ? ' line-through' : '')
                        }
                      >
                        {item.remittanceInformationUnstructured}
                      </p>
                      <p
                        className={`line-clamp-1 flex whitespace-break-spaces text-left text-xs text-gray-500`}
                      >
                        {item.pending && t('ui.pending')}{' '}
                        {alreadyAdded(item.transactionId) &&
                          `(${t('ui.already_added')}${returnGroupName(item.transactionId)})`}
                      </p>
                    </div>
                  </Button>
                </div>
                <div className="min-w-10 shrink-0">
                  <div
                    className={`text-right ${alreadyAdded(item.transactionId) ? 'text-red-500' : 'text-emerald-600'}`}
                  >
                    <span className="font-light ">{item.transactionAmount.currency}</span>{' '}
                    {item.transactionAmount.amount}
                  </div>
                </div>
              </div>
            ))}
        </>
      )}
    </div>
  );
};
