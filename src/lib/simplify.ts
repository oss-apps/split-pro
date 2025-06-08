import { getAllBalancesForGroup } from '@prisma/client/sql';

export function simplifyDebts(
  groupBalances: getAllBalancesForGroup.Result[],
): getAllBalancesForGroup.Result[] {
  const currencies = new Set(groupBalances.map((balance) => balance.currency));
  const nodes = new Set<number>();
  groupBalances.forEach((balance) => {
    nodes.add(balance.paidBy);
    nodes.add(balance.borrowedBy);
  });
  const result: getAllBalancesForGroup.Result[] = [];

  for (const currency of currencies) {
    const balances = groupBalances.filter((balance) => balance.currency === currency);
    const simplified = simplifyDebtsForSingleCurrency(balances, Array.from(nodes.values()));
    result.push(...simplified);
  }

  return result;
}

function simplifyDebtsForSingleCurrency(
  groupBalances: getAllBalancesForGroup.Result[],
  nodes: number[],
): getAllBalancesForGroup.Result[] {
  const adjMatrix = new Array<bigint[]>(nodes.length)
    .fill([])
    .map(() => new Array<bigint>(nodes.length).fill(0n));

  const nonResidualBalances = groupBalances.filter(
    (balance) => balance.amount != null && balance.amount > 0,
  );

  nonResidualBalances.forEach((balance) => {
    const source = nodes.indexOf(balance.paidBy);
    const sink = nodes.indexOf(balance.borrowedBy);
    adjMatrix[source]![sink] = balance.amount != null ? balance.amount : 0n;
  });

  const simplified = minCashFlow(adjMatrix);

  const result = getMirrorBalances(
    simplified.flatMap((row, source) => {
      const res: getAllBalancesForGroup.Result[] = [];
      row.forEach((amount, sink) => {
        const balance = groupBalances.find(
          (balance) => balance.paidBy === nodes[source] && balance.borrowedBy === nodes[sink],
        )!;

        if (amount === 0n) {
          return;
        }

        res.push({
          ...balance,
          amount,
        });
      });
      return res;
    }),
  );

  groupBalances.forEach((balance) => {
    const found = result.find(
      (graphBalance) =>
        graphBalance.paidBy === balance.paidBy && graphBalance.borrowedBy === balance.borrowedBy,
    );
    if (!found) {
      result.push({ ...balance, amount: 0n });
    }
  });

  return result;
}

// based on https://www.geeksforgeeks.org/minimize-cash-flow-among-given-set-friends-borrowed-money/
const minCashFlow = (graph: bigint[][]): bigint[][] => {
  const n = graph.length;

  const amounts = new Array<bigint>(n).fill(0n);
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      const diff = graph[j]![i]! - graph[i]![j]!;
      amounts[i] = amounts[i]! + diff;
    }
  }
  return solveTransaction(amounts);
};

const solveTransaction = (amounts: bigint[]): bigint[][] => {
  const [minQ, maxQ] = constructMinMaxQ(amounts);

  const result = new Array<bigint[]>(amounts.length)
    .fill([])
    .map(() => new Array<bigint>(amounts.length).fill(0n));

  while (minQ.length > 0 && maxQ.length > 0) {
    const maxCreditEntry = maxQ.pop()!;
    const maxDebitEntry = minQ.pop()!;

    const transaction_val = maxCreditEntry.value + maxDebitEntry.value;

    const debtor = maxDebitEntry.key;
    const creditor = maxCreditEntry.key;
    let owed_amount;

    if (transaction_val === 0n) {
      owed_amount = maxCreditEntry.value;
    } else if (transaction_val < 0) {
      owed_amount = maxCreditEntry.value;
      maxDebitEntry.value = transaction_val;
      minQ.push(maxDebitEntry);
      minQ.sort(compareAsc);
      minQ.reverse();
    } else {
      owed_amount = -maxDebitEntry.value;
      maxCreditEntry.value = transaction_val;
      maxQ.push(maxCreditEntry);
      maxQ.sort(compareAsc);
    }

    result[debtor]![creditor] = owed_amount;
  }

  return result;
};

const compareAsc = (p1: Entry, p2: Entry): number => Number(p1.value - p2.value);

const constructMinMaxQ = (amounts: bigint[]): [Entry[], Entry[]] => {
  const minQ: Entry[] = [];
  const maxQ: Entry[] = [];
  amounts.forEach((amount, index) => {
    if (amount === 0n) {
      return;
    }
    if (amount > 0) {
      maxQ.push({ key: index, value: amount });
    } else {
      minQ.push({ key: index, value: amount });
    }
  });

  maxQ.sort(compareAsc);
  minQ.sort(compareAsc);
  minQ.reverse();

  return [minQ, maxQ];
};

const getMirrorBalances = (
  groupBalances: getAllBalancesForGroup.Result[],
): getAllBalancesForGroup.Result[] => {
  const result = [...groupBalances];

  groupBalances.forEach((balance) => {
    result.push({
      ...balance,
      paidBy: balance.borrowedBy,
      borrowedBy: balance.paidBy,
      amount: balance.amount != null && balance.amount > 0 ? -balance.amount : 0n,
    });
  });

  return result;
};

interface Entry {
  key: number;
  value: bigint;
}
