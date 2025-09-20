import type { Transaction } from 'plaid';
import type { TransactionOutput, TransactionOutputItem } from '../../bankTransactionHelper';

export const formatTransaction = (transaction: Transaction): TransactionOutputItem => ({
  transactionId: transaction.transaction_id,
  bookingDate: transaction.date,
  description: transaction.name || transaction.merchant_name || '?',
  transactionAmount: {
    amount: transaction.amount?.toString() || '0',
    currency: transaction.iso_currency_code || 'USD',
  },
});

export const formatTransactions = (transactions: Transaction[]): TransactionOutput => {
  const bookedTransactions = transactions.filter((t) => t.pending === false);
  const pendingTransactions = transactions.filter((t) => t.pending === true);

  return {
    transactions: {
      booked: bookedTransactions.map(formatTransaction),
      pending: pendingTransactions.map(formatTransaction),
    },
  };
};
