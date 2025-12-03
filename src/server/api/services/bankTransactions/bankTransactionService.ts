import { type BankProviders, whichBankConnectionConfigured } from '~/server/bankTransactionHelper';
import type { TransactionOutput } from '~/types/bank.types';
import { GoCardlessService } from './gocardless';
import { PlaidService } from './plaid';
import { TRPCError } from '@trpc/server';

abstract class AbstractBankTransactionService {
  abstract getTransactions(userId: number, token?: string): Promise<TransactionOutput | undefined>;
  abstract connectToBank(
    id?: string,
    preferredLanguage?: string,
  ): Promise<{ institutionId: string; authLink: string } | undefined>;
  abstract getInstitutions(): Promise<{ id: string; name: string; logo: string }[]>;
  exchangePublicToken?(
    publicToken: string,
  ): Promise<{ accessToken: string; itemId: string } | undefined>;
}

export class BankTransactionService {
  private readonly connectedProvider: BankProviders | null;
  private readonly provider: AbstractBankTransactionService | null;

  constructor() {
    this.connectedProvider = whichBankConnectionConfigured();
    this.provider =
      this.connectedProvider === 'GOCARDLESS'
        ? new GoCardlessService()
        : this.connectedProvider === 'PLAID'
          ? new PlaidService()
          : null;
  }

  getProvider(): AbstractBankTransactionService | null {
    if (!this.provider) {
      return null;
    }

    return this.provider;
  }

  async getTransactions(userId: number, token?: string): Promise<TransactionOutput | undefined> {
    if (!this.provider) {
      return;
    }

    return this.provider?.getTransactions(userId, token);
  }

  async connectToBank(
    id?: string,
    preferredLanguage?: string,
  ): Promise<{ institutionId: string; authLink: string } | undefined> {
    if (!this.provider) {
      return;
    }

    const res = this.provider?.connectToBank(id, preferredLanguage);
    if (!res) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to link to bank' });
    }

    return res;
  }

  async getInstitutions(): Promise<{ id: string; name: string; logo: string }[]> {
    if (!this.provider) {
      return [];
    }
    return this.provider?.getInstitutions();
  }
}

export const bankTransactionService = new BankTransactionService();
