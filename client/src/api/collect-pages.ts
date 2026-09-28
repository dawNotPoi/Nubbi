import { getAuthSessionSnapshot } from "@/features/auth/model/session-coordinator";
import type { PaginatedResult, PaginationParams } from "./pagination";
import type { ApiResponse } from "./request";

/**
 * 为树和选择器保留完整集合语义，每次请求仍遵守服务端分页上限。
 * 账号切换或任意一页失败时拒绝整个结果，避免拼接不同账号或不完整的数据。
 * @param loadPage 当前页读取函数。
 * @returns 全部已读取条目的统一响应。
 */
export async function collectPages<T>(
  loadPage: (pagination: PaginationParams) => Promise<ApiResponse<PaginatedResult<T>>>,
): Promise<ApiResponse<T[]>> {
  const initial = getAuthSessionSnapshot();
  const items: T[] = [];
  let offset = 0;
  while (true) {
    const response = await loadPage({ limit: 50, offset });
    const current = getAuthSessionSnapshot();
    if (current.generation !== initial.generation || current.user?.id !== initial.user?.id) {
      throw new Error("账号状态已变化，请重新加载列表");
    }
    if (response.code !== 1) throw new Error(response.message || "列表加载失败");
    const page = response.data;
    if (!page || !Array.isArray(page.items) || page.offset !== offset
      || page.count !== page.items.length || page.count > 50 || typeof page.hasMore !== "boolean") {
      throw new Error("列表分页响应无效");
    }
    items.push(...page.items);
    if (!page.hasMore) return { ...response, data: items };
    if (!page.count || page.nextOffset !== offset + page.count) {
      throw new Error("列表分页未向前推进");
    }
    offset = page.nextOffset;
  }
}
