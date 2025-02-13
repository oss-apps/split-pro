import { GroupBalance } from '@prisma/client';
import { Dinic } from '@algorithm.ts/dinic';

// Based on https://github.com/mithun-mohan/Algorithms-Java-Cookbook/blob/master/MaximumFlow/Dinics/SimplifyDebts.java
export function simplifyDebts(groupBalances: GroupBalance[]): GroupBalance[] {
  const dinic = new Dinic();

  return [];
}
