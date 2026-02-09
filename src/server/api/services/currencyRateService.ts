import { format, getISODay, isToday, subDays } from 'date-fns';
import { env } from '~/env';
import type { CurrencyCode } from '~/lib/currency';
import { db } from '~/server/db';

export interface RateResponse {
  base: string;
  rates: { [key: string]: string };
}

export interface ParsedRate {
  rate: number;
  precision: number;
}

class ProviderMissingError extends Error {}

export abstract class CurrencyRateProvider {
  intermediateBase: CurrencyCode | null = null;
  abstract providerName: string;

  abstract fetchRates(from: CurrencyCode, to: CurrencyCode, date?: Date): Promise<RateResponse>;

  public async getCurrencyRate(
    from: CurrencyCode,
    to: CurrencyCode,
    date: Date = new Date(),
  ): Promise<ParsedRate> {
    if (from === to) {
      return { rate: 1, precision: 0 };
    }

    const cachedRate = await this.checkCache(from, to, date);
    if (cachedRate) {
      return cachedRate;
    }

    const data = await this.fetchRates(from, to, date);

    await Promise.all(
      Object.entries(data.rates).map(([to, rate]) =>
        this.upsertCache(
          data.base as CurrencyCode,
          to as CurrencyCode,
          date,
          this.toParsedRate(rate),
        ),
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
  ): Promise<ParsedRate | undefined> {
    const cachedRate = await this.getCache(from, to, date);

    if (cachedRate) {
      return { rate: cachedRate.rate, precision: cachedRate.precision };
    }

    const reverseCachedRate = await this.getCache(to, from, date);

    if (reverseCachedRate) {
      const invertedRate = this.roundRate(1 / reverseCachedRate.rate, reverseCachedRate.precision);
      void this.upsertCache(from, to, date, {
        rate: invertedRate,
        precision: reverseCachedRate.precision,
      });
      return { rate: invertedRate, precision: reverseCachedRate.precision };
    }

    if ([null, from, to].includes(this.intermediateBase)) {
      return undefined;
    }

    // Try with intermediate base currency
    const rateFromIntermediate = await this.checkCache(this.intermediateBase!, from, date);
    const rateToIntermediate = await this.checkCache(this.intermediateBase!, to, date);

    if (rateFromIntermediate && rateToIntermediate) {
      const precision = Math.max(rateFromIntermediate.precision, rateToIntermediate.precision);
      const rate = this.roundRate(rateToIntermediate.rate / rateFromIntermediate.rate, precision);
      void this.upsertCache(from, to, date, { rate, precision });
      return { rate, precision };
    }
  }

  private upsertCache(from: CurrencyCode, to: CurrencyCode, date: Date, parsedRate: ParsedRate) {
    return db.cachedCurrencyRate.upsert({
      where: {
        from_to_date: { from, to, date },
      },
      create: {
        from,
        to,
        date,
        rate: parsedRate.rate,
        precision: parsedRate.precision,
        lastFetched: new Date(),
      },
      update: {
        rate: parsedRate.rate,
        precision: parsedRate.precision,
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

  protected getPrecision(rate: string): number {
    const match = rate.match(/\.(\d+)/);
    if (!match) {
      return 0;
    }
    return match[1]?.length ?? 0;
  }

  protected roundRate(rate: number, precision: number): number {
    if (0 === precision) {
      return Math.round(rate);
    }
    const factor = 10 ** precision;
    return Math.round(rate * factor) / factor;
  }

  protected formatRate(rate: number, precision: number): string {
    return rate.toFixed(precision);
  }

  protected toParsedRate(rate: string): ParsedRate {
    const precision = this.getPrecision(rate);
    return { rate: Number(rate), precision };
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
    const key = !date || isToday(date) ? 'latest' : `historical/${format(date, 'yyyy-MM-dd')}`;

    // Sadly the free tier supports only USD as base currency
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

class NbpProvider extends CurrencyRateProvider {
  providerName = 'nbp';
  intermediateBase: CurrencyCode = 'PLN';

  async fetchRates(from: CurrencyCode, to: CurrencyCode, date?: Date): Promise<RateResponse> {
    const key = !date || isToday(date) ? '' : format(date, 'yyyy-MM-dd');

    const response = await this.getBothTables(key);

    return {
      base: 'PLN',
      rates: Object.fromEntries(
        response.rates.map((rate) => {
          const precision = this.getPrecision(rate.mid);
          const invertedRate = this.roundRate(1 / Number(rate.mid), precision);
          return [rate.code, this.formatRate(invertedRate, precision)];
        }),
      ),
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
      rates: { currency: string; code: string; mid: string }[];
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

    const raw = await response.text();
    const wrapped = raw.replaceAll(/("mid"\s*:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, '$1"$2"');
    return JSON.parse(wrapped);
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
