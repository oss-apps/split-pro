import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from 'plaid';
import { env } from '~/env';
import { getDbCachedData, setDbCachedData } from '../../api/services/dbCache';
import type { CachedBankData } from '@prisma/client';
import type { TransactionOutput } from '../../bankTransactionHelper';
import { ERROR_MESSAGES, PLAID_CONSTANTS } from './constants';
import { formatTransactions } from './mapper';
import { createDateRange } from './utils';

const plaidClient = new PlaidApi(
  new Configuration({
    basePath:
      env.PLAID_ENVIRONMENT === 'production'
        ? PlaidEnvironments.production
        : PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': env.PLAID_CLIENT_ID,
        'PLAID-SECRET': env.PLAID_SECRET,
      },
    },
  }),
);

export const plaid = {
  getTransactions: async (userId: number, accessToken?: string) => {
    if (!accessToken) {
      return;
    }

    const cachedData = await getDbCachedData<CachedBankData, 'cachedBankData'>({
      key: 'cachedBankData',
      where: { obapiProviderId: accessToken, userId },
    });

    if (cachedData) {
      if (!cachedData.data) {
        throw new Error(ERROR_MESSAGES.FAILED_FETCH_CACHED);
      }
      return JSON.parse(cachedData.data) as TransactionOutput;
    }

    const intervalInDays = env.PLAID_INTERVAL_IN_DAYS ?? PLAID_CONSTANTS.DEFAULT_INTERVAL_DAYS;

    const dateRange = createDateRange(intervalInDays);

    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: dateRange.start_date,
      end_date: dateRange.end_date,
    });

    if (!response.data.transactions) {
      throw new Error(ERROR_MESSAGES.FAILED_FETCH_TRANSACTIONS);
    }

    const formattedTransactions: TransactionOutput = formatTransactions(response.data.transactions);

    await setDbCachedData({
      key: 'cachedBankData',
      where: { obapiProviderId: accessToken, userId },
      data: {
        obapiProviderId: accessToken,
        data: JSON.stringify(formattedTransactions),
        lastFetched: new Date(),
        userId,
      },
    });

    return formattedTransactions;
  },

  connectToBank: async (id: string, institutionId?: string, preferredLanguage?: string) => {
    if (!institutionId) {
      return;
    }
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: id,
      },
      client_name: 'Split Pro',
      products: [Products.Transactions],
      country_codes: env.PLAID_COUNTRY_CODES
        ? (env.PLAID_COUNTRY_CODES.split(',') as CountryCode[])
        : [CountryCode.Us],
      language: preferredLanguage?.toLowerCase() ?? PLAID_CONSTANTS.DEFAULT_LANGUAGE,
    });

    if (!response.data.link_token) {
      throw new Error(ERROR_MESSAGES.FAILED_CREATE_LINK_TOKEN);
    }

    return {
      institutionId: institutionId,
      authLink: response.data.link_token,
    };
  },

  exchangePublicToken: async (publicToken: string) => {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    if (!response.data.access_token) {
      throw new Error(ERROR_MESSAGES.FAILED_EXCHANGE_TOKEN);
    }

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  },

  getInstitutions: async () => {
    const response = await plaidClient.institutionsGet({
      country_codes: env.PLAID_COUNTRY_CODES
        ? (env.PLAID_COUNTRY_CODES.split(',') as CountryCode[])
        : [CountryCode.Us],
      count: 500,
      offset: 0,
    });

    if (!response.data.institutions) {
      throw new Error(ERROR_MESSAGES.FAILED_FETCH_INSTITUTIONS);
    }

    return response.data.institutions.map((institution) => ({
      id: institution.institution_id,
      name: institution.name,
      logo: institution.logo || '',
    }));
  },
};
