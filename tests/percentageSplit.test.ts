import { SplitType } from '@prisma/client';

import {
  calculateSplitShareBasedOnAmount,
  initSplitShares,
  useAddExpenseStore,
} from '~/store/addStore';
import { createTestUser } from '~/tests/helpers/user';

const users = [1, 2, 3].map((id) => createTestUser({ id }));
const payer = users[0]!;

describe('percentage split recovery on reopen (#727)', () => {
  const { actions } = useAddExpenseStore.getState();

  beforeEach(() => {
    actions.resetState();
  });

  it.each([
    {
      scenario: 'the payer received the penny for 77.93 split 40%/60%',
      amount: 7793n,
      balances: [4675n, -4675n],
      percentages: [4000n, 6000n],
    },
    {
      scenario: 'the other participant received the penny for 77.93 split 40%/60%',
      amount: 7793n,
      balances: [4676n, -4676n],
      percentages: [4000n, 6000n],
    },
    {
      scenario: 'whole percentages take priority over simpler fractional ratios',
      amount: 703n,
      balances: [401n, -401n],
      percentages: [4300n, 5700n],
    },
    {
      scenario: 'tenths of a percent are needed',
      amount: 7793n,
      balances: [4870n, -4870n],
      percentages: [3750n, 6250n],
    },
    {
      scenario: 'hundredths of a percent are needed',
      amount: 30001n,
      balances: [20002n, -20002n],
      percentages: [3333n, 6667n],
    },
    {
      scenario: 'three rounded percentages must still sum to 100%',
      amount: 30001n,
      balances: [20001n, -9999n, -10002n],
      percentages: [3333n, 3333n, 3334n],
    },
    {
      scenario: 'a participant has no percentage',
      amount: 7793n,
      balances: [4675n, -4675n, 0n],
      percentages: [4000n, 6000n, 0n],
    },
    {
      scenario: 'the payer has no percentage',
      amount: 7793n,
      balances: [7793n, -3118n, -4675n],
      percentages: [0n, 4000n, 6000n],
    },
    {
      scenario: 'the payer has zero net balance',
      amount: 7793n,
      balances: [0n, 0n],
      percentages: [10000n, 0n],
    },
  ])('recovers percentages when $scenario', ({ amount, balances, percentages }) => {
    const participants = balances.map((balance, index) => ({ ...users[index]!, amount: balance }));
    const splitShares = Object.fromEntries(
      participants.map((participant) => [participant.id, initSplitShares()]),
    );

    calculateSplitShareBasedOnAmount(
      amount,
      participants,
      SplitType.PERCENTAGE,
      splitShares,
      payer,
    );

    expect(
      participants.map((participant) => splitShares[participant.id]?.[SplitType.PERCENTAGE]),
    ).toEqual(percentages);
    expect(participants.map((participant) => participant.amount)).toEqual(balances);
  });

  it.each([
    { amount: 7793n, percentages: [4000n, 6000n] },
    { amount: 7793n, percentages: [3750n, 6250n] },
    { amount: 30001n, percentages: [3333n, 6667n] },
    { amount: 30001n, percentages: [3333n, 3333n, 3334n] },
    { amount: 1000000n, percentages: [1n, 6568n, 3431n] },
  ])('keeps $percentages on repeated saves of $amount', ({ amount, percentages }) => {
    const participants = users.slice(0, percentages.length);
    actions.setCurrentUser(payer);
    actions.setParticipants(participants);
    actions.setAmount(amount);
    actions.setSplitType(SplitType.PERCENTAGE);
    participants.forEach((participant, index) => {
      actions.setSplitShare(SplitType.PERCENTAGE, participant.id, percentages[index]!);
    });

    Array.from({ length: 3 }).forEach(() => {
      // Save monetary balances and clear the editor, then load as pages/add.tsx does.
      const saved = useAddExpenseStore.getState();
      actions.resetState();
      actions.setPaidBy(payer);
      actions.setAmount(saved.amount);
      actions.setParticipants(saved.participants, saved.splitType);

      const reopened = useAddExpenseStore.getState();
      const recovered = reopened.participants.map(
        (participant) => reopened.splitShares[participant.id]?.[SplitType.PERCENTAGE],
      );
      expect(recovered).toEqual(percentages);
      expect(recovered.reduce<bigint>((sum, percentage) => sum + (percentage ?? 0n), 0n)).toBe(
        10000n,
      );
      expect(reopened.canSplitScreenClosed).toBe(true);
      expect(
        reopened.participants.reduce((sum, participant) => sum + participant.amount!, 0n),
      ).toBe(0n);
    });
  });
});
