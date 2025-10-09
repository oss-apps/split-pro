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
  balance: SplitwiseBalance[];
  picture: SplitwisePicture;
}

export interface SplitwiseGroup {
  id: number;
  name: string;
  members: SplitwiseUser[];
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
  balance: z.array(SplitwiseBalanceSchema),
  picture: SplitwisePictureSchema,
});

export const SplitwiseGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  members: z.array(SplitwiseUserSchema),
});
