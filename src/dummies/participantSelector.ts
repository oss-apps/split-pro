import { faker } from '@faker-js/faker';
import type { DummyUserInfo } from './userGenerator';

/**
 * Selects participants and payers for expenses based on context
 * Handles both group and direct user-to-user expenses
 */

/**
 * Selects a payer from a group of participants
 * The payer is always one of the participants
 *
 * @param participants - Array of participant IDs
 * @param preferredPayerId - Optional ID of a user who should be more likely to pay (e.g., trip organizer)
 * @returns A selected payer from the participants
 *
 * @example
 * selectPayer([{id: 1}, {id: 2}, {id: 3}])
 * // Returns: {id: 2}
 */
export const selectPayer = (
  participants: DummyUserInfo[],
  preferredPayerId?: number,
): DummyUserInfo => {
  if (participants.length === 0) {
    throw new Error('Cannot select payer: no participants provided');
  }

  // If only one participant, they must pay
  if (participants.length === 1) {
    return participants[0]!;
  }

  // If a preferred payer is specified and they're in the list, weight them higher
  if (preferredPayerId) {
    const isPreferredInList = participants.some((p) => p.id === preferredPayerId);
    if (isPreferredInList) {
      // 70% chance the preferred payer pays
      if (faker.datatype.boolean({ probability: 0.7 })) {
        return participants.find((p) => p.id === preferredPayerId)!;
      }
    }
  }

  // Otherwise select randomly
  return faker.helpers.arrayElement(participants);
};

/**
 * Selects participants for an expense within a group
 * Implements different selection strategies:
 * - allMembers: Include all group members (40%)
 * - subset: Include 50-100% of group members (50%)
 * - pair: Include only a specific pair (10%)
 *
 * @param groupMembers - Array of all group member IDs
 * @param strategyWeights - Optional custom weights for selection strategies
 * @returns Array of selected participant IDs
 *
 * @example
 * selectGroupParticipants([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}])
 * // Could return: [{id: 1}, {id: 2}, {id: 3}] (subset strategy)
 */
export const selectGroupParticipants = (
  groupMembers: DummyUserInfo[],
  strategyWeights: Record<'allMembers' | 'subset' | 'pair', number> = {
    allMembers: 0.4,
    subset: 0.5,
    pair: 0.1,
  },
): DummyUserInfo[] => {
  if (groupMembers.length === 0) {
    throw new Error('Cannot select participants: no group members provided');
  }

  // If group has 2 or fewer members, always return all
  if (groupMembers.length <= 2) {
    return groupMembers;
  }

  // Select strategy based on weights
  const strategies = [
    { value: 'allMembers' as const, weight: strategyWeights.allMembers },
    { value: 'subset' as const, weight: strategyWeights.subset },
    { value: 'pair' as const, weight: strategyWeights.pair },
  ];

  const selectedStrategy = faker.helpers.weightedArrayElement(strategies);

  switch (selectedStrategy) {
    case 'allMembers':
      // Include all members
      return groupMembers;

    case 'subset': {
      // Include 50-100% of members (at least 2)
      const minParticipants = Math.max(2, Math.ceil(groupMembers.length * 0.5));
      const maxParticipants = groupMembers.length;
      const count = faker.number.int({ min: minParticipants, max: maxParticipants });

      // Randomly select participants without replacement
      const shuffled = [...groupMembers].sort(() => faker.number.int({ min: -1, max: 1 }));
      return shuffled.slice(0, count);
    }

    case 'pair': {
      // Select exactly 2 participants
      const shuffled = [...groupMembers].sort(() => faker.number.int({ min: -1, max: 1 }));
      return shuffled.slice(0, 2);
    }

    default:
      return groupMembers;
  }
};

/**
 * Selects participants for a direct expense between friends
 * Direct expenses typically involve 2-4 people
 *
 * @param potentialParticipants - Array of potential participant IDs (must be at least 2)
 * @returns Array of selected participant IDs (2-4 people)
 *
 * @example
 * selectDirectExpenseParticipants([{id: 1}, {id: 2}, {id: 3}, {id: 4}])
 * // Could return: [{id: 1}, {id: 2}, {id: 3}] (3 people hanging out)
 */
export const selectDirectExpenseParticipants = (
  potentialParticipants: DummyUserInfo[],
): DummyUserInfo[] => {
  if (potentialParticipants.length < 2) {
    throw new Error('Cannot create direct expense: at least 2 participants required');
  }

  // 90% chance: exactly 2 people
  if (faker.datatype.boolean({ probability: 0.9 })) {
    const shuffled = [...potentialParticipants].sort(() => faker.number.int({ min: -1, max: 1 }));
    return shuffled.slice(0, 2);
  }

  // 10% chance: 3-4 people (group outing)
  const maxParticipants = Math.min(4, potentialParticipants.length);
  const count = faker.number.int({ min: 3, max: maxParticipants });
  const shuffled = [...potentialParticipants].sort(() => faker.number.int({ min: -1, max: 1 }));
  return shuffled.slice(0, count);
};

/**
 * Filters participants to include only those who are also in a group
 * Useful for avoiding participants in direct expenses that don't overlap with existing relationships
 *
 * @param potentialParticipants - Array of all potential participant IDs
 * @param groupMembers - Array of group member IDs to filter by
 * @param minRequired - Minimum participants to return (will take from potentialParticipants if needed)
 * @returns Array of participants, preferring those in the group
 *
 * @example
 * filterParticipantsByGroup([{id: 1}, {id: 2}, {id: 3}], [{id: 1}, {id: 4}])
 * // Returns: [{id: 1}, {id: 2}] (prefers group member 1, includes 2 for variety)
 */
export const filterParticipantsByGroup = (
  potentialParticipants: DummyUserInfo[],
  groupMembers: DummyUserInfo[],
  minRequired = 2,
): DummyUserInfo[] => {
  if (potentialParticipants.length === 0) {
    throw new Error('No potential participants provided');
  }

  const groupMemberIds = new Set(groupMembers.map((m) => m.id));

  // Separate into those in group and those not
  const inGroup = potentialParticipants.filter((p) => groupMemberIds.has(p.id));
  const notInGroup = potentialParticipants.filter((p) => !groupMemberIds.has(p.id));

  // If we have enough from group, use them
  if (inGroup.length >= minRequired) {
    return inGroup.slice(0, minRequired);
  }

  // Otherwise combine
  const combined = [...inGroup, ...notInGroup];
  return combined.slice(0, Math.max(minRequired, potentialParticipants.length));
};

/**
 * Determines if an expense should include all group members or a subset
 * Used for realistic modeling (e.g., not every group member attends every meal)
 *
 * @param groupSize - Size of the group
 * @returns Boolean indicating whether to include all members
 *
 * @example
 * shouldIncludeAllGroupMembers(15)  // household group
 * // Could return: true (50% chance) or false (50% chance)
 *
 * @example
 * shouldIncludeAllGroupMembers(3)   // trip group
 * // More likely to return: true (likely all on same activity)
 */
export const shouldIncludeAllGroupMembers = (groupSize: number): boolean => {
  // Smaller groups more likely to have all members in each expense
  if (groupSize <= 3) {
    return faker.datatype.boolean({ probability: 0.8 });
  }
  if (groupSize <= 6) {
    return faker.datatype.boolean({ probability: 0.6 });
  }
  if (groupSize <= 10) {
    return faker.datatype.boolean({ probability: 0.4 });
  }
  // Large groups rarely include everyone
  return faker.datatype.boolean({ probability: 0.2 });
};
