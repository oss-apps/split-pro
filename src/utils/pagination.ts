import { z } from 'zod';

// Keep search/filter criteria alongside this schema in the query input.
// Each set of criteria gets its own cache and starts at the first page.
export const paginationInput = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.object({ date: z.date(), id: z.string().uuid() }).nullish(),
});

export type ListCursor = NonNullable<z.infer<typeof paginationInput>['cursor']>;

// Value-based cursors continue working if the boundary row is deleted.
export const beforeCursor = (
  cursor: ListCursor | null | undefined,
  dateField: 'expenseDate' | 'createdAt',
) =>
  cursor
    ? {
        OR: [
          { [dateField]: { lt: cursor.date } },
          { [dateField]: cursor.date, id: { lt: cursor.id } },
        ],
      }
    : {};

export const toPage = <T>(rows: T[], limit: number, getCursor: (item: T) => ListCursor) => {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? getCursor(last) : undefined,
  };
};

export const nextPageParam = (page: { nextCursor?: ListCursor }) => page.nextCursor;

export const flattenPages = <T>(data: { pages: { items: T[] }[] } | undefined): T[] =>
  data?.pages.flatMap((page) => page.items) ?? [];

// Explicit full-history operations (such as export) still use bounded requests.
export const collectPages = async <T>(
  fetchPage: (cursor?: ListCursor) => Promise<{ items: T[]; nextCursor?: ListCursor }>,
) => {
  const items: T[] = [];
  let cursor: ListCursor | undefined = undefined;
  do {
    // Each page depends on the preceding cursor.
    // oxlint-disable-next-line no-await-in-loop
    const page = await fetchPage(cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
};
