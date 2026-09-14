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

export type ListNotesInput = {
  limit: number;
  offset: number;
  parentId?: string | null;
  source?: "user" | "agent";
  status?: "inbox" | "active" | "archived";
  tag?: string;
};

const buildActiveFilter = (userId: string, input: ListNotesInput) => ({
  userId,
  deletedAt: null,
  ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
  ...(input.source ? { source: input.source } : {}),
  ...(input.status ? { status: input.status } : {}),
  ...(input.tag ? { tags: input.tag } : {}),
});

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

export type SearchNotesInput = Omit<ListNotesInput, "parentId"> & {
  query: string;
};

const createExcerpt = (content: string, query: string): string => {
  const index = content.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) return content.slice(0, 240);
  const start = Math.max(0, index - 80);
  const end = Math.min(content.length, index + query.length + 160);
  return `${start > 0 ? "…" : ""}${content.slice(start, end)}${
    end < content.length ? "…" : ""
  }`;
};

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
