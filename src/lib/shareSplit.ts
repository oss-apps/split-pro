import { BigMath } from '~/utils/numbers';

const MAX_SHARE_OPERATIONS = 20000;

interface WeightBounds {
  min: bigint;
  max: bigint;
}

const getRoundedWeightBounds = (
  cost: bigint,
  totalCost: bigint,
  weightCount: bigint,
): WeightBounds => ({
  min: BigMath.max(1n, ((cost - 1n) * weightCount + totalCost - 1n) / totalCost),
  max: ((cost + 1n) * weightCount - 1n) / totalCost,
});

/** Round proportional weights to a fixed total, respecting any required rounding intervals. */
const apportionWeights = (
  costs: bigint[],
  totalCost: bigint,
  weightCount: bigint,
  bounds = costs.map(() => ({ min: 0n, max: weightCount })),
): bigint[] | undefined => {
  if (
    bounds.some(({ min, max }) => min > max) ||
    weightCount < bounds.reduce((sum, { min }) => sum + min, 0n) ||
    weightCount > bounds.reduce((sum, { max }) => sum + max, 0n)
  ) {
    return undefined;
  }

  const weights = costs.map((cost, index) =>
    BigMath.min(
      bounds[index]!.max,
      BigMath.max(bounds[index]!.min, (cost * weightCount) / totalCost),
    ),
  );
  const remaining = weightCount - weights.reduce((sum, weight) => sum + weight, 0n);
  if (0n === remaining) {
    return weights;
  }
  if (0n > remaining) {
    return undefined;
  }

  const candidates = costs
    .map((cost, index) => ({ index, deficit: cost * weightCount - weights[index]! * totalCost }))
    .filter(({ index }) => weights[index]! < bounds[index]!.max)
    .toSorted((a, b) =>
      a.deficit === b.deficit ? a.index - b.index : a.deficit > b.deficit ? -1 : 1,
    );

  // Rounding down leaves fewer than one extra unit per participant to allocate.
  if (remaining > BigInt(candidates.length)) {
    return undefined;
  }
  candidates.slice(0, Number(remaining)).forEach(({ index }) => {
    weights[index]! += 1n;
  });
  return weights;
};

/** Prefer whole percentages, then tenths, then hundredths, always summing to 100%. */
export const recoverPercentageWeights = (costs: bigint[]): bigint[] => {
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0n);
  if (0n === totalCost) {
    return costs.map(() => 0n);
  }

  // Exactly three precision levels: the number of candidates never grows with the amount.
  for (const weightCount of [100n, 1000n, 10000n]) {
    const bounds = costs.map((cost) =>
      0n === cost ? { min: 0n, max: 0n } : getRoundedWeightBounds(cost, totalCost, weightCount),
    );
    const weights = apportionWeights(costs, totalCost, weightCount, bounds);
    if (weights) {
      return weights.map((weight) => (weight * 10000n) / weightCount);
    }
  }

  // Some tiny portions cannot be represented at 0.01% precision. Use the nearest
  // Balanced percentages rather than returning an invalid total such as 99.99%.
  return apportionWeights(costs, totalCost, 10000n)!;
};

/** Find the smallest integer ratio consistent with truncation and leftover-penny allocation. */
export const recoverShareWeights = (costs: bigint[]): bigint[] => {
  const positiveCosts = costs.filter((cost) => 0n < cost);
  const exactGcd = positiveCosts.reduce((gcd, cost) => BigMath.gcd(gcd, cost), 0n);
  const exactWeights = costs.map((cost) => (0n === exactGcd ? 0n : (cost * 100n) / exactGcd));

  if (2 > positiveCosts.length) {
    return exactWeights;
  }

  const totalCost = positiveCosts.reduce((sum, cost) => sum + cost, 0n);
  const exactShareCount = totalCost / exactGcd;
  let operations = 0;

  // Search total share counts in ascending order, checking each candidate in linear time.
  // Allowed weight intervals avoid enumerating combinations of pennies.
  for (let shareCount = BigInt(positiveCosts.length); shareCount < exactShareCount; shareCount++) {
    const bounds: { min: bigint; max: bigint }[] = [];
    let minSum = 0n;
    let maxSum = 0n;

    for (const cost of positiveCosts) {
      if (MAX_SHARE_OPERATIONS <= operations) {
        return exactWeights;
      }
      operations++;

      // A cost equals floor(totalCost * weight / shareCount), with at most one extra penny.
      // Thus: cost - 1 <= totalCost * weight / shareCount < cost + 1.
      const { min, max } = getRoundedWeightBounds(cost, totalCost, shareCount);
      if (min > max || minSum + min > shareCount) {
        break;
      }

      bounds.push({ min, max });
      minSum += min;
      maxSum += max;
    }

    if (bounds.length === positiveCosts.length && shareCount <= maxSum) {
      let remaining = shareCount - minSum;
      let positiveIndex = 0;

      return costs.map((cost) => {
        if (0n === cost) {
          return 0n;
        }

        const { min, max } = bounds[positiveIndex++]!;
        const extra = BigMath.min(remaining, max - min);
        remaining -= extra;
        return (min + extra) * 100n;
      });
    }
  }

  return exactWeights;
};
