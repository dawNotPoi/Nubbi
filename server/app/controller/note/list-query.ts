import { buildPaginationResult, type PaginationInput } from "@/common/pagination";
import note, { type NoteDocument, type NoteEntity } from "@/models/note";
import type { FilterQuery } from "mongoose";
import type { NoteListQuery } from "@/routes/note/schemas";
import { ACTIVE_NOTE_FILTER, NOTE_LIST_PROJECTION } from "./query-config";
import type { NotePaginationResult } from "./query-types";

/** @param id 笔记 ID。@param userId 已认证账号。@returns 当前账号的活跃笔记，不存在返回 null。 */
export const getNoteById = async (id: string, userId: string): Promise<NoteDocument | null> =>
  note.findOne({ _id: id, userId, ...ACTIVE_NOTE_FILTER });

/**
 * 在数据库中先过滤后分页，保留账号隔离与删除过滤。
 * @param userId 已认证账号。
 * @param input 已校验的查询参数。
 * @param scope 路由指定的层级条件。
 * @param defaultOrder 未指定排序时沿用入口顺序。
 * @returns 不含正文的标准分页。
 */
export async function queryNotePage(
  userId: string,
  input: NoteListQuery,
  scope: FilterQuery<NoteEntity> = {},
  defaultOrder: "newest" | "updated" = "newest",
): Promise<NotePaginationResult> {
  const filter: FilterQuery<NoteEntity> = { ...scope, userId, ...ACTIVE_NOTE_FILTER };
  if (input.published !== undefined) filter.published = input.published;
  if (input.hasPassword !== undefined) {
    filter.password = input.hasPassword ? { $nin: [null, ""] } : { $in: [null, ""] };
  }
  if (input.tag) filter.tags = input.tag;
  if (input.q) {
    const search = new RegExp(input.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: search }, { tags: search }];
  }
  const order = input.order || defaultOrder;
  const direction = order === "oldest" ? 1 : -1;
  const [items, total] = await Promise.all([
    note.find(filter).select(NOTE_LIST_PROJECTION)
      .sort(order === "updated" ? { updatedAt: -1, createdAt: -1, _id: -1 } : { createdAt: direction, _id: direction })
      .skip(input.offset).limit(input.limit),
    note.countDocuments(filter),
  ]);
  return buildPaginationResult(items, total, input);
}

/** @param userId 账号。@param input 分页筛选。@returns 根笔记分页。 */
export const getRootNotes = (userId: string, input: NoteListQuery): Promise<NotePaginationResult> =>
  queryNotePage(userId, input, { parentId: null });

/** @param userId 账号。@param input 分页筛选。@returns 活跃笔记的当前页。 */
export const getAllNotes = (userId: string, input: NoteListQuery): Promise<NotePaginationResult> =>
  queryNotePage(userId, input, {}, "updated");

/** @param userId 账号。@param input 分页筛选。@returns 叶子笔记分页。 */
export const getNotes = (userId: string, input: NoteListQuery): Promise<NotePaginationResult> =>
  queryNotePage(userId, input, { hasChildren: false });

/** @param userId 账号。@param input 分页筛选。@returns 最近更新的叶子笔记分页。 */
export const getRecentNotes = (userId: string, input: NoteListQuery): Promise<NotePaginationResult> =>
  queryNotePage(userId, input, { hasChildren: false }, "updated");

/** @param userId 账号。@param pagination 分页参数。@returns 回收站分页。 */
export const getTrashNotes = async (userId: string, pagination: PaginationInput): Promise<NotePaginationResult> => {
  const filter = { userId, deletedAt: { $ne: null } };
  const [items, total] = await Promise.all([
    note.find(filter).sort({ deletedAt: -1, _id: -1 })
      .skip(pagination.offset).limit(pagination.limit).select(NOTE_LIST_PROJECTION),
    note.countDocuments(filter),
  ]);
  return buildPaginationResult(items, total, pagination);
};
