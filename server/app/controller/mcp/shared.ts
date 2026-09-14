import { httpError } from "@/common/http-error";
import { getNoteAncestors } from "@/controller/note/hierarchy-query";
import { MCP_LIMITS } from "@/lib/mcpPolicy";
import type * as McpTypes from "./types";

/** MCP 可序列化的笔记数据结构（宽松类型，适配数据库记录） */
export type NoteLike = {
  _id: unknown;
  title?: unknown;
  content?: unknown;
  contentRevision?: unknown;
  author?: unknown;
  parentId?: unknown;
  hasChildren?: unknown;
  source?: unknown;
  status?: unknown;
  published?: unknown;
  tags?: unknown;
  date?: unknown;
  deletedAt?: unknown;
  meta?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export { httpError };

/** 转义正则表达式特殊字符，用于安全的模糊搜索 */
export const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 将值安全转为 ISO 字符串，无效日期返回 null */
export const toIsoString = (value: unknown): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** 将笔记数据库记录序列化为 MCP 响应格式（含字段截断） */
export const serializeNote = (item: NoteLike): McpTypes.McpNoteResult => ({
  id: String(item._id),
  title:
    typeof item.title === "string"
      ? truncateText(item.title, 500)
      : "Untitled",
  author: typeof item.author === "string" ? item.author : null,
  parentId: item.parentId ? String(item.parentId) : null,
  hasChildren: Boolean(item.hasChildren),
  source: item.source === "agent" ? "agent" : "user",
  status: typeof item.status === "string" ? item.status : "active",
  published: Boolean(item.published),
  tags: Array.isArray(item.tags)
    ? item.tags
        .filter((tag): tag is string => typeof tag === "string")
        .slice(0, 100)
        .map((tag) => truncateText(tag, 100))
    : [],
  date: toIsoString(item.date),
  contentRevision:
    typeof item.contentRevision === "number" ? item.contentRevision : 0,
  deletedAt: toIsoString(item.deletedAt),
  createdAt: toIsoString(item.createdAt),
  updatedAt: toIsoString(item.updatedAt),
});

/** 截断文本到指定长度，末尾加省略号 */
export const truncateText = (value: string, limit: number): string =>
  value.length <= limit ? value : `${value.slice(0, Math.max(0, limit - 1))}…`;

/** 控制响应总大小：按预算截断返回条目，防止超出 MCP 输出限制 */
export const fitResponseItems = <T>(items: T[]): T[] => {
  const budget = MCP_LIMITS.maxResponseChars - 2_000;
  const result: T[] = [];
  let size = 0;

  for (const item of items) {
    const itemSize = (JSON.stringify(item) ?? "").length;
    if (result.length > 0 && size + itemSize > budget) break;
    result.push(item);
    size += itemSize;
  }
  return result;
};

/** 截断 meta 字段：单个条目标记超限时标记 truncated */
export const fitMeta = (
  value: unknown,
): { meta: unknown[]; metaTruncated: boolean } => {
  if (!Array.isArray(value)) return { meta: [], metaTruncated: false };
  const result: unknown[] = [];
  let size = 0;
  for (const entry of value) {
    const entrySize = (JSON.stringify(entry) ?? "").length;
    if (size + entrySize > 2_000) {
      return { meta: result, metaTruncated: true };
    }
    result.push(entry);
    size += entrySize;
  }
  return { meta: result, metaTruncated: false };
};

/** 获取笔记的路径信息（祖先链 + 拼接路径），祖先最多保留 50 个 */
export const getNotePath = async (
  noteId: string,
  userId: string,
  includeDeleted = false,
): Promise<McpTypes.McpNotePathResult> => {
  const allAncestors = await getNoteAncestors(noteId, userId, {
    includeDeleted,
  });
  const ancestors =
    allAncestors.length <= 50
      ? allAncestors
      : [allAncestors[0], ...allAncestors.slice(-49)];
  return {
    ancestors: ancestors.map((item) => ({
      id: item._id,
      title: truncateText(item.title, 200),
    })),
    path: ancestors.map((item) => item.title).join("/"),
  };
};

/** 构建分页结果 */
export const paginationResult = <T>(
  items: T[],
  total: number,
  offset: number,
): McpTypes.McpPaginationResult<T> => ({
  items,
  total,
  count: items.length,
  offset,
  hasMore: offset + items.length < total,
  nextOffset: offset + items.length < total ? offset + items.length : null,
});

/** 校验乐观并发：期望的日期与当前不一致时抛出 409 冲突 */
export const assertExpectedDate = (
  expected: string,
  current: unknown,
  label = "updatedAt",
): void => {
  const currentIso = toIsoString(current);
  const expectedDate = new Date(expected);
  if (
    Number.isNaN(expectedDate.getTime()) ||
    !currentIso ||
    expectedDate.toISOString() !== currentIso
  ) {
    throw httpError(409, `Note ${label} conflict; read it again and retry`, {
      [label]: currentIso,
    });
  }
};
