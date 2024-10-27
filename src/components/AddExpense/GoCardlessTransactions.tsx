import { api } from '~/utils/api';
import { LoadingSpinner } from '../ui/spinner';
import { format } from 'date-fns';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { type TransactionAddInputModel } from './AddExpensePage';
import { type Transaction } from 'nordigen-node';

type Props = {
  add: (obj: TransactionAddInputModel) => void;
  addMultipleExpenses: () => void;
  multipleArray: TransactionAddInputModel[];
  setMultipleArray: (a: TransactionAddInputModel[]) => void;
};

type TransactionWithPendingStatus = Transaction & {
  pending: boolean;
};

export const GoCardlessTransactions = ({
  add,
  addMultipleExpenses,
  multipleArray,
  setMultipleArray,
}: Props) => {
  const userQuery = api.user.me.useQuery();
  const gctransactions = api.gocardless.getTransactions.useQuery(userQuery.data?.gocardlessId);

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
      const isInMultipleArray = multipleArray?.some(
        (cItem) => cItem.transactionId === item.transactionId,
      );

      setMultipleArray(
        isInMultipleArray
          ? multipleArray.filter((cItem) => cItem.transactionId !== item.transactionId)
          : [...multipleArray, transactionData],
      );
    } else {
      add(transactionData);
      document.getElementById('mainlayout')?.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p>Bank transactions</p>
        <Button
          variant="ghost"
          className=" px-0 text-primary"
          disabled={(multipleArray?.length || 0) === 0}
          onClick={addMultipleExpenses}
        >
          Submit all
        </Button>
      </div>
      {gctransactions.isInitialLoading ? (
        <div className="mt-10 flex justify-center">
          <LoadingSpinner className="text-primary" />
        </div>
      ) : (
        <>
          {transactionsArray?.length === 0 && (
            <div className="mt-[30vh] text-center text-gray-400">No transactions yet</div>
          )}
          {transactionsArray
            ?.filter((item) => item.transactionAmount.amount.includes('-'))
            .map((item, index) => (
              <div className="flex items-center justify-between px-2 py-2" key={index}>
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={multipleArray?.some(
                      (cItem) => cItem.transactionId === item.transactionId,
                    )}
                    disabled={alreadyAdded(item.transactionId)}
                    onCheckedChange={() => {
                      onTransactionRowClick(item, true);
                    }}
                  />
                  <button
                    className="flex items-center gap-4"
                    disabled={alreadyAdded(item.transactionId)}
                    onClick={() => onTransactionRowClick(item, false)}
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
                    <div>
                      <p
                        className={
                          'line-clamp-2 max-w-[200px] text-left text-sm lg:max-w-lg lg:text-base' +
                          (alreadyAdded(item.transactionId) ? ' line-through' : '')
                        }
                      >
                        {item.remittanceInformationUnstructured}
                      </p>
                      <p className={`flex text-center text-xs text-gray-500`}>
                        {item.pending && 'Pending'}{' '}
                        {alreadyAdded(item.transactionId) &&
                          `(Already added${returnGroupName(item.transactionId)})`}
                      </p>
                    </div>
                  </button>
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
