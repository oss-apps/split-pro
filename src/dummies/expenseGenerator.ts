import { faker } from '@faker-js/faker';
import type { SplitType } from '@prisma/client';
import {
  CATEGORY_AMOUNT_RANGES,
  CURRENCY_MULTIPLIERS,
  DIRECT_EXPENSE_AMOUNT_RANGE,
  DIRECT_EXPENSE_CATEGORIES,
  DIRECT_EXPENSE_FREQUENCY_PER_PAIR,
  EXPENSE_FREQUENCY_BY_GROUP_TYPE,
  GROUP_TYPE_CATEGORY_AFFINITY,
  RANDOM_PAIR_PROBABILITY,
  SPLIT_TYPE_WEIGHTS,
} from './metadata';
import { generateExpenseName } from './expenseNameGenerator';
import { generateSplitShares } from './splitGenerator';
import {
  selectGroupParticipants,
  selectPayer,
  shouldIncludeAllGroupMembers,
} from './participantSelector';

/**
 * Generated expense data ready for insertion into database
 * Uses BigInt for all amounts to ensure precision
 */
export interface GeneratedExpense {
  name: string;
  category: string;
  amount: bigint;
  currency: string;
  splitType: SplitType;
  paidBy: number;
  participants: number[];
  splitShares: Record<number, bigint>;
  expenseDate: Date;
  groupId?: number;
}

export interface GroupInfo {
  id: number;
  type: 'trip' | 'job' | 'household' | 'cow_friends';
  memberIds: number[];
  defaultCurrency: string;
  createdAt: Date;
}

export interface UserInfo {
  id: number;
  currency: string;
}

/**
 * Selects a category based on group type affinity
 * Returns a weighted random category appropriate for the group
 *
 * @param groupType - Type of group (trip, job, household, cow_friends)
 * @returns Category name (e.g., 'diningOut', 'groceries')
 */
const selectCategoryByGroupType = (
  groupType: 'trip' | 'job' | 'household' | 'cow_friends',
): string => {
  const affinities = GROUP_TYPE_CATEGORY_AFFINITY[groupType];

  const weightedCategories = Object.entries(affinities).map(([category, weight]) => ({
    value: category,
    weight,
  }));

  return faker.helpers.weightedArrayElement(weightedCategories);
};

/**
 * Selects a split type based on configured weights
 *
 * @returns A SplitType value
 */
const selectSplitType = (): SplitType => {
  const weightedTypes = Object.entries(SPLIT_TYPE_WEIGHTS).map(([splitType, weight]) => ({
    value: splitType as SplitType,
    weight,
  }));

  return faker.helpers.weightedArrayElement(weightedTypes);
};

/**
 * Converts a USD amount range to the target currency
 *
 * @param usdMin - Minimum USD cents
 * @param usdMax - Maximum USD cents
 * @param currency - Target currency (USD, EUR, GBP, JPY, BHD, CHF)
 * @returns Converted amount range [min, max] in target currency cents
 */
const convertAmountRangeToCurrency = (
  usdMin: bigint,
  usdMax: bigint,
  currency: string,
): [bigint, bigint] => {
  const multiplier = CURRENCY_MULTIPLIERS[currency as keyof typeof CURRENCY_MULTIPLIERS] ?? 1;
  const factor = BigInt(Math.round(multiplier * 100)); // Convert to BigInt with precision

  return [(usdMin * factor) / 100n, (usdMax * factor) / 100n];
};

/**
 * Generates a random amount within a category's range, in the specified currency
 *
 * @param category - Category name (e.g., 'diningOut')
 * @param currency - Target currency
 * @returns Random amount in cents for that currency
 */
const generateAmountForCategory = (category: string, currency: string): bigint => {
  const amountRange = CATEGORY_AMOUNT_RANGES[category as keyof typeof CATEGORY_AMOUNT_RANGES];

  if (!amountRange) {
    // Fallback to general category if not found
    return BigInt(faker.number.int({ min: 500, max: 20000 }));
  }

  const [min, max] = convertAmountRangeToCurrency(amountRange[0], amountRange[1], currency);

  return BigInt(faker.number.int({ min: Number(min), max: Number(max) }));
};

/**
 * Generates a single group expense
 *
 * @param group - Group information
 * @param users - Map of all users by ID
 * @param expenseDate - Date for the expense
 * @returns Generated expense data
 */
export const generateGroupExpense = (
  group: GroupInfo,
  users: Map<number, UserInfo>,
  expenseDate: Date,
): GeneratedExpense => {
  // Select participants
  const shouldIncludeAll = shouldIncludeAllGroupMembers(group.memberIds.length);
  const participants = shouldIncludeAll
    ? group.memberIds.map((id) => ({ id }))
    : selectGroupParticipants(group.memberIds.map((id) => ({ id })));

  // Select payer (optionally prefer group creator, but we'll do random for simplicity)
  const payer = selectPayer(participants);

  // Select category based on group type
  const category = selectCategoryByGroupType(group.type);

  // Generate expense name
  const name = generateExpenseName(category as any);

  // Generate amount in group's currency
  const amount = generateAmountForCategory(category, group.defaultCurrency);

  // Select split type
  const splitType = selectSplitType();

  // Generate split shares
  const splitShares = generateSplitShares(splitType, participants, amount);

  return {
    name,
    category,
    amount,
    currency: group.defaultCurrency,
    splitType,
    paidBy: payer.id,
    participants: participants.map((p) => p.id),
    splitShares,
    expenseDate,
    groupId: group.id,
  };
};

