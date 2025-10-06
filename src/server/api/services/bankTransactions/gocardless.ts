// @deprecated

import { format, subDays } from 'date-fns';
import NordigenClient, { type Transaction } from 'nordigen-node';
import { env } from '~/env';
import { getDbCachedData, setDbCachedData } from '../dbCache';
import type { CachedBankData } from '@prisma/client';
import type { TransactionOutput, TransactionOutputItem } from '~/types/bank.types';
import { TRPCError } from '@trpc/server';

abstract class AbstractBankProvider {
  abstract getTransactions(userId: number, token?: string): Promise<TransactionOutput | undefined>;
  abstract connectToBank(
    id?: string,
    preferredLanguage?: string,
  ): Promise<{ institutionId: string; authLink: string } | undefined>;
  abstract getInstitutions(): Promise<{ id: string; name: string; logo: string }[]>;
}

const GOCARDLESS_CONSTANTS = {
  DEFAULT_INTERVAL_DAYS: 30,
  RANDOM_ID_LENGTH: 60,
  DEFAULT_LANGUAGE: 'EN',
  DATE_FORMAT: 'yyyy-MM-dd',
} as const;

const ERROR_MESSAGES = {
  FAILED_FETCH_CACHED: 'Failed to fetch cached transactions',
  FAILED_FETCH_INSTITUTIONS: 'Failed to fetch institutions',
  FAILED_FETCH_TRANSACTIONS: 'Failed to fetch transactions',
  FAILED_LINK_BANK: 'Failed to link to bank',
} as const;

export class GoCardlessService extends AbstractBankProvider {
  private readonly client: NordigenClient;

  constructor() {
    super();
    this.client = new NordigenClient({
      secretId: env.GOCARDLESS_SECRET_ID,
      secretKey: env.GOCARDLESS_SECRET_KEY,
    });
  }

  generateRandomId(length: number = GOCARDLESS_CONSTANTS.RANDOM_ID_LENGTH) {
    return Array.from({ length }, () => Math.random().toString(36)[2]).join('');
  }

  returnTransactionFilters() {
    const intervalInDays =
      env.GOCARDLESS_INTERVAL_IN_DAYS ?? GOCARDLESS_CONSTANTS.DEFAULT_INTERVAL_DAYS;

    return {
      dateTo: format(new Date(), GOCARDLESS_CONSTANTS.DATE_FORMAT),
      dateFrom: format(subDays(new Date(), intervalInDays), GOCARDLESS_CONSTANTS.DATE_FORMAT),
    };
  }

  async getTransactions(userId: number, requisitionId?: string) {
    if (!requisitionId) {
      return;
    }

    await this.client.generateToken();

    const requisitionData = await this.client.requisition.getRequisitionById(requisitionId);

    const accountId = requisitionData.accounts[0];

    const cachedData = await getDbCachedData<CachedBankData, 'cachedBankData'>({
      key: 'cachedBankData',
      where: { obapiProviderId: accountId, userId },
    });

    if (cachedData) {
      if (!cachedData.data) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: ERROR_MESSAGES.FAILED_FETCH_CACHED,
        });
      }
      return JSON.parse(cachedData.data) as TransactionOutput;
    }

    const account = this.client.account(accountId ?? '');

    const transactions = await account.getTransactions(this.returnTransactionFilters());

    if (!transactions) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.FAILED_FETCH_TRANSACTIONS,
      });
    }

    const formattedTransactions: TransactionOutput = this.formatTransactions(transactions);

    await setDbCachedData({
      key: 'cachedBankData',
      where: { obapiProviderId: accountId ?? '', userId },
      data: {
        obapiProviderId: accountId ?? '',
        data: JSON.stringify(formattedTransactions),
        lastFetched: new Date(),
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });

    return formattedTransactions;
  }

  async connectToBank(institutionId?: string, preferredLanguage?: string) {
    if (!institutionId) {
      return;
    }

    await this.client.generateToken();

    const init = await this.client.initSession({
      redirectUrl: env.NEXTAUTH_URL,
      institutionId: institutionId,
      referenceId: this.generateRandomId(),
      user_language: preferredLanguage?.toUpperCase() ?? GOCARDLESS_CONSTANTS.DEFAULT_LANGUAGE,
      redirect_immediate: false,
      account_selection: false,
    });

    if (!init) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.FAILED_LINK_BANK,
      });
    }

    return {
      institutionId: init.id,
      authLink: init.link,
    };
  }

  async getInstitutions() {
    await this.client.generateToken();

    const institutionsData = await this.client.institution.getInstitutions(
      env.GOCARDLESS_COUNTRY ? { country: env.GOCARDLESS_COUNTRY } : undefined,
    );

    if (!institutionsData) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: ERROR_MESSAGES.FAILED_FETCH_INSTITUTIONS,
      });
    }

    return institutionsData.map((institution) => ({
      id: institution.id,
      name: institution.name,
      logo: institution.logo,
    }));
  }

  private formatTransaction(transaction: Transaction): TransactionOutputItem {
    return {
      transactionId: transaction.transactionId,
      bookingDate: transaction.bookingDate,
      description: transaction.remittanceInformationUnstructured,
      transactionAmount: {
        amount: transaction.transactionAmount.amount,
        currency: transaction.transactionAmount.currency,
      },
    };
  }

  private formatTransactions(transactions: {
    transactions: { booked: Transaction[]; pending: Transaction[] };
  }): TransactionOutput {
    return {
      transactions: {
        booked: transactions.transactions.booked.map((t) => this.formatTransaction(t)),
        pending: transactions.transactions.pending.map((t) => this.formatTransaction(t)),
      },
    };
  }
}
