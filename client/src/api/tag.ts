import { collectPages } from "./collect-pages";
import type { PaginatedResult } from "./pagination";
import type { ApiResponse } from "./request";
import request, { Get } from "./request";

/** @returns 全部标签，选择器保持现有完整目录。 */
export async function getTags(): Promise<ApiResponse<string[]>> {
  return collectPages((pagination) => Get<PaginatedResult<string>>("tag/list", pagination));
}

export async function createTag(name: string) {
  return request<string>("tag/create", { name }, "post");
}

export async function deleteTag(name: string) {
  return request<null>("tag/delete", { name }, "delete");
}
