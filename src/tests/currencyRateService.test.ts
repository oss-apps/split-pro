const cache = new Map<
  string,
  {
    from: string;
    to: string;
    date: Date;
    rate: number;
    precision: number;
    lastFetched: Date;
    createdAt: Date;
    updatedAt: Date;
  }
>();

const buildCacheKey = (from: string, to: string, date: Date) =>
  `${from}-${to}-${date.toISOString()}`;

jest.mock('~/server/db', () => ({
  db: {
    cachedCurrencyRate: {
      findUnique: jest.fn(({ where }: { where: { from_to_date: any } }) => {
        const key = buildCacheKey(
          where.from_to_date.from,
          where.from_to_date.to,
          where.from_to_date.date,
        );
        return cache.get(key) ?? null;
      }),
      upsert: jest.fn(({ where, create, update }: any) => {
        const key = buildCacheKey(
          where.from_to_date.from,
          where.from_to_date.to,
          where.from_to_date.date,
        );
        const existing = cache.get(key);
        const next = {
          ...(existing ?? create),
          ...update,
        };
        cache.set(key, next);
        return next;
      }),
      update: jest.fn(({ where, data }: any) => {
        const key = buildCacheKey(
          where.from_to_date.from,
          where.from_to_date.to,
          where.from_to_date.date,
        );
        const existing = cache.get(key);
        if (!existing) {
          return null;
        }
        const next = { ...existing, ...data };
        cache.set(key, next);
        return next;
      }),
    },
  },
}));

jest.mock('~/env', () => ({
  env: {
    CURRENCY_RATE_PROVIDER: 'frankfurter',
    OPEN_EXCHANGE_RATES_APP_ID: undefined,
  },
}));

import { CurrencyRateProvider } from '~/server/api/services/currencyRateService';

const mockRawResponse =
  '{"base":"USD","rates":{"EUR":0.92345,"IDR":0.00005,"PLN":4.0000,"GBP":0.80000,"JPY":150.0}}';

class MockProvider extends CurrencyRateProvider {
  providerName = 'mock';
  intermediateBase = 'USD' as const;

  async fetchRates(): Promise<{ base: string; rates: { [key: string]: string } }> {
    const wrapped = mockRawResponse.replace(
      /("rates"\s*:\s*\{)([\s\S]*?)(\})/g,
      (_match, start, body, end) =>
        `${start}${body.replace(
          /("([A-Z]{3})"\s*:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
          '$1"$3"',
        )}${end}`,
    );

    return JSON.parse(wrapped);
  }
}

describe('CurrencyRateProvider precision handling', () => {
  beforeEach(() => {
    cache.clear();
  });

  it('preserves precision from raw JSON numbers', async () => {
    const provider = new MockProvider();
    const rate = await provider.getCurrencyRate('USD', 'PLN');

    expect(rate.rate).toBeCloseTo(4.0, 8);
    expect(rate.precision).toBe(4);
  });

  it('rounds inverted rates using the original precision', async () => {
    const provider = new MockProvider();
    await provider.getCurrencyRate('USD', 'PLN');

    const inverted = await provider.getCurrencyRate('PLN', 'USD');
    expect(inverted.precision).toBe(4);
    expect(inverted.rate.toFixed(inverted.precision)).toBe('0.2500');
  });

  it('uses the highest precision when combining via intermediate', async () => {
    const provider = new MockProvider();
    await provider.getCurrencyRate('USD', 'GBP');
    await provider.getCurrencyRate('USD', 'EUR');

    const combined = await provider.getCurrencyRate('GBP', 'EUR');
    expect(combined.precision).toBe(5);
    expect(combined.rate).toBeCloseTo(1.15431, 5);
  });

  it('keeps tiny rates from JSON without losing precision', async () => {
    const provider = new MockProvider();
    const tiny = await provider.getCurrencyRate('USD', 'IDR');

    expect(tiny.precision).toBe(5);
    expect(tiny.rate).toBe(0.00005);
  });
});
