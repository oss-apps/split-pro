import { TRPCError } from '@trpc/server';
import { format, subDays } from 'date-fns';
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
  type Transaction,
} from 'plaid';
import { env } from '~/env';
import { db } from '~/server/db';
import type { TransactionOutput, TransactionOutputItem } from '~/types/bank.types';

abstract class AbstractBankProvider {
  abstract getTransactions(userId: number, token?: string): Promise<TransactionOutput | undefined>;
  abstract connectToBank(
    id?: string,
    preferredLanguage?: string,
  ): Promise<{ institutionId: string; authLink: string } | undefined>;
  abstract getInstitutions(): Promise<{ id: string; name: string; logo: string }[]>;
  exchangePublicToken(
    _publicToken: string,
  ): Promise<{ accessToken: string; itemId: string } | undefined> {
    return Promise.resolve(undefined);
  }
}

const PLAID_CONSTANTS = {
  DEFAULT_INTERVAL_DAYS: 30,
  RANDOM_ID_LENGTH: 60,
  DEFAULT_LANGUAGE: 'en',
  DATE_FORMAT: 'yyyy-MM-dd',
} as const;

const ERROR_MESSAGES = {
  FAILED_FETCH_CACHED: 'Failed to fetch cached transactions',
  FAILED_FETCH_INSTITUTIONS: 'Failed to fetch institutions',
  FAILED_FETCH_TRANSACTIONS: 'Failed to fetch transactions',
  FAILED_LINK_BANK: 'Failed to link to bank',
  FAILED_CREATE_LINK_TOKEN: 'Failed to create link token',
  FAILED_EXCHANGE_TOKEN: 'Failed to exchange public token',
} as const;

export class PlaidService extends AbstractBankProvider {
  private readonly client: PlaidApi;

  constructor() {
    super();
    this.client = new PlaidApi(
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
  }

  returnTransactionFilters() {
    const intervalInDays = env.PLAID_INTERVAL_IN_DAYS ?? PLAID_CONSTANTS.DEFAULT_INTERVAL_DAYS;

    return {
      start_date: format(subDays(new Date(), intervalInDays), PLAID_CONSTANTS.DATE_FORMAT),
      end_date: format(new Date(), PLAID_CONSTANTS.DATE_FORMAT),
    };
  }

  async getTransactions(userId: number, accessToken?: string) {
    if (!accessToken) {
      return;
    }

    const cachedData = await db.cachedBankData.findUnique({
      where: { obapiProviderId: accessToken, userId },
    });

    if (cachedData) {
      if (!cachedData.data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: ERROR_MESSAGES.FAILED_FETCH_CACHED,
        });
      }

      await db.cachedBankData.update({
        where: { obapiProviderId: accessToken, userId },
        data: { lastFetched: new Date() },
      });

      return JSON.parse(cachedData.data) as TransactionOutput;
    }

    const response = await this.client.transactionsGet({
      access_token: accessToken,
      ...this.returnTransactionFilters(),
    });

    if (!response.data.transactions) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.FAILED_FETCH_TRANSACTIONS,
      });
    }

    const formattedTransactions: TransactionOutput = this.formatTransactions(
      response.data.transactions,
    );

    const data = {
      obapiProviderId: accessToken,
      data: JSON.stringify(formattedTransactions),
      lastFetched: new Date(),
      user: {
        connect: {
          id: userId,
        },
      },
    };

    await db.cachedBankData.upsert({
      where: { obapiProviderId: accessToken, userId },
      create: data,
      update: {
        lastFetched: new Date(),
      },
    });

    return formattedTransactions;
  }

  async connectToBank(id: string, preferredLanguage?: string) {
    const response = await this.client.linkTokenCreate({
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
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.FAILED_CREATE_LINK_TOKEN,
      });
    }

    return {
      authLink: response.data.link_token,
      institutionId: id ?? '',
    };
  }

  async exchangePublicToken(publicToken: string) {
    const response = await this.client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    if (!response.data.access_token) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.FAILED_EXCHANGE_TOKEN,
      });
    }

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
    };
  }

  async getInstitutions() {
    const response = await this.client.institutionsGet({
      country_codes: env.PLAID_COUNTRY_CODES
        ? (env.PLAID_COUNTRY_CODES.split(',') as CountryCode[])
        : [CountryCode.Us],
      count: 500,
      offset: 0,
    });

    if (!response.data.institutions) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.FAILED_FETCH_INSTITUTIONS,
      });
    }

    return response.data.institutions.map((institution) => ({
      id: institution.institution_id,
      name: institution.name,
      logo: institution.logo || '',
    }));
  }

  private formatTransaction(transaction: Transaction): TransactionOutputItem {
    return {
      transactionId: transaction.transaction_id,
      bookingDate: transaction.date,
      description: transaction.name || transaction.merchant_name || '?',
      transactionAmount: {
        amount: transaction.amount?.toString() || '0',
        currency: transaction.iso_currency_code || 'USD',
      },
    };
  }

  private formatTransactions(transactions: Transaction[]): TransactionOutput {
    const bookedTransactions = transactions.filter((t) => t.pending === false);
    const pendingTransactions = transactions.filter((t) => t.pending === true);

    return {
      transactions: {
        booked: bookedTransactions.map((t) => this.formatTransaction(t)),
        pending: pendingTransactions.map((t) => this.formatTransaction(t)),
      },
    };
  }
}
