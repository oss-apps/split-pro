import { faker } from '@faker-js/faker';
import { SplitType, type User } from '@prisma/client';

const SEED = 2137;

faker.seed(SEED);
faker.setDefaultRefDate('2025-01-01T00:00:00.000Z');

const domains = ['example.com', 'test.com', 'demo.com', 'sample.com', 'mail.com'];

const majorCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'INR', 'AUD', 'CAD'] as const;
const oddCurrencies = [
  'ALL', // 0 decimals
  'BHD', // 3 decimals
  'CHF', // roundging 0.05
] as const;
const weightedCurrencies = [
  ...majorCurrencies.map((value) => ({ weight: 0.95, value })),
  ...oddCurrencies.map((value) => ({ weight: 0.05, value })),
];

export const dummyUsers = (() => {
  const users: User[] = [];

  while (users.length < 10_000) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${faker.helpers.arrayElement(domains)}`;
    const currency = faker.helpers.weightedArrayElement(weightedCurrencies);

    users.push({
      id: users.length,
      currency,
      name,
      email,
      bankingId: null,
      emailVerified: null,
      image: null,
      obapiProviderId: null,
      preferredLanguage: 'en',
    });
  }

  return users;
})();

const gaussianRandom = (mean = 0, stdev = 1) => {
  const u = 1 - faker.number.float({ min: 0, max: 1 }); // Converting [0,1) to (0,1)
  const v = faker.number.float({ min: 0, max: 1 });
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  // Transform to the desired mean and standard deviation:
  return z * stdev + mean;
};

export const groups = (() => {
  const getGroupMemberCount = () => {
    const res = gaussianRandom(15, 3);
    return Math.max(Math.round(res), 3);
  };

  const groups = [];

  const weightedTypes = [
    { weight: 0.3, value: 'trip' },
    { weight: 0.3, value: 'job' },
    { weight: 0.3, value: 'household' },
    { weight: 0.1, value: 'cow_friends' },
  ];

  while (groups.length < 200) {
    const type = faker.helpers.weightedArrayElement(weightedTypes);

    const publicId = faker.string.nanoid();
    const memberCount = getGroupMemberCount();
    const memberSet = new Set<number>();
    while (memberSet.size < memberCount) {
      memberSet.add(faker.number.int({ min: 0, max: dummyUsers.length - 1 }));
    }
    const members = Array.from(memberSet).map((index) => dummyUsers[index]!);
    const currency = faker.helpers.weightedArrayElement(
      Object.entries(
        members.reduce<Record<string, number>>((acc, user) => {
          acc[user.currency] = (acc[user.currency] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([value, weight]) => ({ value, weight })),
    );

    switch (type) {
      case 'trip': {
        const destination = faker.location.city();
        const year = faker.number.int({ min: 2018, max: 2025 });
        const name = `${destination} Trip ${year}`;

        groups.push({
          name,
          publicId,
          defaultCurrency: currency,
          members,
          createdBy: members[0]!,
        });
        break;
      }
      case 'job': {
        const company = faker.company.name();
        const name = `Expenses at ${company}`;

        groups.push({
          name,
          publicId,
          defaultCurrency: currency,
          members,
          createdBy: members[0]!,
        });
        break;
      }
      case 'household': {
        const street = faker.location.street();
        const name = `Household at ${street}`;

        groups.push({
          name,
          publicId,
          defaultCurrency: currency,
          members,
          createdBy: members[0]!,
        });
        break;
      }
      case 'cow_friends': {
        const cow = faker.animal.cow();
        const adj = faker.word.adjective({ length: { min: 4, max: 10 } });
        const name = `${adj} ${cow}s`;

        groups.push({
          name,
          publicId,
          defaultCurrency: currency,
          members,
          createdBy: members[0]!,
        });
        break;
      }
    }
  }
})();
