import { faker } from '@faker-js/faker';
import { type User } from '@prisma/client';

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

const gaussianRandom = (mean = 0, stdev = 1) => {
  const u = 1 - faker.number.float({ min: 0, max: 1 }); // Converting [0,1) to (0,1)
  const v = faker.number.float({ min: 0, max: 1 });
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  // Transform to the desired mean and standard deviation:
  return z * stdev + mean;
};

export const dummyUsers = (() => {
  const users: User[] = [];
  const adjList: number[][] = [];
  const m = 2;

  while (users.length < 1_000) {
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

    // Construct Barabasi-Albert graph to simulate social connections
    // Each new node connects to m existing nodes with a probability proportional to their degree
    // This creates a scale-free network with some highly connected hubs
    // Reference: https://en.wikipedia.org/wiki/Barab%C3%A1si%E2%80%93Albert_model
    if (users.length > m) {
      const targets = new Set<number>();
      const degreeSum = adjList.reduce((sum, adj) => sum + adj.length, 0);
      while (targets.size < m) {
        for (let i = 0; i < adjList.length; i++) {
          const prob = adjList[i]!.length / degreeSum;
          if (faker.number.float({ min: 0, max: 1 }) < prob) {
            targets.add(i);
            if (targets.size >= m) {
              break;
            }
          }
        }
      }
      const newNodeIndex = adjList.length;
      adjList.push(Array.from(targets));
      targets.forEach((t) => adjList[t]!.push(newNodeIndex));
    }
  }

  return users;
})();

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

// {
//     name: 'Dinner at local ramen shop',
//     category: 'diningOut',
//     amount: 6800,
//     currency: 'JPY',
//     splitType: SplitType.EQUAL,
//     paidByIndex: 0,
//     participantIndices: [0, 3, 4],
//   },

const expenseGenerator = () => {
  const expenses = [];
};
