import { BigMath } from '~/utils/numbers';

const MAX_SHARE_OPERATIONS = 20000;

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
      const min = BigMath.max(1n, ((cost - 1n) * shareCount + totalCost - 1n) / totalCost);
      const max = ((cost + 1n) * shareCount - 1n) / totalCost;
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
