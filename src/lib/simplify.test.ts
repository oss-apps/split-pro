import { GroupBalance } from '@prisma/client';
import { simplifyDebts } from './simplify';
import { addHours } from 'date-fns';

type MinimalEdge = {
  userOne: number;
  userTwo: number;
  amount: number;
};

const sortByIds = (a: GroupBalance, b: GroupBalance) => {
  if (a.userId === b.userId) {
    return a.firendId - b.firendId;
  }
  return a.userId - b.userId;
};

let dateCounter = 0;

const edgeToGroupBalance = (edge: MinimalEdge): [GroupBalance, GroupBalance] => {
  const base = {
    groupId: 0,
    currency: 'USD',
    updatedAt: addHours(new Date(), dateCounter++),
  };
  return [
    {
      userId: edge.userOne,
      firendId: edge.userTwo,
      amount: edge.amount,
      ...base,
    },
    {
      userId: edge.userTwo,
      firendId: edge.userOne,
      amount: edge.amount === 0 ? 0 : -edge.amount,
      ...base,
    },
  ];
};

const padWithZeroBalances = (balances: GroupBalance[], userCount: number): GroupBalance[] => {
  const result = [...balances];
  for (let userId = 0; userId < userCount; userId++) {
    for (let friendId = userId + 1; friendId < userCount; friendId++) {
      const found = balances.find(
        (balance) => balance.userId === userId && balance.firendId === friendId,
      );

      if (!found) {
        result.push(...edgeToGroupBalance({ userOne: userId, userTwo: friendId, amount: 0 }));
      }
    }
  }
  return result;
};

const getFullBalanceGraph = (edges: MinimalEdge[], userCount: number): GroupBalance[] => {
  return padWithZeroBalances(edges.flatMap(edgeToGroupBalance), userCount).toSorted(sortByIds);
};

// taken from https://www.geeksforgeeks.org/minimize-cash-flow-among-given-set-friends-borrowed-money/
const smallGraph: GroupBalance[] = getFullBalanceGraph(
  [
    { userOne: 0, userTwo: 1, amount: 10 },
    { userOne: 1, userTwo: 2, amount: 50 },
    { userOne: 2, userTwo: 0, amount: -20 },
  ],
  3,
);

const smallGraphResult: GroupBalance[] = getFullBalanceGraph(
  [
    { userOne: 1, userTwo: 2, amount: 40 },
    { userOne: 2, userTwo: 0, amount: -30 },
  ],
  3,
).map((resultBalance, idx) => ({
  ...resultBalance,
  updatedAt: smallGraph[idx]!.updatedAt,
}));

// taken from https://medium.com/@mithunmk93/algorithm-behind-splitwises-debt-simplification-feature-8ac485e97688
const largeGraph: GroupBalance[] = getFullBalanceGraph(
  [
    { userOne: 1, userTwo: 2, amount: 40 },
    { userOne: 1, userTwo: 5, amount: -10 },
    { userOne: 1, userTwo: 6, amount: -30 },

    { userOne: 2, userTwo: 3, amount: 20 },
    { userOne: 2, userTwo: 5, amount: -30 },

    { userOne: 3, userTwo: 4, amount: 50 },
    { userOne: 3, userTwo: 5, amount: -10 },
    { userOne: 3, userTwo: 6, amount: -10 },

    { userOne: 4, userTwo: 5, amount: -10 },
  ],
  7,
);

const largeGraphResult: GroupBalance[] = getFullBalanceGraph(
  [
    { userOne: 1, userTwo: 2, amount: 10 },
    { userOne: 1, userTwo: 6, amount: -10 },

    { userOne: 2, userTwo: 5, amount: -40 },

    { userOne: 3, userTwo: 4, amount: 40 },
    { userOne: 3, userTwo: 6, amount: -30 },

    { userOne: 4, userTwo: 5, amount: -20 },
  ],
  7,
).map((resultBalance, idx) => ({
  ...resultBalance,
  updatedAt: largeGraph[idx]!.updatedAt,
}));

const largeGraph2: GroupBalance[] = getFullBalanceGraph(
  [
    { userOne: 0, userTwo: 1, amount: 8957.95 },
    { userOne: 0, userTwo: 2, amount: 3280.43 },
    { userOne: 0, userTwo: 3, amount: -1746.24 },
    { userOne: 0, userTwo: 4, amount: 50.35 },
    { userOne: 0, userTwo: 5, amount: -814.16 },

    { userOne: 1, userTwo: 2, amount: -3245.6 },
    { userOne: 1, userTwo: 3, amount: -115.02 },
    { userOne: 1, userTwo: 4, amount: 1261.15 },
    { userOne: 1, userTwo: 5, amount: 833.33 },

    { userOne: 2, userTwo: 3, amount: -5191.67 },
    { userOne: 2, userTwo: 4, amount: -4000.5 },
    { userOne: 2, userTwo: 5, amount: -233.34 },

    { userOne: 3, userTwo: 4, amount: 1572.84 },
    { userOne: 3, userTwo: 5, amount: 158.33 },

    { userOne: 4, userTwo: 5, amount: 129.16 },
  ],
  6,
);

describe('simplifyDebts', () => {
  it('simplifies small graph', () => {
    expect(simplifyDebts(smallGraph).toSorted(sortByIds)).toEqual(smallGraphResult);
  });

  it('gets the same operation count as in the article', () => {
    // depending on the edge traversal order, the result can be different, but the total amount and operation count should be the same
    expect(simplifyDebts(largeGraph).filter((balance) => balance.amount > 0).length).toBe(
      largeGraphResult.filter((balance) => balance.amount > 0).length,
    );
  });

  it('gets the optimal operation count', () => {
    expect(simplifyDebts(largeGraph2).filter((balance) => balance.amount > 0).length).toBe(5);
  });

  it.each([{ graph: smallGraph }, { graph: largeGraph }, { graph: largeGraph2 }])(
    'preserves the total balance per user',
    ({ graph }) => {
      const startingBalances = graph.reduce(
        (acc, balance) => {
          acc[balance.userId] =
            Math.round(100 * ((acc[balance.userId] ?? 0) + balance.amount)) / 100;
          return acc;
        },
        {} as Record<number, number>,
      );

      const userBalances = simplifyDebts(graph).reduce(
        (acc, balance) => {
          acc[balance.userId] =
            Math.round(100 * ((acc[balance.userId] ?? 0) + balance.amount)) / 100;
          return acc;
        },
        {} as Record<number, number>,
      );

      expect(startingBalances).toEqual(userBalances);
    },
  );
});