/**
 * Generates multiple expenses for a group
 *
 * @param group - Group information
 * @param users - Map of all users by ID
 * @param baseDate - Reference date to spread expenses around
 * @returns Array of generated expenses
 */
export const generateGroupExpenses = (
  group: GroupInfo,
  users: Map<number, UserInfo>,
  baseDate: Date,
): GeneratedExpense[] => {
  const [minExpenses, maxExpenses] = EXPENSE_FREQUENCY_BY_GROUP_TYPE[group.type];

  const expenseCount = faker.number.int({ min: minExpenses, max: maxExpenses });
  const expenses: GeneratedExpense[] = [];

  const daysSpan = Math.max(
    1,
    Math.floor((new Date().getTime() - group.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
  );

  for (let i = 0; i < expenseCount; i++) {
    // Spread expenses over a date range (group created to now)
    const randomDaysAgo = faker.number.int({ min: 0, max: daysSpan });
    const expenseDate = new Date(baseDate);
    expenseDate.setDate(expenseDate.getDate() - randomDaysAgo);

    expenses.push(generateGroupExpense(group, users, expenseDate));
  }

  return expenses;
};

/**
 * Generates a single direct expense between two users
 *
 * @param participants - Array of user IDs
 * @param users - Map of all users by ID
 * @param expenseDate - Date for the expense
 * @returns Generated expense data
 */
export const generateDirectExpense = (
  participants: number[],
  users: Map<number, UserInfo>,
  expenseDate: Date,
): GeneratedExpense => {
  // Select payer
  const participantObjs = participants.map((id) => ({ id }));
  const payer = selectPayer(participantObjs);

  // Select category (restrict to direct expense categories)
  const category = faker.helpers.arrayElement(DIRECT_EXPENSE_CATEGORIES);

  // Generate expense name
  const name = generateExpenseName(category as any);

  // Use currency of payer (or first participant)
  const currency = users.get(payer.id)?.currency ?? 'USD';

  // Generate amount
  const [minAmount, maxAmount] = convertAmountRangeToCurrency(
    DIRECT_EXPENSE_AMOUNT_RANGE[0],
    DIRECT_EXPENSE_AMOUNT_RANGE[1],
    currency,
  );
  const amount = BigInt(faker.number.int({ min: Number(minAmount), max: Number(maxAmount) }));

  // Select split type
  const splitType = selectSplitType();

  // Generate split shares
  const splitShares = generateSplitShares(splitType, participantObjs, amount);

  return {
    name,
    category,
    amount,
    currency,
    splitType,
    paidBy: payer.id,
    participants,
    splitShares,
    expenseDate,
  };
};

/**
 * Generates direct expenses between pairs of users
 * Connects users who appear in the same groups, plus random pairs
 *
 * @param users - Array of all users
 * @param groups - Array of all groups
 * @returns Array of generated expenses
 */
export const generateDirectExpenses = (
  users: UserInfo[],
  groups: GroupInfo[],
): GeneratedExpense[] => {
  // Build graph of users in same groups
  const userConnections = new Map<number, Set<number>>();

  users.forEach((u) => {
    if (!userConnections.has(u.id)) {
      userConnections.set(u.id, new Set());
    }
  });

  groups.forEach((group) => {
    for (let i = 0; i < group.memberIds.length; i++) {
      for (let j = i + 1; j < group.memberIds.length; j++) {
        const userId1 = group.memberIds[i]!;
        const userId2 = group.memberIds[j]!;

        userConnections.get(userId1)?.add(userId2);
        userConnections.get(userId2)?.add(userId1);
      }
    }
  });

  // Also add random pairs
  const randomPairChance = RANDOM_PAIR_PROBABILITY;
  const totalPossiblePairs = (users.length * (users.length - 1)) / 2;
  const randomPairsToGenerate = Math.round(totalPossiblePairs * randomPairChance);

  for (let i = 0; i < randomPairsToGenerate; i++) {
    const user1 = faker.helpers.arrayElement(users);
    const user2 = faker.helpers.arrayElement(users.filter((u) => u.id !== user1.id));

    userConnections.get(user1.id)?.add(user2.id);
    userConnections.get(user2.id)?.add(user1.id);
  }

  // Generate expenses for each connection
  const expenses: GeneratedExpense[] = [];
  const usersMap = new Map(users.map((u) => [u.id, u]));

  userConnections.forEach((connectedUsers, userId) => {
    connectedUsers.forEach((connectedUserId) => {
      if (userId < connectedUserId) {
        // Generate 2-10 expenses for this pair
        const [minExpenses, maxExpenses] = DIRECT_EXPENSE_FREQUENCY_PER_PAIR;
        const expenseCount = faker.number.int({ min: minExpenses, max: maxExpenses });

        for (let i = 0; i < expenseCount; i++) {
          const expenseDate = new Date();
          expenseDate.setDate(expenseDate.getDate() - faker.number.int({ min: 0, max: 365 }));

          expenses.push(generateDirectExpense([userId, connectedUserId], usersMap, expenseDate));
        }
      }
    });
  });

  return expenses;
};

/**
 * Generates all expenses (both group and direct)
 *
 * @param users - Array of all users
 * @param groups - Array of all groups
 * @returns Array of all generated expenses
 */
export const generateAllExpenses = (users: UserInfo[], groups: GroupInfo[]): GeneratedExpense[] => {
  const usersMap = new Map(users.map((u) => [u.id, u]));
  const now = new Date();

  // Generate group expenses
  const groupExpenses = groups.flatMap((group) => generateGroupExpenses(group, usersMap, now));

  // Generate direct expenses
  const directExpenses = generateDirectExpenses(users, groups);

  return [...groupExpenses, ...directExpenses];
};
