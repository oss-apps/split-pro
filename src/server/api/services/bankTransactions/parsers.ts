import { CountryCode } from 'plaid';
import { z } from 'zod';

import { TransactionOutput } from '~/types/bank.types';

export const parseCachedTransactionOutput = (data: string) => {
  const parsedData: unknown = JSON.parse(data);
  return TransactionOutput.parse(parsedData);
};

const CountryCodes = z.array(z.nativeEnum(CountryCode));

export const parsePlaidCountryCodes = (rawCountryCodes: string | undefined) =>
  undefined === rawCountryCodes || '' === rawCountryCodes
    ? [CountryCode.Us]
    : CountryCodes.parse(rawCountryCodes.split(','));
