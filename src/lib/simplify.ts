import { Dinic, type IDinicEdge } from '@algorithm.ts/dinic';
import { GroupBalance } from '@prisma/client';

class CustomDinic extends Dinic {
  public getFlows(): IDinicEdge[] {
    return this._edges.filter((edge) => edge.flow > 0);
  }
}

// Based on https://github.com/mithun-mohan/Algorithms-Java-Cookbook/blob/master/MaximumFlow/Dinics/SimplifyDebts.java
export function simplifyDebts(groupBalances: GroupBalance[]): GroupBalance[] {
  const dinic = new CustomDinic();
  const visitedEdges = new Set<[number, number]>();

  let graph = groupBalances.filter((balance) => balance.amount > 0);
  const nodes = new Set<number>();
  groupBalances.forEach((balance) => {
    nodes.add(balance.userId);
    nodes.add(balance.firendId);
  });
  const nodeCount = nodes.size;
  const edgeCount = graph.length;

  while (visitedEdges.size < edgeCount) {
    const { userId: source, firendId: sink } = graph.find(
      (edge) => !visitedEdges.has([edge.userId, edge.firendId]),
    )!;

    dinic.init(source, sink, nodeCount);

    graph.forEach((edge) => {
      dinic.addEdge(edge.userId, edge.firendId, edge.amount);
    });

    const maxflow = dinic.maxflow(); // the method above gets all the edges with full capacity, but also calculates maxflow
    const usedEdges = dinic.getFlows();

    graph = graph
      .map((balance) => {
        const flow =
          usedEdges.find((edge) => edge.from === balance.userId && edge.to === balance.firendId)
            ?.flow ?? 0;
        return {
          ...balance,
          amount: balance.amount - flow,
        };
      })
      .filter((balance) => balance.amount > 0);

    graph.push({
      ...groupBalances.find(({ userId, firendId }) => userId === source && firendId === sink)!,
      amount: maxflow,
    });

    visitedEdges.add([source, sink]);
  }

  graph = getMirrorBalances(graph);

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
