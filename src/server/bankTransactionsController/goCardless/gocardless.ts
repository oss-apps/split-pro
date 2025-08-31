import NordigenClient from 'nordigen-node';
import { env } from '~/env';
import { getDbCachedData, setDbCachedData } from '../../api/services/dbCache';
import type { CachedBankData } from '@prisma/client';
import type { TransactionOutput } from '../../bankTransactionHelper';
import { ERROR_MESSAGES, GOCARDLESS_CONSTANTS } from './constants';
import { formatTransactions } from './mapper';
import { createDateRange, generateRandomId } from './utils';

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
        throw new Error(ERROR_MESSAGES.FAILED_FETCH_CACHED);
      }
      return JSON.parse(cachedData.data) as TransactionOutput;
    }

    const account = goCardlessClient.account(accountId ?? '');

    const intervalInDays =
      env.GOCARDLESS_INTERVAL_IN_DAYS ?? GOCARDLESS_CONSTANTS.DEFAULT_INTERVAL_DAYS;

    const transactions = await account.getTransactions(createDateRange(intervalInDays));

    if (!transactions) {
      throw new Error(ERROR_MESSAGES.FAILED_FETCH_TRANSACTIONS);
    }

    const formattedTransactions: TransactionOutput = formatTransactions(transactions);

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
  connectToBank: async (institutionId?: string, preferredLanguage?: string) => {
    if (!institutionId) {
      return;
    }

    await goCardlessClient.generateToken();

    const init = await goCardlessClient.initSession({
      redirectUrl: env.NEXTAUTH_URL,
      institutionId: institutionId,
      referenceId: generateRandomId(),
      user_language: preferredLanguage?.toUpperCase() ?? GOCARDLESS_CONSTANTS.DEFAULT_LANGUAGE,
      redirect_immediate: false,
      account_selection: false,
    });

    if (!init) {
      throw new Error(ERROR_MESSAGES.FAILED_LINK_BANK);
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
      throw new Error(ERROR_MESSAGES.FAILED_FETCH_INSTITUTIONS);
    }

    return institutionsData.map((institution) => ({
      id: institution.id,
      name: institution.name,
      logo: institution.logo,
    }));
  },
};
