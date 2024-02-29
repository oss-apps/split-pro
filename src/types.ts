import { z } from 'zod';

export type Picture = {
  small: string;
  medium: string;
  large: string;
};

export type Balance = {
  currency_code: string;
  amount: string;
};

export type Group = {
  group_id: number;
  balance: Balance[];
};

export type SplitwiseUser = {
  id: number;
  first_name: string;
  last_name: string | null;
  email: string;
  registration_status: 'confirmed'; // Assuming registration_status can only be 'confirmed' for the sake of this example. If there are other possible values, use string or a union of string literals instead.
  balance: Balance[];
  groups: Group[];
  updated_at: string; // ISO 8601 format date string
  picture: Picture;
};

const PictureSchema = z.object({
  small: z.string(),
  medium: z.string(),
  large: z.string(),
});

const BalanceSchema = z.object({
  currency_code: z.string(),
  amount: z.string(),
});

const GroupSchema = z.object({
  group_id: z.number(),
  balance: z.array(BalanceSchema),
});

export const SplitwiseUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  email: z.string().email(),
  registration_status: z.literal('confirmed'), // Use z.union([z.literal('value1'), z.literal('value2')]) for multiple possible values
  balance: z.array(BalanceSchema),
  groups: z.array(GroupSchema),
  updated_at: z.string(), // For ISO 8601 format, you might want to use a custom validation if necessary
  picture: PictureSchema,
});

// Export the schema if needed elsewhere
