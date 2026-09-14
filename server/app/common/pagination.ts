import { z } from "zod";

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().safe().min(1).max(50).default(20),
  offset: z.coerce.number().int().safe().nonnegative().default(0),
});

export type PaginationInput = z.infer<typeof paginationQuerySchema>;

export const buildPaginationResult = <T>(
  items: T[],
  total: number,
  pagination: PaginationInput,
) => {
  const { limit, offset } = pagination;
  const count = items.length;
  const hasMore = count > 0 && offset + count < total;

  return {
    items,
    total,
    count,
    limit,
    offset,
    hasMore,
    nextOffset: hasMore ? offset + count : null,
  };
};
