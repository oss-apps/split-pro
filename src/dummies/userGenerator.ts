import { faker } from '@faker-js/faker';

const MAJOR_CURRENCY_PROB = 0.95;
const USER_COUNT = 1000;

const majorCurrencies = ['USD', 'EUR', 'GBP'] as const;
const oddCurrencies = [
  'JPY', // 0 decimals
  'BHD', // 3 decimals
  'CHF', // roundging 0.05
] as const;
const weightedCurrencies = [
  ...majorCurrencies.map((value) => ({ weight: MAJOR_CURRENCY_PROB, value })),
  ...oddCurrencies.map((value) => ({ weight: 1 - MAJOR_CURRENCY_PROB, value })),
];

export type DummyCurrencyCode = (typeof majorCurrencies)[number] | (typeof oddCurrencies)[number];

/**
 * Currency conversion multipliers from USD to other currencies
 * Used to convert amount ranges to realistic values in different currencies
 * Base currency is USD (multiplier = 1)
 */
export const CURRENCY_MULTIPLIERS = {
  USD: 1,
  EUR: 0.8588,
  GBP: 0.7462,
  JPY: 151,
  BHD: 0.376,
  CHF: 0.7968,
} as const satisfies Record<DummyCurrencyCode, number>;

export const generateUsers = () => {
  const users = [];

  while (users.length < USER_COUNT) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = faker.internet.exampleEmail({ firstName, lastName }).toLowerCase();
    const currency = faker.helpers.weightedArrayElement(weightedCurrencies);

    users.push({
      id: users.length,
      currency,
      name,
      email,
    });
  }

  return users;
};

export type DummyUserInfo = ReturnType<typeof generateUsers>[number];
