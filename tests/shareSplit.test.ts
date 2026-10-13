import { recoverPercentageWeights, recoverShareWeights } from '~/lib/shareSplit';

describe('recoverShareWeights', () => {
  it('finds a rounded ratio even when no penny-subtracted variant has that exact ratio', () => {
    expect(recoverShareWeights([3118n, 4675n])).toEqual([200n, 300n]);
  });

  it('uses the smallest total share count when rounding allows several ratios', () => {
    expect(recoverShareWeights([1n, 2n])).toEqual([100n, 100n]);
  });

  it('recovers costs beyond the safe integer range without losing precision', () => {
    const amount = 90071992547409933n;
    const payerCost = (amount * 2n) / 5n + 1n;
    const otherCost = (amount * 3n) / 5n;

    expect(payerCost + otherCost).toBe(amount);
    expect(recoverShareWeights([payerCost, otherCost])).toEqual([200n, 300n]);
  });

  it('preserves zero costs and normalizes a single positive cost', () => {
    expect(recoverShareWeights([0n, 7793n, 0n])).toEqual([0n, 100n, 0n]);
    expect(recoverShareWeights([0n, 0n])).toEqual([0n, 0n]);
    expect(recoverShareWeights([])).toEqual([]);
  });
});

describe('recoverPercentageWeights', () => {
  it('balances ambiguous whole percentages using the nearest proportional allocation', () => {
    expect(recoverPercentageWeights([1n, 1n, 1n])).toEqual([3400n, 3300n, 3300n]);
  });

  it('falls back to a valid 100% total when a positive portion cannot fit 0.01% precision', () => {
    expect(recoverPercentageWeights([1n, 20000n])).toEqual([0n, 10000n]);
  });

  it('recovers amounts beyond the safe integer range without losing precision', () => {
    const amount = 90071992547409933n;
    expect(recoverPercentageWeights([(amount * 2n) / 5n + 1n, (amount * 3n) / 5n])).toEqual([
      4000n,
      6000n,
    ]);
  });

  it('preserves zero costs and handles a single participant', () => {
    expect(recoverPercentageWeights([0n, 7793n, 0n])).toEqual([0n, 10000n, 0n]);
    expect(recoverPercentageWeights([0n, 0n])).toEqual([0n, 0n]);
    expect(recoverPercentageWeights([])).toEqual([]);
  });

  it('keeps a valid total for more participants than available percentage units', () => {
    const percentages = recoverPercentageWeights(Array<bigint>(10001).fill(1n));

    expect(percentages.reduce((sum, percentage) => sum + percentage, 0n)).toBe(10000n);
    expect(percentages.filter((percentage) => 1n === percentage)).toHaveLength(10000);
    expect(percentages[10000]).toBe(0n);
  });
});
