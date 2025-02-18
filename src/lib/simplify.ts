import { Dinic, type IDinicEdge } from '@algorithm.ts/dinic';
import { GroupBalance } from '@prisma/client';

class CustomDinic extends Dinic {
  public getFlows(): IDinicEdge[] {
    return this._edges.slice(0, this._edgesTot).filter((edge) => edge.flow > 0);
  }
}

export function simplifyDebts(groupBalances: GroupBalance[]): GroupBalance[] {
  const currencies = new Set(groupBalances.map((balance) => balance.currency));
  const nodes = new Set<number>();
  groupBalances.forEach((balance) => {
    nodes.add(balance.userId);
    nodes.add(balance.firendId);
  });
  const result: GroupBalance[] = [];

  for (const currency of currencies) {
    const balances = groupBalances.filter((balance) => balance.currency === currency);
    const simplified = simplifyDebtsForSingleCurrency(balances, Array.from(nodes.values()));
    result.push(...simplified);
  }

  return result;
}

// Based on https://github.com/mithun-mohan/Algorithms-Java-Cookbook/blob/master/MaximumFlow/Dinics/SimplifyDebts.java
function simplifyDebtsForSingleCurrency(
  groupBalances: GroupBalance[],
  nodes: number[],
): GroupBalance[] {
  const dinic = new CustomDinic();
  const visitedEdges = new Set<[number, number]>();

  let graph = groupBalances
    .filter((balance) => balance.amount > 0)
    .map((balance) => ({ ...balance, amount: Math.round(100 * balance.amount) }));

  const edgeCount = graph.length;

  while (visitedEdges.size < edgeCount) {
    const { userId, firendId } = graph.find(
      (edge) => !visitedEdges.has([edge.userId, edge.firendId]),
    )!;

    const source = nodes.indexOf(userId);
    const sink = nodes.indexOf(firendId);

    dinic.init(source, sink, nodes.length);

    graph.forEach((edge) => {
      dinic.addEdge(nodes.indexOf(edge.userId), nodes.indexOf(edge.firendId), edge.amount);
    });

    const maxflow = dinic.maxflow(); // the method above gets all the edges with full capacity, but also calculates maxflow
    const usedEdges = dinic.getFlows();

    graph = graph
      .map((balance) => {
        const flow =
          usedEdges.find(
            (edge) => nodes[edge.from] === balance.userId && nodes[edge.to] === balance.firendId,
          )?.flow ?? 0;
        return {
          ...balance,
          amount: balance.amount - flow,
        };
      })
      .filter((balance) => balance.amount > 0);

    graph.push({
      ...groupBalances.find(
        ({ userId, firendId }) => userId === nodes[source] && firendId === nodes[sink],
      )!,
      amount: maxflow,
    });

    visitedEdges.add([source, sink]);
  }

  graph = getMirrorBalances(graph).map((balance) => ({
    ...balance,
    amount: balance.amount / 100,
  }));

  groupBalances.forEach((balance) => {
    const found = graph.find(
      (graphBalance) =>
        graphBalance.userId === balance.userId && graphBalance.firendId === balance.firendId,
    );
    if (!found) {
      graph.push({ ...balance, amount: 0 });
    }
  });

  return graph;
}

// Dinic operates on positive balances only, so we recreate the non-positive balances
// at the end.
const getMirrorBalances = (groupBalances: GroupBalance[]): GroupBalance[] => {
  const result = [...groupBalances];

  groupBalances.forEach((balance) => {
    result.push({
      ...balance,
      userId: balance.firendId,
      firendId: balance.userId,
      amount: -balance.amount,
    });
  });

  return result;
};
