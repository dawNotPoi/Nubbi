export type PaginationParams = {
  limit?: number;
  offset?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  count: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  nextOffset: number | null;
};
