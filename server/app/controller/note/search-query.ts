import { buildPaginationResult, type PaginationInput, type PaginationResult } from "@/common/pagination";
import note, { type NoteEntity } from "@/models/note";
import {
  ACTIVE_NOTE_FILTER,
  DEFAULT_NOTE_TITLE,
  NOTE_LIST_PROJECTION,
} from "./query-config";
import type { NoteSearchItem } from "./query-types";

/** 父笔记的路径信息（用于构造面包屑） */
type ParentInfo = {
  title: string;
  parentId: string | null;
};

/** 转义正则表达式特殊字符 */
const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** @param userId 账号。@param title 标题查询。@param pagination 分页参数。@returns 带祖先标签的当前页。 */
export const searchNotes = async (
  userId: string,
  title: string,
  pagination: PaginationInput,
): Promise<PaginationResult<NoteSearchItem>> => {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return buildPaginationResult([], 0, pagination);

  const filter = {
      userId,
      title: { $regex: escapeRegExp(normalizedTitle), $options: "i" },
      ...ACTIVE_NOTE_FILTER,
  };
  const [result, total] = await Promise.all([
    note.find(filter).sort({ createdAt: -1, _id: -1 })
      .skip(pagination.offset).limit(pagination.limit).select(NOTE_LIST_PROJECTION).lean(),
    note.countDocuments(filter),
  ]);
  const noteCache = new Map<string, ParentInfo>();

  const getParentInfo = async (noteId: string): Promise<ParentInfo> => {
    const cached = noteCache.get(noteId);
    if (cached) return cached;

    const parentNote = await note
      .findOne({ _id: noteId, userId, ...ACTIVE_NOTE_FILTER })
      .select("title parentId")
      .lean();
    const parentInfo: ParentInfo = {
      title: parentNote?.title || DEFAULT_NOTE_TITLE,
      parentId: parentNote?.parentId ? String(parentNote.parentId) : null,
    };
    noteCache.set(noteId, parentInfo);
    return parentInfo;
  };

  const buildPathLabel = async (
    parentId?: NoteEntity["parentId"] | string | null,
  ): Promise<string> => {
    if (!parentId) return "";

    const titles: string[] = [];
    const visitedParentIds = new Set<string>();
    let currentParentId: string | null = String(parentId);

    while (
      currentParentId &&
      !visitedParentIds.has(currentParentId)
    ) {
      visitedParentIds.add(currentParentId);
      const parentInfo = await getParentInfo(currentParentId);
      titles.unshift(parentInfo.title);
      currentParentId = parentInfo.parentId;
    }

    if (titles.length <= 2) return titles.join("/");
    return [titles[0], "...", titles[titles.length - 1]].join("/");
  };

  const items = await Promise.all(
    result.map(async (item) => ({
      ...item,
      pathLabel: await buildPathLabel(item.parentId),
    })),
  );
  return buildPaginationResult(items, total, pagination);
};
