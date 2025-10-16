import { faker } from '@faker-js/faker';
import type { SplitType } from '@prisma/client';
import { addDays } from 'date-fns';
import type { CategoryItem } from '~/lib/category';
import { generateExpenseName } from './expenseNameGenerator';
import { type DummyGroupInfo, type DummyGroupType } from './groupGenerator';
import {
  CATEGORY_AMOUNT_RANGES,
  DIRECT_EXPENSE_AMOUNT_RANGE,
  DIRECT_EXPENSE_CATEGORIES,
  DIRECT_EXPENSE_FREQUENCY_PER_PAIR,
  type DummyGroupCategory,
  EXPENSE_EDIT_WEIGHTS,
  EXPENSE_FREQUENCY_BY_GROUP_TYPE,
  GROUP_TYPE_CATEGORY_AFFINITY,
  RANDOM_PAIR_PROBABILITY,
  SPLIT_TYPE_WEIGHTS,
} from './metadata';
import {
  selectGroupParticipants,
  selectPayer,
  shouldIncludeAllGroupMembers,
} from './participantSelector';
import { generateSplitShares } from './splitGenerator';
import { CURRENCY_MULTIPLIERS, type DummyCurrencyCode, type DummyUserInfo } from './userGenerator';

/**
 * Selects a category based on group type affinity
 * Returns a weighted random category appropriate for the group
 *
 * @param groupType - Type of group (trip, job, household, cow_friends)
 * @returns Category name (e.g., 'diningOut', 'groceries')
 */
const selectCategoryByGroupType = (groupType: DummyGroupType): DummyGroupCategory => {
  const affinities = GROUP_TYPE_CATEGORY_AFFINITY[groupType];

  const weightedCategories = Object.entries(affinities).map(([category, weight]) => ({
    value: category,
    weight,
  }));

  return faker.helpers.weightedArrayElement(weightedCategories) as DummyGroupCategory;
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
  currency: DummyCurrencyCode,
): [bigint, bigint] => {
  const multiplier = CURRENCY_MULTIPLIERS[currency] ?? 1;
  const factor = BigInt(Math.round(multiplier * 10000)); // Convert to BigInt with precision

  return [(usdMin * factor) / 10000n, (usdMax * factor) / 10000n];
};

/**
 * Generates a random amount within a category's range, in the specified currency
 *
 * @param category - Category name (e.g., 'diningOut')
 * @param currency - Target currency
 * @returns Random amount in cents for that currency
 */
