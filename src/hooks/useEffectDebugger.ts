import { type DependencyList, type EffectCallback, useEffect, useRef } from 'react';

type ChangedDeps = Record<string, { before: unknown; after: unknown }>;

export const useEffectDebugger = (
  effect: EffectCallback,
  deps: DependencyList,
  dependencyNames: string[] = [],
) => {
  const previousDeps = useRef<DependencyList>([]);

  useEffect(() => {
    const changedDeps = deps.reduce((accum: ChangedDeps, dependency, index) => {
      if (dependency !== previousDeps.current[index]) {
        const keyName = dependencyNames[index] ?? index;
        return {
          ...accum,
          [keyName]: {
            before: previousDeps.current[index],
            after: dependency,
          },
        };
      }

      return accum;
    }, {});

    if (Object.keys(changedDeps).length) {
      console.table(changedDeps);
    }

    previousDeps.current = deps;
  });

  // oxlint-disable-next-line exhaustive-deps
  useEffect(effect, deps);
};
