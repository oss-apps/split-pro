import { toFixedNumber, toInteger } from './numbers';

export const toBalancedParticipants = (
  amount: number,
  paidBy: number,
  participants: { userId: number; amount: number }[],
) => {
  const storedParticipants = participants.map((participant) => ({
    userId: participant.userId,
    amount: toInteger(participant.amount),
  }));
  const payer = storedParticipants.find((participant) => participant.userId === paidBy);
  const uniqueParticipantIds = new Set(storedParticipants.map((participant) => participant.userId));

  if (!payer || uniqueParticipantIds.size !== storedParticipants.length) {
    throw new Error('Expense participants must include the payer exactly once');
  }

  const imbalance = storedParticipants.reduce((sum, participant) => sum + participant.amount, 0);
  if (storedParticipants.length < Math.abs(imbalance)) {
    throw new Error('Participant amounts must balance to zero');
  }

  // Old clients rounded each participant independently. Correct only that bounded rounding drift.
  payer.amount -= imbalance;

  const storedAmount = toInteger(amount);
  const hasInvalidParticipant = storedParticipants.some((participant) => {
    if (participant.userId === paidBy) {
      return participant.amount < 0 || storedAmount < participant.amount;
    }

    return 0 < participant.amount;
  });

  if (hasInvalidParticipant) {
    throw new Error('Participant amounts do not represent a valid expense');
  }

  return storedParticipants.map((participant) => ({
    userId: participant.userId,
    amount: toFixedNumber(participant.amount),
  }));
};
