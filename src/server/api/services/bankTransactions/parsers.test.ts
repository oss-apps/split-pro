import { CountryCode } from 'plaid';

import { parseCachedTransactionOutput, parsePlaidCountryCodes } from './parsers';

describe('parseCachedTransactionOutput', () => {
  const validData = {
    transactions: {
      booked: [
        {
          transactionId: 'transaction-1',
          bookingDate: '2026-10-15',
          description: 'Coffee',
          transactionAmount: { amount: '1.25', currency: 'USD' },
        },
      ],
      pending: [],
    },
  };

  it('parses cached transaction JSON against the runtime output schema', () => {
    expect(parseCachedTransactionOutput(JSON.stringify(validData))).toStrictEqual(validData);
  });

  it('rejects malformed JSON and wrong-shaped cached data rather than returning empty data', () => {
    expect(() => parseCachedTransactionOutput('{')).toThrow();
    expect(() =>
      parseCachedTransactionOutput(JSON.stringify({ transactions: { booked: [] } })),
    ).toThrow();
  });
});

describe('parsePlaidCountryCodes', () => {
  it('defaults absent and empty values to the US', () => {
    expect(parsePlaidCountryCodes(undefined)).toStrictEqual([CountryCode.Us]);
    expect(parsePlaidCountryCodes('')).toStrictEqual([CountryCode.Us]);
  });

  it('preserves valid country code case, order, and duplicates exactly', () => {
    expect(parsePlaidCountryCodes('US,CA,US')).toStrictEqual([
      CountryCode.Us,
      CountryCode.Ca,
      CountryCode.Us,
    ]);
  });

  it('rejects invalid country codes instead of dropping or defaulting them', () => {
    expect(() => parsePlaidCountryCodes('US,XX')).toThrow();
    expect(() => parsePlaidCountryCodes('us')).toThrow();
    expect(() => parsePlaidCountryCodes('US, CA')).toThrow();
  });
});
