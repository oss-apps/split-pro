import { type NextPage } from 'next';
import { type User } from 'next-auth';
import { z } from 'zod';

export type NextPageWithUser<T = {}> = NextPage<{ user: User } & T> & { auth: boolean };

export interface PushMessage {
  title: string;
  message: string;
  data?: { url?: string };
}

export interface SplitwisePicture {
  small: string;
  medium: string;
  large: string;
}

export interface SplitwiseBalance {
  currency_code: string;
  amount: string;
}

export interface SplitwiseUser {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  picture: SplitwisePicture;
}

export type SplitwiseUserWithBalance = SplitwiseUser & {
  balance: SplitwiseBalance[];
};

export interface SplitwiseGroup {
  id: number;
  name: string;
  members: SplitwiseUserWithBalance[];
}

export interface SplitWiseCategory {
  id: number;
  name: string;
}

export interface SplitwiseExpenseUser {
  user_id: number;
  paid_share: string;
  owed_share: string;
  net_balance: string;
}

export interface SplitwiseExpense {
  id: number;
  group_id: number | null;
  description: string;
  payment: boolean;
  cost: string;
  currency_code: string;
  date: string;
  category: SplitWiseCategory;
  users: SplitwiseExpenseUser[];
  created_by: Omit<SplitwiseUser, 'picture' | 'email'>;
  deleted_at: string | null;
}

export interface TransactionAddInputModel {
  date: Date;
  description: string;
  amount: string;
  currency: string;
  transactionId?: string;
  expenseId?: string;
}

const SplitwisePictureSchema = z.object({
  small: z.string(),
  medium: z.string(),
  large: z.string(),
});

const SplitwiseBalanceSchema = z.object({
  currency_code: z.string(),
  amount: z.string(),
});

export const SplitwiseUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  email: z.string().email(),
  picture: SplitwisePictureSchema,
});

export const SplitwiseUserWithBalanceSchema = SplitwiseUserSchema.extend({
  balance: z.array(SplitwiseBalanceSchema),
});

export const SplitwiseGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  members: z.array(SplitwiseUserWithBalanceSchema),
});

export const SplitwiseCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const SplitwiseExpenseUserSchema = z.object({
  user_id: z.number(),
  paid_share: z.string(),
  owed_share: z.string(),
  net_balance: z.string(),
});

export const SplitwiseExpenseSchema = z.object({
  id: z.number(),
  group_id: z.number().nullable(),
  description: z.string(),
  payment: z.boolean(),
  cost: z.string(),
  currency_code: z.string(),
  date: z.string(),
  category: SplitwiseCategorySchema,
  users: z.array(SplitwiseExpenseUserSchema),
  created_by: SplitwiseUserSchema.omit({ picture: true, email: true }),
  deleted_at: z.string().nullable(),
});

export const SplitwiseCategoryMap: Record<number, string | undefined> = {
  // entertainment
  19: 'entertainment',
  20: 'games',
  21: 'movies',
  22: 'music',
  24: 'sports',
  23: 'entertainment', // other
  // food
  25: 'food',
  13: 'diningOut',
  12: 'groceries',
  38: 'liquor',
  26: 'food', // other
  // home
  27: 'home',
  39: 'electronics',
  16: 'furniture',
  14: 'supplies',
  17: 'maintenance',
  4: 'mortgage',
  29: 'pets',
  3: 'rent',
  30: 'services',
  28: 'home', // other
  // life
  40: 'life',
  50: 'childcare',
  41: 'clothing',
  49: 'education',
  42: 'gifts',
  10: 'insurance',
  43: 'medical',
  45: 'taxes',
  44: 'life', // other
  // travel
  31: 'travel',
  46: 'bicycle',
  32: 'bus', // bus/train
  15: 'car',
  33: 'fuel',
  47: 'hotel',
  9: 'parking',
  35: 'plane',
  36: 'taxi',
  34: 'travel', // other
  // utilities
  1: 'utilities',
  48: 'cleaning',
  5: 'electricity',
  6: 'gas',
  8: 'phone', // phone/tv/internet
  37: 'trash',
  7: 'water',
  11: 'utilities', // other
  // general
  18: 'general',
};
