import { format, isToday } from 'date-fns';
import type { CurrencyCode } from '~/lib/currency';

export interface RateResponse {
  base: string;
  rates: { [key: string]: number };
}

class ProviderMissingError extends Error {}

export const getCurrencyRates = async (
  from: CurrencyCode,
  to: CurrencyCode,
  date?: Date,
): Promise<RateResponse> => {
  if (FRANKFURTER_CURRENCIES.includes(from) && FRANKFURTER_CURRENCIES.includes(to)) {
    return frankfurterFetchRates(from, to, date);
  } else if (from === 'USD' || to === 'USD') {
    return oxrFetchRates(date);
  } else {
    throw new ProviderMissingError(`No currency API available for ${from} or ${to}`);
  }
};

async function frankfurterFetchRates(
  from: CurrencyCode,
  to: CurrencyCode,
  date?: Date,
): Promise<RateResponse> {
  const key = !date || isToday(date) ? 'latest' : format(date, 'yyyy-MM-dd');

  const response = await fetch(`https://api.frankfurter.dev/v1/${key}?base=${from}&symbols=${to}`);
  const data: RateResponse = await response.json();

  if (response.ok) {
    return data;
  }

  throw new Error(response.statusText || 'Failed to fetch exchange rates');
}

async function oxrFetchRates(date?: Date): Promise<RateResponse> {
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

// Check with https://api.frankfurter.dev/v1/currencies
export const FRANKFURTER_CURRENCIES = [
  'AUD',
  'BGN',
  'BRL',
  'CAD',
  'CHF',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'ISK',
  'JPY',
  'KRW',
  'MXN',
  'MYR',
  'NOK',
  'NZD',
  'PHP',
  'PLN',
  'RON',
  'SEK',
  'SGD',
  'THB',
  'TRY',
  'USD',
  'ZAR',
];
