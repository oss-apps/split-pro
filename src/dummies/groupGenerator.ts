import { faker } from '@faker-js/faker';
import type { DummyCurrencyCode, DummyUserInfo } from './userGenerator';

const GROUP_COUNT = 200;

export enum DummyGroupType {
  Trip,
  Job,
  Household,
  CowFriends,
}

const groupNameGenerators = {
  [DummyGroupType.Trip]: (date: Date) => {
    const destination = faker.location.city();
    return `${destination} Trip ${date.getFullYear()}`;
  },
  [DummyGroupType.Job]: () => {
    const company = faker.company.name();
    return `Expenses at ${company}`;
  },
  [DummyGroupType.Household]: () => {
    const street = faker.location.street();
    return `Household at ${street}`;
  },
  [DummyGroupType.CowFriends]: () => {
    const cow = faker.animal.cow();
    const adj = faker.word.adjective({ length: { min: 4, max: 10 } });
    return `${adj} ${cow}s`;
  },
};

const gaussianRandom = (mean = 0, stdev = 1) => {
  const u = 1 - faker.number.float({ min: 0, max: 1 }); // Converting [0,1) to (0,1)
  const v = faker.number.float({ min: 0, max: 1 });
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  // Transform to the desired mean and standard deviation:
  return z * stdev + mean;
};

export const generateGroups = (users: DummyUserInfo[]) => {
  const getGroupMemberCount = () => {
    const res = gaussianRandom(15, 3);
    return Math.max(Math.round(res), 3);
  };

  const groups = [];

  const weightedTypes = [
    { weight: 0.3, value: DummyGroupType.Trip },
    { weight: 0.3, value: DummyGroupType.Job },
    { weight: 0.3, value: DummyGroupType.Household },
    { weight: 0.1, value: DummyGroupType.CowFriends },
  ];

  while (groups.length < GROUP_COUNT) {
    const type = faker.helpers.weightedArrayElement(weightedTypes);

    const publicId = faker.string.nanoid();
    const memberCount = getGroupMemberCount();
    const memberSet = new Set<number>();
    while (memberSet.size < memberCount) {
      memberSet.add(faker.number.int({ min: 0, max: users.length - 1 }));
    }
    const members = Array.from(memberSet).map((index) => users[index]!);
    const currency = faker.helpers.weightedArrayElement(
      Object.entries(
        members.reduce<Record<string, number>>((acc, user) => {
          acc[user.currency] = (acc[user.currency] ?? 0) + 1;
          return acc;
        }, {}),
      ).map(([value, weight]) => ({ value, weight })),
    );
    const createdAt = faker.date.past({ years: 5 });

    groups.push({
      id: groups.length,
      name: groupNameGenerators[type](createdAt),
      publicId,
      defaultCurrency: currency as DummyCurrencyCode,
      members,
      createdBy: faker.helpers.arrayElement(members).id,
      createdAt,
      type,
    });
  }
  return groups;
};

export type DummyGroupInfo = ReturnType<typeof generateGroups>[number];
