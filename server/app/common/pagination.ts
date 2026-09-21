import { z } from "zod/v3";

/** 分页查询参数：limit 上限 50，offset 从 0 开始 */
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().safe().min(1).max(50).default(20),
  offset: z.coerce.number().int().safe().nonnegative().default(0),
});

/** 分页输入类型 */
export type PaginationInput = z.infer<typeof paginationQuerySchema>;

/** 分页结果类型：包含总数、偏移量、是否还有更多数据 */
export type PaginationResult<T> = {
  items: T[];
  total: number;
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
};

/** 根据当前页数据构建统一分页结果 */
export const buildPaginationResult = <T>(
  items: T[],
  total: number,
  pagination: PaginationInput,
): PaginationResult<T> => {
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
