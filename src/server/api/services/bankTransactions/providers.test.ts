const mockProvider = {
  generateToken: jest.fn().mockResolvedValue(undefined),
  requisition: {
    getRequisitionById: jest.fn().mockResolvedValue({ accounts: ['account-1'] }),
  },
  account: jest.fn(() => ({
    getTransactions: jest.fn().mockResolvedValue({ transactions: { booked: [], pending: [] } }),
  })),
  transactionsGet: jest.fn().mockResolvedValue({ data: { transactions: [] } }),
  linkTokenCreate: jest.fn().mockResolvedValue({ data: { link_token: 'link-token' } }),
  institutionsGet: jest.fn().mockResolvedValue({ data: { institutions: [] } }),
};

const mockFindUnique = jest.fn();
const mockUpsert = jest.fn().mockResolvedValue(undefined);

jest.mock('nordigen-node', () => jest.fn(() => mockProvider));
jest.mock('plaid', () => ({
  Configuration: jest.fn(),
  CountryCode: { Us: 'US', Ca: 'CA' },
  PlaidApi: jest.fn(() => mockProvider),
  PlaidEnvironments: { production: 'production', sandbox: 'sandbox' },
  Products: { Transactions: 'transactions' },
}));
jest.mock('~/env', () => ({
  env: {
    GOCARDLESS_SECRET_ID: 'secret-id',
    GOCARDLESS_SECRET_KEY: 'secret-key',
    NEXTAUTH_URL: 'http://localhost',
    PLAID_CLIENT_ID: 'client-id',
    PLAID_SECRET: 'secret',
    PLAID_ENVIRONMENT: 'sandbox',
    PLAID_COUNTRY_CODES: undefined,
  },
}));
jest.mock('~/server/db', () => ({
  db: {
    cachedBankData: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}));

import { CountryCode } from 'plaid';

import { env } from '~/env';
import { GoCardlessService } from '~/server/api/services/bankTransactions/gocardless';
import { PlaidService } from '~/server/api/services/bankTransactions/plaid';

const validOutput = {
  transactions: {
    booked: [
      {
        transactionId: 'cached-transaction',
        bookingDate: '2026-10-15',
        description: 'Coffee',
        transactionAmount: { amount: '1.25', currency: 'USD' },
      },
    ],
    pending: [],
  },
};

const freshCache = (data: string | null) => ({
  data,
  lastFetched: new Date(Date.now() - 60_000),
});

describe('bank transaction provider cache behavior', () => {
  const goCardless = new GoCardlessService();
  const plaid = new PlaidService();

  beforeEach(() => {
    jest.clearAllMocks();
    mockProvider.requisition.getRequisitionById.mockResolvedValue({ accounts: ['account-1'] });
    mockProvider.account.mockReturnValue({
      getTransactions: jest.fn().mockResolvedValue({ transactions: { booked: [], pending: [] } }),
    });
    mockProvider.transactionsGet.mockResolvedValue({ data: { transactions: [] } });
  });

  it.each([
    ['GoCardless', goCardless, 'requisition-1'],
    ['Plaid', plaid, 'access-token'],
  ] as const)(
    '%s returns validated fresh cache without provider transaction fetch',
    async (_, service, token) => {
      mockFindUnique.mockResolvedValue(freshCache(JSON.stringify(validOutput)));

      await expect(service.getTransactions(7, token)).resolves.toStrictEqual(validOutput);

      expect(mockProvider.transactionsGet).not.toHaveBeenCalled();
      expect(mockProvider.account).not.toHaveBeenCalled();
      if (service === goCardless) {
        expect(mockProvider.generateToken).toHaveBeenCalledTimes(1);
        expect(mockProvider.requisition.getRequisitionById).toHaveBeenCalledWith(token);
        expect(mockProvider.generateToken.mock.invocationCallOrder[0]).toBeLessThan(
          mockProvider.requisition.getRequisitionById.mock.invocationCallOrder[0]!,
        );
        expect(
          mockProvider.requisition.getRequisitionById.mock.invocationCallOrder[0],
        ).toBeLessThan(mockFindUnique.mock.invocationCallOrder[0]!);
      }
    },
  );

  it.each([
    ['GoCardless', goCardless, 'requisition-1'],
    ['Plaid', plaid, 'access-token'],
  ] as const)(
    '%s rejects malformed and wrong-shaped cache without fallback fetch',
    async (_, service, token) => {
      mockFindUnique.mockResolvedValue(freshCache('{'));
      await expect(service.getTransactions(7, token)).rejects.toThrow();
      mockFindUnique.mockResolvedValue(
        freshCache(JSON.stringify({ transactions: { booked: [] } })),
      );
      await expect(service.getTransactions(7, token)).rejects.toThrow();

      expect(mockProvider.transactionsGet).not.toHaveBeenCalled();
      expect(mockProvider.account).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['GoCardless', goCardless, 'requisition-1'],
    ['Plaid', plaid, 'access-token'],
  ] as const)('%s errors for empty cached data even after expiry', async (_, service, token) => {
    mockFindUnique.mockResolvedValue({ data: '', lastFetched: new Date(0) });

    await expect(service.getTransactions(7, token)).rejects.toMatchObject({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch cached transactions',
    });
    expect(mockProvider.transactionsGet).not.toHaveBeenCalled();
    expect(mockProvider.account).not.toHaveBeenCalled();
  });

  it('returns undefined for missing credentials without database or provider requests', async () => {
    await expect(goCardless.getTransactions(7)).resolves.toBeUndefined();
    await expect(plaid.getTransactions(7)).resolves.toBeUndefined();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockProvider.generateToken).not.toHaveBeenCalled();
  });

  it.each([
    ['missing cache', null],
    ['expired cache', { data: JSON.stringify(validOutput), lastFetched: new Date(0) }],
  ])('fetches from both providers on %s', async (_, cached) => {
    mockFindUnique.mockResolvedValue(cached);

    await expect(plaid.getTransactions(7, 'access-token')).resolves.toStrictEqual({
      transactions: { booked: [], pending: [] },
    });
    await expect(goCardless.getTransactions(7, 'requisition-1')).resolves.toStrictEqual({
      transactions: { booked: [], pending: [] },
    });

    expect(mockProvider.transactionsGet).toHaveBeenCalledTimes(1);
    expect(mockProvider.account).toHaveBeenCalledTimes(1);
  });

  it('treats the exact 24-hour expiry boundary as expired', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    mockFindUnique.mockResolvedValue({
      data: JSON.stringify(validOutput),
      lastFetched: new Date(Date.now() - 24 * 60 * 60 * 1000),
    });

    await plaid.getTransactions(7, 'access-token');

    expect(mockProvider.transactionsGet).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

describe('Plaid country code consumers', () => {
  const plaid = new PlaidService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes parsed country codes to both link-token and institutions requests', async () => {
    jest.replaceProperty(env, 'PLAID_COUNTRY_CODES', 'CA,US');

    await plaid.connectToBank('user-id');
    await plaid.getInstitutions();

    expect(mockProvider.linkTokenCreate).toHaveBeenCalledWith(
      expect.objectContaining({ country_codes: [CountryCode.Ca, CountryCode.Us] }),
    );
    expect(mockProvider.institutionsGet).toHaveBeenCalledWith(
      expect.objectContaining({ country_codes: [CountryCode.Ca, CountryCode.Us] }),
    );
  });

  it.each(['XX', 'US, CA'])(
    'rejects invalid configured countries before SDK calls (%s)',
    async (codes) => {
      jest.replaceProperty(env, 'PLAID_COUNTRY_CODES', codes);

      await expect(plaid.connectToBank('user-id')).rejects.toThrow();
      await expect(plaid.getInstitutions()).rejects.toThrow();
      expect(mockProvider.linkTokenCreate).not.toHaveBeenCalled();
      expect(mockProvider.institutionsGet).not.toHaveBeenCalled();
    },
  );
});