const generateAmountForCategory = (category: CategoryItem, currency: DummyCurrencyCode): bigint => {
  const amountRange = CATEGORY_AMOUNT_RANGES[category];

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
export const generateGroupExpense = (group: DummyGroupInfo, expenseDate: Date) => {
  // Select participants
  const shouldIncludeAll = shouldIncludeAllGroupMembers(group.members.length);
  const participants = shouldIncludeAll ? group.members : selectGroupParticipants(group.members);

  // Select payer (optionally prefer group creator, but we'll do random for simplicity)
  const payer = selectPayer(participants);

  const addedBy = selectPayer(participants, payer.id);

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
    paidBy: payer,
    addedBy: addedBy.id,
    createdAt: faker.date.between({ from: expenseDate, to: addDays(expenseDate, 7) }),
    participants: [...participants],
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
export const generateGroupExpenses = (group: DummyGroupInfo) => {
  const [minExpenses, maxExpenses] = EXPENSE_FREQUENCY_BY_GROUP_TYPE[group.type];

  const expenseCount = faker.number.int({ min: minExpenses, max: maxExpenses });
  const expenses = [];

  const addUntil =
    group.type === 'trip'
      ? addDays(group.createdAt, faker.number.int({ min: 3, max: 14 }))
      : faker.date.recent();

  for (let i = 0; i < expenseCount; i++) {
    // Spread expenses over a date range (group created to now)

    expenses.push(
      generateGroupExpense(
        group,
        faker.date.between({
          from: group.createdAt,
          to: addUntil,
        }),
      ),
    );
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
export const generateDirectExpense = (participants: DummyUserInfo[]) => {
  // Select payer
  const payer = selectPayer(participants);

  // Select addedBy (someone other than payer)
  const addedBy = selectPayer(participants, payer.id);

  // Select category (restrict to direct expense categories)
  const category = faker.helpers.arrayElement(DIRECT_EXPENSE_CATEGORIES);

  // Generate expense name
  const name = generateExpenseName(category as any);

  // Use currency of payer (or first participant)
  const currency = payer.currency;

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
  const splitShares = generateSplitShares(splitType, participants, amount);

  const expenseDate = faker.date.past({ years: 5 });

  return {
    name,
    category,
    amount,
    currency,
    splitType,
    paidBy: payer,
    addedBy: addedBy.id,
    createdAt: faker.date.between({ from: expenseDate, to: addDays(expenseDate, 7) }),
    groupId: null,
    participants: [...participants],
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
export const generateDirectExpenses = (users: DummyUserInfo[], groups: DummyGroupInfo[]) => {
  // Build graph of users in same groups
  const userConnections = new Map<DummyUserInfo, Set<DummyUserInfo>>();

  users.forEach((u) => {
    if (!userConnections.has(u)) {
      userConnections.set(u, new Set());
    }
  });

  groups.forEach((group) => {
    for (let i = 0; i < group.members.length; i++) {
      for (let j = i + 1; j < group.members.length; j++) {
        const user1 = group.members[i]!;
        const user2 = group.members[j]!;

        userConnections.get(user1)?.add(user2);
        userConnections.get(user2)?.add(user1);
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

    userConnections.get(user1)?.add(user2);
    userConnections.get(user2)?.add(user1);
  }

  // Generate expenses for each connection
  const expenses: ReturnType<typeof generateDirectExpense>[] = [];

  userConnections.forEach((connectedUsers, userId) => {
    connectedUsers.forEach((connectedUserId) => {
      if (userId < connectedUserId) {
        // Generate 2-10 expenses for this pair
        const [minExpenses, maxExpenses] = DIRECT_EXPENSE_FREQUENCY_PER_PAIR;
        const expenseCount = faker.number.int({ min: minExpenses, max: maxExpenses });

        for (let i = 0; i < expenseCount; i++) {
          expenses.push(generateDirectExpense([userId, connectedUserId]));
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
export const generateAllExpenses = (users: DummyUserInfo[], groups: DummyGroupInfo[]) => {
  // Generate group expenses
  const groupExpenses = groups.flatMap((group) => generateGroupExpenses(group));

  // Generate direct expenses
  const directExpenses = generateDirectExpenses(users, groups);

  return [...groupExpenses, ...directExpenses].map((expense, idx) => ({
    ...expense,
    idx,
  }));
};

export type DummyExpenseInfo = ReturnType<typeof generateAllExpenses>[number];

export const selectEditType = () => {
  const weightedTypes = Object.entries(EXPENSE_EDIT_WEIGHTS).map(([editType, weight]) => ({
    value: editType,
    weight,
  }));

  return faker.helpers.weightedArrayElement(weightedTypes);
};

export const generateExpenseEdits = (expenses: DummyExpenseInfo[]) =>
  expenses
    .filter(() => faker.datatype.boolean({ probability: 0.1 }))
    .map((expense) => {
      const editType = selectEditType();

      const expenseEdit = {
        ...expense,
        updatedAt: faker.date.between({
          from: expense.createdAt,
          to: addDays(expense.createdAt, 30),
        }),
        updatedBy: selectPayer(expense.participants, expense.addedBy),
      };

      switch (editType) {
        case 'splitType':
          expenseEdit.splitType = selectSplitType();
          expenseEdit.splitShares = generateSplitShares(
            expenseEdit.splitType,
            expenseEdit.participants,
            expenseEdit.amount,
          );
          break;
        case 'amount':
          expenseEdit.amount = generateAmountForCategory(
            expenseEdit.category,
            expenseEdit.currency,
          );
          expenseEdit.splitShares = generateSplitShares(
            expenseEdit.splitType,
            expenseEdit.participants,
            expenseEdit.amount,
          );
          break;
        case 'payer':
          expenseEdit.paidBy = selectPayer(expenseEdit.participants, expenseEdit.paidBy.id);
          expenseEdit.splitShares = generateSplitShares(
            expenseEdit.splitType,
            expenseEdit.participants,
            expenseEdit.amount,
          );
          break;
        case 'participants':
          expenseEdit.participants = selectGroupParticipants(expenseEdit.participants);
          if (!expenseEdit.participants.some((p) => p.id === expenseEdit.paidBy.id)) {
            expenseEdit.paidBy = selectPayer(expenseEdit.participants);
          }
          expenseEdit.splitShares = generateSplitShares(
            expenseEdit.splitType,
            expenseEdit.participants,
            expenseEdit.amount,
          );
          break;
        case 'name':
          expenseEdit.name = generateExpenseName(expenseEdit.category);
          break;
      }

      return expenseEdit;
    });

export const generateExpensesToDelete = (expenses: DummyExpenseInfo[]) =>
  expenses
    .filter(() => faker.datatype.boolean({ probability: 0.1 }))
    .map((expense) => ({
      ...expense,
      deletedAt: faker.date.between({
        from: expense.createdAt,
        to: addDays(expense.createdAt, 30),
      }),
      deletedBy: selectPayer(expense.participants, expense.addedBy),
    }));
