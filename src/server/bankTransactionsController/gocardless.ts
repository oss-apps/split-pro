import NordigenClient, { type Transaction } from 'nordigen-node';
import { env } from '~/env';
import { getDbCachedData, setDbCachedData } from '../api/services/dbCache';
import { format, subDays } from 'date-fns';
import type { CachedBankData } from '@prisma/client';
import type { TransactionOutput, TransactionOutputItem } from '../bankTransactionHelper';

const goCardlessClient = new NordigenClient({
  secretId: env.GOCARDLESS_SECRET_ID,
  secretKey: env.GOCARDLESS_SECRET_KEY,
});

export const gocardless = {
  getTransactions: async (userId: number, requisitionId?: string) => {
    if (!requisitionId) {
      return;
    }

    await goCardlessClient.generateToken();

    const requisitionData = await goCardlessClient.requisition.getRequisitionById(requisitionId);

    const accountId = requisitionData.accounts[0];

    const cachedData = await getDbCachedData<CachedBankData, 'cachedBankData'>({
      key: 'cachedBankData',
      where: { obapiProviderId: accountId, userId },
    });

    if (cachedData) {
      if (!cachedData.data) {
        throw new Error('Failed to fetch cached transactions');
      }
      return JSON.parse(cachedData.data) as TransactionOutput;
    }

    const account = goCardlessClient.account(accountId ?? '');

    const intervalInDays = env.GOCARDLESS_INTERVAL_IN_DAYS ?? 30;
    // Date needs to be in YYYY-MM-DD format according to Nordigen.
    // TODO: In future make it possible to filter on datefrom.
    const transactions = await account.getTransactions({
      dateTo: format(new Date(), 'yyyy-MM-dd'),
      dateFrom: format(subDays(new Date(), intervalInDays), 'yyyy-MM-dd'),
    });

    if (!transactions) {
      throw new Error('Failed to fetch transactions');
    }

    const formatTransaction = (transaction: Transaction): TransactionOutputItem => ({
      transactionId: transaction.transactionId,
      bookingDate: transaction.bookingDate,
      description: transaction.remittanceInformationUnstructured,
      transactionAmount: {
        amount: transaction.transactionAmount.amount,
        currency: transaction.transactionAmount.currency,
      },
    });

    const formattedTransactions: TransactionOutput = {
      transactions: {
        booked: transactions.transactions.booked.map(formatTransaction),
        pending: transactions.transactions.pending.map(formatTransaction),
      },
    };

    await setDbCachedData({
      key: 'cachedBankData',
      where: { obapiProviderId: accountId ?? '', userId },
      data: {
        obapiProviderId: accountId ?? '',
        data: JSON.stringify(formattedTransactions),
        lastFetched: new Date(),
        userId,
      },
    });

    return formattedTransactions;
  },
  connectToBank: async (institutionId?: string) => {
    if (!institutionId) {
      return;
    }

    await goCardlessClient.generateToken();

    const generateRandomId = Array.from({ length: 60 }, () => Math.random().toString(36)[2]).join(
      '',
    );

    const init = await goCardlessClient.initSession({
      redirectUrl: env.NEXTAUTH_URL,
      institutionId: institutionId,
      referenceId: generateRandomId,
      user_language: 'SV',
      redirect_immediate: false,
      account_selection: false,
    });

    if (!init) {
      throw new Error('Failed to link to bank');
    }

    return {
      institutionId: init.id,
      authLink: init.link,
    };
  },
  getInstitutions: async () => {
    await goCardlessClient.generateToken();

    const institutionsData = await goCardlessClient.institution.getInstitutions(
      env.GOCARDLESS_COUNTRY ? { country: env.GOCARDLESS_COUNTRY } : undefined,
    );

    if (!institutionsData) {
      throw new Error('Failed to fetch institutions');
    }

    return institutionsData.map((institution) => ({
      id: institution.id,
      name: institution.name,
      logo: institution.logo,
    }));
  },
};
