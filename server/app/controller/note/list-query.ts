import {
  buildPaginationResult,
  type PaginationInput,
} from "@/common/pagination";
import note, { type NoteDocument } from "@/models/note";
import {
  ACTIVE_NOTE_FILTER,
  NOTE_LIST_PROJECTION,
  NOTE_QUERY_LIMIT,
} from "./query-config";
import type {
  NoteListDocument,
  NotePaginationResult,
} from "./query-types";

/** 按 ID 查询活跃笔记 */
export const getNoteById = async (
  id: string,
  userId: string,
): Promise<NoteDocument | null> => {
  return await note.findOne({ _id: id, userId, ...ACTIVE_NOTE_FILTER });
};

/** 查询根节点笔记（无父节点），按创建时间倒序 */
export const getRootNotes = async (
  userId: string,
): Promise<NoteListDocument[]> => {
  return await note
    .find({ parentId: null, userId, ...ACTIVE_NOTE_FILTER })
    .sort({ createdAt: -1 })
    .limit(NOTE_QUERY_LIMIT)
    .select(NOTE_LIST_PROJECTION);
};

/** 查询用户全部笔记，按更新时间倒序 */
export const getAllNotes = async (
  userId: string,
): Promise<NoteListDocument[]> => {
  return await note
    .find({ userId, ...ACTIVE_NOTE_FILTER })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(NOTE_QUERY_LIMIT)
    .select(NOTE_LIST_PROJECTION);
};

/** 查询叶子节点笔记（无子节点），供列表展示 */
export const getNotes = async (
  userId: string,
): Promise<NoteListDocument[]> => {
  return await note
    .find({
      userId,
      hasChildren: false,
      ...ACTIVE_NOTE_FILTER,
    })
    .limit(NOTE_QUERY_LIMIT)
    .select(NOTE_LIST_PROJECTION);
};

/** 查询最近更新的叶子节点笔记 */
export const getRecentNotes = async (
  userId: string,
): Promise<NoteListDocument[]> => {
  return await note
    .find({
      userId,
      hasChildren: false,
      ...ACTIVE_NOTE_FILTER,
    })
    .sort({ updatedAt: -1 })
    .limit(NOTE_QUERY_LIMIT)
    .select(NOTE_LIST_PROJECTION);
};

/** 分页查询回收站笔记 */
export const getTrashNotes = async (
  userId: string,
  pagination: PaginationInput,
): Promise<NotePaginationResult> => {
  const filter = { userId, deletedAt: { $ne: null } };
  const [items, total] = await Promise.all([
    note
      .find(filter)
      .sort({ deletedAt: -1, _id: -1 })
      .skip(pagination.offset)
      .limit(pagination.limit)
      .select(NOTE_LIST_PROJECTION),
    note.countDocuments(filter),
  ]);

  return buildPaginationResult(items, total, pagination);
};
