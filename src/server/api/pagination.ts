import { z } from 'zod';

/**
 * Shared pagination input schema for the public API.
 * Uses Zod `.default()` so the OpenAPI generator emits `default` values.
 *
 * @example
 *   // No other input:
 *   .input(paginationInput.optional())
 *   // Combined with other fields:
 *   .input(z.object({ groupId: z.number() }).extend(paginationInput.shape))
 */
export const paginationInput = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
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
 * Build a paginated response envelope from raw items + total count.
 * Applies the default limit (20) and offset (0) when not supplied.
 */
export const paginatedResult = <T>(
  items: T[],
  total: number,
  opts?: { limit?: number; offset?: number },
): PaginatedResult<T> => {
  const limit = opts?.limit ?? 20;
  const offset = opts?.offset ?? 0;

  return {
    items,
    pagination: { total, limit, offset, hasMore: offset + items.length < total },
  };
};
