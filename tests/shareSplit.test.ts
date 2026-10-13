import { recoverShareWeights } from '~/lib/shareSplit';

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
