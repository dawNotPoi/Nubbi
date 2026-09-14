import Note from "@/models/note";
import {
  escapeRegExp,
  fitMeta,
  fitResponseItems,
  getNotePath,
  httpError,
  paginationResult,
  serializeNote,
  truncateText,
} from "./shared";
import type * as McpTypes from "./types";
import { canRestoreMcpTrashNote } from "./trash-state";

/** 列表查询的输入参数 */
export type ListNotesInput = {
  limit: number;
  offset: number;
  parentId?: string | null;
  source?: "user" | "agent";
  status?: "inbox" | "active" | "archived";
  tag?: string;
};

/** 构建活跃笔记的查询过滤条件 */
const buildActiveFilter = (userId: string, input: ListNotesInput) => ({
  userId,
  deletedAt: null,
  ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
  ...(input.source ? { source: input.source } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.tag ? { tags: input.tag } : {}),
});

/** 分页查询笔记列表（排除正文等大字段，控制响应体积） */
export const listMcpNotes = async (
  userId: string,
  input: ListNotesInput,
): Promise<McpTypes.McpPaginationResult<McpTypes.McpNoteResult>> => {
  const filter = buildActiveFilter(userId, input);
  const [items, total] = await Promise.all([
    Note.find(filter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(input.offset)
      .limit(input.limit)
      .select("-content -password -cover -meta")
      .lean(),
    Note.countDocuments(filter),
  ]);

  return paginationResult(
    fitResponseItems(items.map(serializeNote)),
    total,
    input.offset,
  );
};

/** 搜索笔记的输入参数 */
export type SearchNotesInput = Omit<ListNotesInput, "parentId"> & {
  query: string;
};

/** 生成搜索结果摘要：高亮命中位置附近的上下文文本 */
const createExcerpt = (content: string, query: string): string => {
  const index = content.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) return content.slice(0, 240);
  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + query.length + 160);
  return `${start > 0 ? "…" : ""}${content.slice(start, end)}${
    end < content.length ? "…" : ""
  }`;
};

/** 搜索笔记：匹配标题、正文和标签，返回摘要和路径 */
export const searchMcpNotes = async (
  userId: string,
  input: SearchNotesInput,
): Promise<McpTypes.McpPaginationResult<McpTypes.McpSearchNoteResult>> => {
  const regex = new RegExp(escapeRegExp(input.query), "i");
  const filter = {
    ...buildActiveFilter(userId, input),
    $or: [{ title: regex }, { content: regex }, { tags: regex }],
  };
  const [items, total] = await Promise.all([
    Note.find(filter)
      .sort({ updatedAt: -1 })
      .skip(input.offset)
      .limit(input.limit)
      .select("-password -cover -meta")
      .lean(),
    Note.countDocuments(filter),
  ]);

  const results = await Promise.all(
    items.map(async (item) => {
      const content = typeof item.content === "string" ? item.content : "";
      const pathInfo = await getNotePath(String(item._id), userId);
      return {
        ...serializeNote(item),
        excerpt: createExcerpt(content, input.query),
        path: truncateText(
          [...pathInfo.ancestors.map((entry) => entry.title), item.title]
            .filter(Boolean)
            .join("/"),
          2_000,
        ),
      };
    }),
  );
  return paginationResult(fitResponseItems(results), total, input.offset);
};

/** 查询笔记详情：支持分片读取正文和元数据截断 */
export const getMcpNote = async (
  userId: string,
  noteId: string,
  input: {
    includeDeleted: boolean;
    contentOffset: number;
    contentLimit: number;
  },
): Promise<McpTypes.McpNoteDetailResult> => {
  const item = await Note.findOne({
    _id: noteId,
    userId,
    ...(input.includeDeleted ? {} : { deletedAt: null }),
  })
    .select("-password -cover")
    .lean();
  if (!item) throw httpError(404, "Note not found");

  const content = typeof item.content === "string" ? item.content : "";
  const chunk = content.slice(
    input.contentOffset,
    input.contentOffset + input.contentLimit,
  );
  const hasMoreContent = input.contentOffset + chunk.length < content.length;
  const pathInfo = await getNotePath(noteId, userId, input.includeDeleted);
  const metaResult = fitMeta(item.meta);

  return {
    ...serializeNote(item),
    ...metaResult,
    ancestors: pathInfo.ancestors,
    path: truncateText(
      [...pathInfo.ancestors.map((entry) => entry.title), item.title]
        .filter(Boolean)
        .join("/"),
      2_000,
    ),
    content: chunk,
    contentOffset: input.contentOffset,
    contentLength: chunk.length,
    totalContentLength: content.length,
    hasMoreContent,
    nextContentOffset: hasMoreContent
      ? input.contentOffset + chunk.length
      : null,
  };
};

/** 批量读取笔记详情：限制单次数量，返回成功与失败分离的结果 */
export const getMcpNotes = async (
  userId: string,
  input: {
    noteIds: string[];
    contentLimit: number;
  },
): Promise<{
  items: McpTypes.McpNoteDetailResult[];
  missingIds: string[];
}> => {
  const uniqueIds = Array.from(new Set(input.noteIds));
  const items = await Note.find({
    _id: { $in: uniqueIds },
    userId,
    deletedAt: null,
  })
    .select("-password -cover")
    .lean();

  const foundById = new Map(items.map((item) => [String(item._id), item]));
  const results = await Promise.all(
    uniqueIds.map(async (noteId) => {
      const item = foundById.get(noteId);
      if (!item) return null;

      const content = typeof item.content === "string" ? item.content : "";
      const chunk = content.slice(0, input.contentLimit);
      const hasMoreContent = chunk.length < content.length;
      const pathInfo = await getNotePath(noteId, userId);
      const metaResult = fitMeta(item.meta);

      return {
        ...serializeNote(item),
        ...metaResult,
        ancestors: pathInfo.ancestors,
        path: truncateText(
          [...pathInfo.ancestors.map((entry) => entry.title), item.title]
            .filter(Boolean)
            .join("/"),
          2_000,
        ),
        content: chunk,
        contentOffset: 0,
        contentLength: chunk.length,
        totalContentLength: content.length,
        hasMoreContent,
        nextContentOffset: hasMoreContent ? chunk.length : null,
      } as McpTypes.McpNoteDetailResult;
    }),
  );

  const found = results.filter(
    (result): result is McpTypes.McpNoteDetailResult => result !== null,
  );
  const missingIds = uniqueIds.filter((noteId) => !foundById.has(noteId));

  return { items: found, missingIds };
};

/** 分页查询回收站笔记，标注可恢复状态 */
export const listMcpTrash = async (
  userId: string,
  input: Pick<ListNotesInput, "limit" | "offset" | "source">,
): Promise<McpTypes.McpPaginationResult<McpTypes.McpTrashNoteResult>> => {
  const filter = {
    userId,
    deletedAt: { $ne: null },
    ...(input.source ? { source: input.source } : {}),
  };
  const [items, total] = await Promise.all([
    Note.find(filter)
      .sort({ deletedAt: -1 })
      .skip(input.offset)
      .limit(input.limit)
      .select("-content -password -cover -meta")
      .lean(),
    Note.countDocuments(filter),
  ]);

  const results = await Promise.all(
    items.map(async (item) => ({
      ...serializeNote(item),
      canRestore: await canRestoreMcpTrashNote(
        userId,
        String(item._id),
        item.parentId,
        item.source,
      ),
    })),
  );

  return paginationResult(fitResponseItems(results), total, input.offset);
};
