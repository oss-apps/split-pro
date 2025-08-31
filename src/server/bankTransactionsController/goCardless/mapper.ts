import type { Transaction } from 'nordigen-node';
import type { TransactionOutput, TransactionOutputItem } from '../../bankTransactionHelper';

export const formatTransaction = (transaction: Transaction): TransactionOutputItem => ({
  transactionId: transaction.transactionId,
  bookingDate: transaction.bookingDate,
  description: transaction.remittanceInformationUnstructured,
  transactionAmount: {
    amount: transaction.transactionAmount.amount,
    currency: transaction.transactionAmount.currency,
  },
});

export const formatTransactions = (transactions: {
  transactions: { booked: Transaction[]; pending: Transaction[] };
}): TransactionOutput => ({
  transactions: {
    booked: transactions.transactions.booked.map(formatTransaction),
    pending: transactions.transactions.pending.map(formatTransaction),
  },
});
