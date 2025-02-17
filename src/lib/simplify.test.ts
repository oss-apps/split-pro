import { GroupBalance } from '@prisma/client';
import { simplifyDebts } from './simplify';

describe('simplifyDebts', () => {
  it('simplifies small graph', () => {
    expect(new Set(simplifyDebts(smallGraph))).toEqual(new Set(smallGraphResult));
  });

  it('simplifies large graph', () => {
    expect(new Set(simplifyDebts(largeGraph))).toEqual(new Set(largeGraphResult));
  });
});

const edgeToGroupBalance = (edge: {
  userOne: number;
  userTwo: number;
  amount: number;
}): [GroupBalance, GroupBalance] => {
  const base = {
    groupId: 0,
    currency: 'USD',
    updatedAt: new Date(),
  };
  return [
    {
      ...base,
      userId: edge.userOne,
      firendId: edge.userTwo,
      amount: edge.amount,
    },
    {
      ...base,
      userId: edge.userTwo,
      firendId: edge.userOne,
      amount: -edge.amount,
    },
  ];
};

// taken from https://www.geeksforgeeks.org/minimize-cash-flow-among-given-set-friends-borrowed-money/
const smallGraph: GroupBalance[] = [
  { userOne: 0, userTwo: 1, amount: 10 },
  { userOne: 1, userTwo: 2, amount: 50 },
  { userOne: 2, userTwo: 0, amount: -20 },
].flatMap(edgeToGroupBalance);

const smallGraphResult: GroupBalance[] = [
  { userOne: 0, userTwo: 2, amount: 30 },
  { userOne: 1, userTwo: 2, amount: 40 },
  { userOne: 2, userTwo: 0, amount: 0 },
]
  .flatMap(edgeToGroupBalance)
  .map((resultBalance, idx) => ({
    ...resultBalance,
    updatedAt: smallGraph[idx]!.updatedAt,
  }));

// taken from https://medium.com/@mithunmk93/algorithm-behind-splitwises-debt-simplification-feature-8ac485e97688
const largeGraph: GroupBalance[] = [
  { userOne: 0, userTwo: 1, amount: 0 },
  { userOne: 0, userTwo: 2, amount: 0 },
  { userOne: 0, userTwo: 3, amount: 0 },
  { userOne: 0, userTwo: 4, amount: 0 },
  { userOne: 0, userTwo: 5, amount: 0 },
  { userOne: 0, userTwo: 6, amount: 0 },

  { userOne: 1, userTwo: 2, amount: 40 },
  { userOne: 1, userTwo: 3, amount: 0 },
  { userOne: 1, userTwo: 4, amount: 0 },
  { userOne: 1, userTwo: 5, amount: -10 },
  { userOne: 1, userTwo: 6, amount: -30 },

  { userOne: 2, userTwo: 3, amount: 20 },
  { userOne: 2, userTwo: 4, amount: 0 },
  { userOne: 2, userTwo: 5, amount: -30 },
  { userOne: 2, userTwo: 6, amount: 0 },

  { userOne: 3, userTwo: 4, amount: 50 },
  { userOne: 3, userTwo: 5, amount: -10 },
  { userOne: 3, userTwo: 6, amount: -10 },

  { userOne: 4, userTwo: 5, amount: -10 },
  { userOne: 4, userTwo: 6, amount: 0 },

  { userOne: 5, userTwo: 6, amount: 0 },
].flatMap(edgeToGroupBalance);

const largeGraphResult: GroupBalance[] = [
  { userOne: 0, userTwo: 1, amount: 0 },
  { userOne: 0, userTwo: 2, amount: 0 },
  { userOne: 0, userTwo: 3, amount: 0 },
  { userOne: 0, userTwo: 4, amount: 0 },
  { userOne: 0, userTwo: 5, amount: 0 },
  { userOne: 0, userTwo: 6, amount: 0 },

  { userOne: 1, userTwo: 2, amount: 10 },
  { userOne: 1, userTwo: 3, amount: 0 },
  { userOne: 1, userTwo: 4, amount: 0 },
  { userOne: 1, userTwo: 5, amount: 0 },
  { userOne: 1, userTwo: 6, amount: -10 },

  { userOne: 2, userTwo: 3, amount: 0 },
  { userOne: 2, userTwo: 4, amount: 0 },
  { userOne: 2, userTwo: 5, amount: -40 },
  { userOne: 2, userTwo: 6, amount: 0 },

  { userOne: 3, userTwo: 4, amount: 40 },
  { userOne: 3, userTwo: 5, amount: 0 },
  { userOne: 3, userTwo: 6, amount: -30 },

  { userOne: 4, userTwo: 5, amount: -20 },
  { userOne: 4, userTwo: 6, amount: 0 },

  { userOne: 5, userTwo: 6, amount: 0 },
]
  .flatMap(edgeToGroupBalance)
  .map((resultBalance, idx) => ({
    ...resultBalance,
    updatedAt: largeGraph[idx]!.updatedAt,
  }));
