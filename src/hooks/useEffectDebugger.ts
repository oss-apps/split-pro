import { type DependencyList, type EffectCallback, useEffect } from 'react';
import { usePrevious } from './usePrevious';

type ChangedDeps = Record<string, { before: unknown; after: unknown }>;

export const useEffectDebugger = (
  effect: EffectCallback,
  deps: DependencyList,
  dependencyNames: string[] = [],
) => {
  const previousDeps = usePrevious(deps, []) ?? [];

  const changedDeps = deps.reduce((accum: ChangedDeps, dependency, index) => {
    if (dependency !== previousDeps[index]) {
      const keyName = dependencyNames[index] ?? index;
      return {
        ...accum,
        [keyName]: {
          before: previousDeps[index],
          after: dependency,
        },
      };
    }

    return accum;
  }, {});

  if (Object.keys(changedDeps).length) {
    console.table(changedDeps);
  }

  // oxlint-disable-next-line exhaustive-deps
  useEffect(effect, deps);
};
