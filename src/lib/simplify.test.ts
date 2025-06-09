import { type getAllBalancesForGroup } from '~/prisma/client/sql';

import { simplifyDebts } from './simplify';

type MinimalEdge = {
  userOne: number;
  userTwo: number;
  amount: bigint;
};

const sortByIds = (a: getAllBalancesForGroup.Result, b: getAllBalancesForGroup.Result) => {
  if (a.paidBy === b.paidBy) {
    return a.borrowedBy - b.borrowedBy;
  }
  return a.paidBy - b.paidBy;
};

const edgeToGroupBalance = (edge: MinimalEdge): [getAllBalancesForGroup.Result, getAllBalancesForGroup.Result] => {
  const base = {
    groupId: 0,
    currency: 'USD',
  };
  return [
    {
      paidBy: edge.userOne,
      borrowedBy: edge.userTwo,
      amount: edge.amount,
      ...base,
    },
    {
      paidBy: edge.userTwo,
      borrowedBy: edge.userOne,
      amount: edge.amount === 0n ? 0n : -edge.amount,
      ...base,
    },
  ];
};

const padWithZeroBalances: (balances: getAllBalancesForGroup.Result[], userCount: number) => getAllBalancesForGroup.Result[] = (
  balances,
  userCount,
) => {
  const result = [...balances];
  for (let userId = 0; userId < userCount; userId++) {
    for (let friendId = userId + 1; friendId < userCount; friendId++) {
      const found = balances.find(
        (balance) => balance.paidBy === userId && balance.borrowedBy === friendId,
      );

      if (!found) {
        result.push(...edgeToGroupBalance({ userOne: userId, userTwo: friendId, amount: 0n }));
      }
    }
  }
  return result;
};

const getFullBalanceGraph = (edges: MinimalEdge[], userCount: number): getAllBalancesForGroup.Result[] => {
  const arr = padWithZeroBalances(edges.flatMap(edgeToGroupBalance), userCount);
  arr.sort(sortByIds);
  return arr;
};

// taken from https://www.geeksforgeeks.org/minimize-cash-flow-among-given-set-friends-borrowed-money/
const smallGraph: getAllBalancesForGroup.Result[] = getFullBalanceGraph(
  [
    { userOne: 0, userTwo: 1, amount: 1000n },
    { userOne: 1, userTwo: 2, amount: 5000n },
    { userOne: 2, userTwo: 0, amount: -2000n },
  ],
  3,
);

const smallGraphResult: getAllBalancesForGroup.Result[] = getFullBalanceGraph(
  [
    { userOne: 1, userTwo: 2, amount: 4000n },
    { userOne: 2, userTwo: 0, amount: -3000n },
  ],
  3,
)

// taken from https://medium.com/@mithunmk93/algorithm-behind-splitwises-debt-simplification-feature-8ac485e97688
const largeGraph: getAllBalancesForGroup.Result[] = getFullBalanceGraph(
  [
    { userOne: 1, userTwo: 2, amount: 4000n },
    { userOne: 1, userTwo: 5, amount: -1000n },
    { userOne: 1, userTwo: 6, amount: -3000n },

    { userOne: 2, userTwo: 3, amount: 2000n },
    { userOne: 2, userTwo: 5, amount: -3000n },

    { userOne: 3, userTwo: 4, amount: 5000n },
    { userOne: 3, userTwo: 5, amount: -1000n },
    { userOne: 3, userTwo: 6, amount: -1000n },

    { userOne: 4, userTwo: 5, amount: -1000n },
  ],
  7,
);

const denseGraph: getAllBalancesForGroup.Result[] = getFullBalanceGraph(
  [
    { userOne: 0, userTwo: 1, amount: 895795n },
    { userOne: 0, userTwo: 2, amount: 328043n },
    { userOne: 0, userTwo: 3, amount: -174624n },
    { userOne: 0, userTwo: 4, amount: 5035n },
    { userOne: 0, userTwo: 5, amount: -81416n },

    { userOne: 1, userTwo: 2, amount: -324560n },
    { userOne: 1, userTwo: 3, amount: -11502n },
    { userOne: 1, userTwo: 4, amount: 126115n },
    { userOne: 1, userTwo: 5, amount: 83333n },

    { userOne: 2, userTwo: 3, amount: -519167n },
    { userOne: 2, userTwo: 4, amount: -400050n },
    { userOne: 2, userTwo: 5, amount: -23334n },

    { userOne: 3, userTwo: 4, amount: 157284n },
    { userOne: 3, userTwo: 5, amount: 15833n },

    { userOne: 4, userTwo: 5, amount: 12916n },
  ],
  6,
);

describe('simplifyDebts', () => {
  it('simplifies small graph', () => {
    const result = simplifyDebts(smallGraph);
    result.sort(sortByIds);
    expect(result).toEqual(smallGraphResult);
  });

  it.each([
    { graph: smallGraph, expected: 2 },
    { graph: largeGraph, expected: 3 },
    { graph: denseGraph, expected: 5 },
  ])('gets the optimal operation count', ({ graph, expected }) => {
    expect(simplifyDebts(graph).filter((balance) => (balance.amount ?? 0n) > 0).length).toBe(expected);
  });

  it.each([{ graph: smallGraph }, { graph: largeGraph }, { graph: denseGraph }])(
    'preserves the total balance per user',
    ({ graph }) => {
      const startingBalances = graph.reduce(
        (acc, balance) => {
          acc[balance.paidBy] = (acc[balance.paidBy] ?? 0n) + (balance.amount ?? 0n);
          return acc;
        },
        {} as Record<number, bigint>,
      );

      const userBalances = simplifyDebts(graph).reduce(
        (acc, balance) => {
          acc[balance.paidBy] = (acc[balance.paidBy] ?? 0n) + (balance.amount ?? 0n);
          return acc;
        },
        {} as Record<number, bigint>,
      );

      expect(startingBalances).toEqual(userBalances);
    },
  );
});
