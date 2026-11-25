import { type Prisma } from '@prisma/client';

// Prisma passes `contains` to ILIKE unescaped; backslash is PostgreSQL's default LIKE escape.
const escapeLike = (value: string) => value.replace(/[\\%_]/g, (match) => `\\${match}`);

/**
 * Builds the Prisma filter for the free-text `search` param of the expense lists.
 * Matches the expense name, category, group name and the payer's name or email,
 * case-insensitively. An empty or missing search matches everything.
 */
export const expenseSearchWhere = (search?: string): Prisma.ExpenseWhereInput => {
  const term = search?.trim();
  if (!term) {
    return {};
  }

  const contains = { contains: escapeLike(term), mode: 'insensitive' } as const;
  return {
    OR: [
      { name: contains },
      { category: contains },
      { group: { is: { name: contains } } },
      { paidByUser: { is: { name: contains } } },
      { paidByUser: { is: { email: contains } } },
    ],
  };
};
