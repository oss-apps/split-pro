import { z } from 'zod';

/**
 * Shared pagination input schema for the public API list endpoints.
 * Uses Zod `.default()` so the OpenAPI generator emits `default` values.
 *
 * @example
 *   // Pagination-only input:
 *   .input(paginationInput.default({}))
 *   // Combined with other fields:
 *   .input(z.object({ groupId: z.number() }).extend(paginationInput.shape))
 */
export const paginationInput = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

export type PaginationInput = z.infer<typeof paginationInput>;

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Build the paginated response envelope from a page of items plus the total
 * count of all matching rows.
 */
export const paginatedResult = <T>(
  items: T[],
  total: number,
  { limit, offset }: PaginationInput,
): PaginatedResult<T> => ({
  items,
  pagination: { total, limit, offset, hasMore: offset + items.length < total },
});
