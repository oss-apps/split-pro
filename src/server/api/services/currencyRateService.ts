import { format, isToday } from 'date-fns';
import { env } from '~/env';
import type { CurrencyCode } from '~/lib/currency';
import { db } from '~/server/db';

export interface RateResponse {
  base: string;
  rates: { [key: string]: number };
}

class ProviderMissingError extends Error {}

abstract class CurrencyRateProvider {
  intermediateBase: CurrencyCode | null = null;
  abstract providerName: string;

  abstract fetchRates(from: CurrencyCode, to: CurrencyCode, date?: Date): Promise<RateResponse>;

  public async getCurrencyRate(
    from: CurrencyCode,
    to: CurrencyCode,
    date: Date = new Date(),
  ): Promise<number> {
    if (from === to) {
      return 1;
    }

    const cachedRate = await this.checkCache(from, to, date);
    if (cachedRate) {
      return cachedRate;
    }

    const data = await this.fetchRates(from, to, date);

    await Promise.all(
      Object.entries(data.rates).map(([to, rate]) =>
        db.currencyRateCache.upsert({
          where: {
            from_to_date: { from: data.base, to, date },
          },
          create: {
            from,
            to,
            date,
            rate,
          },
          update: {
            rate,
          },
        }),
      ),
    );

    const res = await this.checkCache(from, to, date);
    if (res) {
      return res;
    }

    throw new Error('Failed to retrieve currency rate');
  }

  protected async checkCache(
    from: CurrencyCode,
    to: CurrencyCode,
    date: Date = new Date(),
  ): Promise<number | undefined> {
    const cachedRate = await db.currencyRateCache.findUnique({
      where: {
        from_to_date: { from, to, date },
      },
    });

    if (cachedRate) {
      void db.currencyRateCache.update({
        where: {
          from_to_date: { from, to, date },
        },
        data: {
          insertedAt: new Date(),
        },
      });
      return cachedRate.rate;
    }

    const reverseCachedRate = await db.currencyRateCache.findUnique({
      where: {
        from_to_date: { from: to, to: from, date },
      },
    });

    if (reverseCachedRate) {
      void db.currencyRateCache.update({
        where: {
          from_to_date: { from: to, to: from, date },
        },
        data: {
          insertedAt: new Date(),
        },
      });
      return 1 / reverseCachedRate.rate;
    }

    if ([null, from, to].includes(this.intermediateBase)) {
      return undefined;
    }

    // try with intermediate base currency
    const rateFromIntermediate = await this.checkCache(this.intermediateBase!, from, date);
    const rateToIntermediate = await this.checkCache(this.intermediateBase!, to, date);

    if (rateFromIntermediate && rateToIntermediate) {
      void db.currencyRateCache.update({
        where: {
          from_to_date: { from: this.intermediateBase!, to: from, date },
        },
        data: {
          insertedAt: new Date(),
        },
      });
      void db.currencyRateCache.update({
        where: {
          from_to_date: { from: this.intermediateBase!, to, date },
        },
        data: {
          insertedAt: new Date(),
        },
      });
      return rateFromIntermediate / rateToIntermediate;
    }
  }
}

class FrankfurterProvider extends CurrencyRateProvider {
  providerName = 'frankfurter';

  async fetchRates(from: CurrencyCode, to: CurrencyCode, date?: Date): Promise<RateResponse> {
    const key = !date || isToday(date) ? 'latest' : format(date, 'yyyy-MM-dd');

    const response = await fetch(
      `https://api.frankfurter.dev/v1/${key}?base=${from}&symbols=${to}`,
    );
    const data: RateResponse = await response.json();

    if (response.ok) {
      return data;
    }

    throw new Error(response.statusText || 'Failed to fetch exchange rates');
  }
}

class OpenExchangeRatesProvider extends CurrencyRateProvider {
  providerName = 'openexchangerates';
  intermediateBase: CurrencyCode = 'USD';

  async fetchRates(from: CurrencyCode, to: CurrencyCode, date?: Date): Promise<RateResponse> {
    if (!process.env.OPEN_EXCHANGE_RATES_APP_ID) {
      throw new ProviderMissingError('Open Exchange Rates API key not provided');
    }
    const key = !date || isToday(date) ? 'latest' : `hitorical/${format(date, 'yyyy-MM-dd')}`;

    // sadly the free tier supports only USD as base currency
    const response = await fetch(
      `https://openexchangerates.org/api/${key}.json?app_id=${process.env.OPEN_EXCHANGE_RATES_APP_ID}`,
    );
    const data: RateResponse = await response.json();

    if (response.ok) {
      return data;
    }

    throw new Error(response.statusText || 'Failed to fetch exchange rates');
  }
}

export const currencyRateProvider = (() => {
  if (env.CURRENCY_RATE_PROVIDER === 'openexchangerates' && env.OPEN_EXCHANGE_RATES_APP_ID) {
    return new OpenExchangeRatesProvider();
  }

  return new FrankfurterProvider();
})();
