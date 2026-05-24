/**
 * Splitwise to SplitPro Conversion Utilities
 *
 * Converts Splitwise expense data to SplitPro format.
 * Extracted for testability.
 */

import { SplitType } from '@prisma/client';
import { type SplitwiseExpense } from './splitwise-api';

export interface ConvertedExpense {
  name: string;
  category: string;
  amount: bigint;
  currency: string;
  splitType: SplitType;
  expenseDate: Date;
  createdAt: Date;
  paidBy: number;
  groupId: number;
  participants: { userId: number; amount: bigint }[];
  transactionId: string;
}

/**
 * Convert Splitwise expense to SplitPro expense data
 * Uses Splitwise user ID to map to our DB user ID
 *
 * @param expense - The Splitwise expense to convert
 * @param splitwiseIdToDbId - Map from Splitwise user ID to SplitPro DB user ID
 * @param groupId - The SplitPro group ID
 * @returns Converted expense data or null if conversion fails
 */
export function convertExpenseToSplitPro(
  expense: SplitwiseExpense,
  splitwiseIdToDbId: Map<number, number>,
  groupId: number,
): ConvertedExpense | null {
  // Find the payer (user with paid_share > 0)
  const payer = expense.users.find((u) => parseFloat(u.paid_share) > 0);

  if (!payer) {
    console.warn(`No payer found for expense: ${expense.description}`);
    return null;
  }

  // Use user_id from the expense data to look up DB user
  const payerDbId = splitwiseIdToDbId.get(payer.user_id);
  if (!payerDbId) {
    console.warn(`Payer not found in DB: Splitwise ID ${payer.user_id}`);
    return null;
  }

  // Convert cost to BigInt (paisa/cents)
  const totalAmount = BigInt(Math.round(parseFloat(expense.cost) * 100));

  // Build participants
  const participants: { userId: number; amount: bigint }[] = [];

  for (const userShare of expense.users) {
    const userId = splitwiseIdToDbId.get(userShare.user_id);
    if (!userId) {
      console.warn(`User not found in DB: Splitwise ID ${userShare.user_id}`);
      continue;
    }

    const paidShare = parseFloat(userShare.paid_share);
    const owedShare = parseFloat(userShare.owed_share);

    // Calculate participant amount using SplitPro's model:
    // - If they paid: amount = -owedShare + paidShare
    // - If they didn't pay: amount = -owedShare
    let participantAmount: bigint;
    if (paidShare > 0) {
      // This is a payer
      participantAmount = BigInt(Math.round((-owedShare + paidShare) * 100));
    } else {
      // Non-payer
      participantAmount = BigInt(Math.round(-owedShare * 100));
    }

    // Skip zero amounts
    if (0n === participantAmount) {
      continue;
    }

    participants.push({
      userId,
      amount: participantAmount,
    });
  }

  if (participants.length === 0) {
    console.warn(`No participants for expense: ${expense.description}`);
    return null;
  }

  // Determine split type
  const splitType = determineSplitType(expense);

  return {
    name: expense.description || 'Untitled expense',
    category: expense.category?.name?.toLowerCase() || 'general',
    amount: totalAmount,
    currency: expense.currency_code,
    splitType,
    expenseDate: new Date(expense.date),
    createdAt: new Date(expense.created_at),
    paidBy: payerDbId,
    groupId,
    participants,
    transactionId: `splitwise-api-${expense.id}`,
  };
}

/**
 * Determine the split type based on expense data
 */
export function determineSplitType(expense: SplitwiseExpense): SplitType {
  if (expense.payment) {
    return SplitType.SETTLEMENT;
  }

  // Check if it's an equal split
  const shares = expense.users.map((u) => parseFloat(u.owed_share)).filter((s) => s > 0);
  const uniqueShares = new Set(shares.map((s) => s.toFixed(2)));

  if (uniqueShares.size === 1 && shares.length > 1) {
    return SplitType.EQUAL;
  }

  return SplitType.EXACT;
}

/**
 * Map Splitwise category to SplitPro category
 */
export function mapCategory(splitwiseCategory: string): string {
  const categoryMap: Record<string, string> = {
    groceries: 'food',
    'dining out': 'food',
    food: 'food',
    drinks: 'food',
    liquor: 'food',
    rent: 'home',
    mortgage: 'home',
    household: 'home',
    furniture: 'home',
    maintenance: 'home',
    pets: 'home',
    services: 'home',
    electronics: 'home',
    utilities: 'utilities',
    electricity: 'utilities',
    heat: 'utilities',
    water: 'utilities',
    tv: 'utilities',
    internet: 'utilities',
    trash: 'utilities',
    cleaning: 'utilities',
    transportation: 'transportation',
    parking: 'transportation',
    car: 'transportation',
    bus: 'transportation',
    train: 'transportation',
    plane: 'transportation',
    taxi: 'transportation',
    bicycle: 'transportation',
    hotel: 'transportation',
    gas: 'transportation',
    entertainment: 'entertainment',
    games: 'entertainment',
    movies: 'entertainment',
    music: 'entertainment',
    sports: 'entertainment',
    clothing: 'personal',
    gifts: 'personal',
    medical: 'personal',
    insurance: 'personal',
    taxes: 'personal',
    education: 'personal',
    childcare: 'personal',
    general: 'general',
    payment: 'general',
    other: 'general',
  };

  return categoryMap[splitwiseCategory.toLowerCase()] || 'general';
}

/**
 * Calculate the participant amount for SplitPro's model
 *
 * In SplitPro:
 * - Payer gets: total - their_share (positive, they are owed money)
 * - Non-payer gets: -their_share (negative, they owe money)
 *
 * From Splitwise:
 * - paid_share: how much they paid
 * - owed_share: how much they owe (their share of the expense)
 *
 * Formula: amount = paid_share - owed_share
 * - If paid_share > owed_share: positive (they are owed)
 * - If paid_share < owed_share: negative (they owe)
 */
export function calculateParticipantAmount(paidShare: number, owedShare: number): bigint {
  return BigInt(Math.round((paidShare - owedShare) * 100));
}
