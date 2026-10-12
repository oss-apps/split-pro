/** @jest-environment node */

import { faker } from '@faker-js/faker';
import { SplitType } from '@prisma/client';

import { generateSplitShares } from '~/dummies/splitGenerator';

jest.mock('@faker-js/faker', () => ({
  faker: { number: { int: jest.fn() } },
}));

const mockRandomInt = jest.spyOn(faker.number, 'int');

describe('generateSplitShares percentage seed data', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns no shares for no participants', () => {
    expect(generateSplitShares(SplitType.PERCENTAGE, [])).toEqual({});
  });

  it('assigns 100% to a single participant', () => {
    expect(generateSplitShares(SplitType.PERCENTAGE, [{ id: 1 }])[1]?.PERCENTAGE).toBe(10000n);
    expect(mockRandomInt).not.toHaveBeenCalled();
  });

  it.each([2, 3, 6, 20])(
    'never exceeds 100%% for %i participants even with maximum draws',
    (count) => {
      mockRandomInt.mockImplementation((options) => {
        if (
          'object' !== typeof options ||
          'number' !== typeof options.min ||
          'number' !== typeof options.max
        ) {
          throw new Error('Expected explicit random bounds');
        }
        expect(options.min).toBeGreaterThanOrEqual(0);
        expect(options.max).toBeGreaterThanOrEqual(options.min);
        return options.max;
      });
      const participants = Array.from({ length: count }, (_, id) => ({ id }));
      const shares = generateSplitShares(SplitType.PERCENTAGE, participants);
      const percentages = participants.map(({ id }) => shares[id]!.PERCENTAGE!);
      expect(percentages.reduce((total, share) => total + share, 0n)).toBe(10000n);
      percentages.forEach((share) => {
        expect(share).toBeGreaterThanOrEqual(0n);
        expect(share).toBeLessThanOrEqual(10000n);
      });
    },
  );
});
