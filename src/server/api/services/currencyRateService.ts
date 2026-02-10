import { format, getISODay, isToday, subDays } from 'date-fns';
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
        this.upsertCache(data.base as CurrencyCode, to as CurrencyCode, date, rate),
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
    const cachedRate = await this.getCache(from, to, date);

    if (cachedRate) {
      return cachedRate.rate;
    }

    const reverseCachedRate = await this.getCache(to, from, date);

    if (reverseCachedRate) {
      void this.upsertCache(from, to, date, 1 / reverseCachedRate.rate);
      return 1 / reverseCachedRate.rate;
    }

    if ([null, from, to].includes(this.intermediateBase)) {
      return undefined;
    }

    // Try with intermediate base currency
    const rateFromIntermediate = await this.checkCache(this.intermediateBase!, from, date);
    const rateToIntermediate = await this.checkCache(this.intermediateBase!, to, date);

    if (rateFromIntermediate && rateToIntermediate) {
      const rate = rateToIntermediate / rateFromIntermediate;
      void this.upsertCache(from, to, date, rate);
      return rate;
    }
  }

  private upsertCache(from: CurrencyCode, to: CurrencyCode, date: Date, rate: number) {
    return db.cachedCurrencyRate.upsert({
      where: {
        from_to_date: { from, to, date },
      },
      create: {
        from,
        to,
        date,
        rate,
        lastFetched: new Date(),
      },
      update: {
        rate,
        lastFetched: new Date(),
      },
    });
  }

  private async getCache(from: CurrencyCode, to: CurrencyCode, date: Date) {
    const result = await db.cachedCurrencyRate.findUnique({
      where: {
        from_to_date: { from, to, date },
      },
    });
    if (result) {
      void db.cachedCurrencyRate.update({
        where: {
          from_to_date: { from, to, date },
        },
        data: {
          lastFetched: new Date(),
        },
      });
    }
    return result;
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
    if (!env.OPEN_EXCHANGE_RATES_APP_ID) {
      throw new ProviderMissingError('Open Exchange Rates API key not provided');
    }
    const key = !date || isToday(date) ? 'latest' : `historical/${format(date, 'yyyy-MM-dd')}`;

    // Sadly the free tier supports only USD as base currency
    const response = await fetch(
      `https://openexchangerates.org/api/${key}.json?app_id=${env.OPEN_EXCHANGE_RATES_APP_ID}`,
    );
    const data: RateResponse = await response.json();

    if (response.ok) {
      return data;
    }

    throw new Error(response.statusText || 'Failed to fetch exchange rates');
  }
}

class NbpProvider extends CurrencyRateProvider {
  providerName = 'nbp';
  intermediateBase: CurrencyCode = 'PLN';

  async fetchRates(from: CurrencyCode, to: CurrencyCode, date?: Date): Promise<RateResponse> {
    const key = !date || isToday(date) ? '' : format(date, 'yyyy-MM-dd');

    const response = await this.getBothTables(key);

    return {
      base: 'PLN',
      rates: Object.fromEntries(response.rates.map((rate) => [rate.code, 1 / rate.mid])),
    };
  }

  private async getBothTables(date: string) {
    const [tableA, tableB] = await Promise.all([
      this.getRates('A', date),
      this.getRates('B', date),
    ]);

    return {
      ...tableA[0],
      rates: [...(tableA[0]?.rates || []), ...(tableB[0]?.rates || [])],
    };
  }

  private async getRates(
    table: 'A' | 'B',
    date: string,
  ): Promise<
    {
      table: string;
      no: string;
      effectiveDate: string;
      rates: { currency: string; code: string; mid: number }[];
    }[]
  > {
    const response = await fetch(
      `https://api.nbp.pl/api/exchangerates/tables/${table}/${date}/?format=json`,
    );
    if (!response.ok) {
      if (table === 'A') {
        throw new Error(response.statusText || 'Failed to fetch exchange rates');
      } else {
        // Table B is published weekly on Wednesdays
        const currentIsoDay = getISODay(date);
        const previousWednesday = subDays(
          date,
          currentIsoDay >= 3 ? currentIsoDay - 3 : 7 - (3 - currentIsoDay),
        );
        return this.getRates(table, format(previousWednesday, 'yyyy-MM-dd'));
      }
    }

    return response.json();
  }
}

export const currencyRateProvider = (() => {
  if (env.CURRENCY_RATE_PROVIDER === 'openexchangerates' && env.OPEN_EXCHANGE_RATES_APP_ID) {
    return new OpenExchangeRatesProvider();
  } else if (env.CURRENCY_RATE_PROVIDER === 'nbp') {
    return new NbpProvider();
  }

  return new FrankfurterProvider();
})();
