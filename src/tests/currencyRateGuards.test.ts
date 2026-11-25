const cachedRates = new Map<string, number>();
const mockFetch = jest.fn();

jest.mock('~/env', () => ({
  env: {
    CURRENCY_RATE_PROVIDER: 'openexchangerates',
    OPEN_EXCHANGE_RATES_APP_ID: 'test-app-id',
  },
}));

jest.mock('~/server/db', () => ({
  db: {
    cachedCurrencyRate: {
      findUnique: jest.fn(({ where }) => {
        const { from, to, date } = where.from_to_date;
        const rate = cachedRates.get(`${from}:${to}:${date.toISOString()}`);
        return Promise.resolve(rate === undefined ? null : { rate });
      }),
      upsert: jest.fn(({ where, create }) => {
        const { from, to, date } = where.from_to_date;
        cachedRates.set(`${from}:${to}:${date.toISOString()}`, create.rate);
        return Promise.resolve(create);
      }),
      update: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

import { currencyRateProvider } from '~/server/api/services/currencyRateService';

describe('currency rate currency guards', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    cachedRates.clear();
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('caches supported rates and skips unsupported target keys', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        base: 'USD',
        rates: { EUR: 0.92, UNKNOWN: 8 },
      }),
    });

    const rate = await currencyRateProvider.getCurrencyRate('USD', 'EUR', new Date('2025-01-01'));

    expect(rate).toBe(0.92);
    expect(cachedRates.size).toBe(1);
    expect(cachedRates.values().next().value).toBe(0.92);
  });

  it('rejects unsupported base currencies without writing rates', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'UNKNOWN', rates: { EUR: 0.92 } }),
    });

    await expect(
      currencyRateProvider.getCurrencyRate('USD', 'EUR', new Date('2025-01-01')),
    ).rejects.toThrow('Unsupported base currency: UNKNOWN');

    expect(cachedRates.size).toBe(0);
  });

  it('returns a cached supported rate on the next request without fetching', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', rates: { EUR: 0.92 } }),
    });
    const date = new Date('2025-01-01');

    await currencyRateProvider.getCurrencyRate('USD', 'EUR', date);
    await currencyRateProvider.getCurrencyRate('USD', 'EUR', date);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('skips unsupported own-looking and inherited prototype keys', async () => {
    const rates = { EUR: 0.92, toString: 4 };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ base: 'USD', rates }),
    });

    await currencyRateProvider.getCurrencyRate('USD', 'EUR', new Date('2025-01-01'));

    expect(cachedRates.size).toBe(1);
  });
});
