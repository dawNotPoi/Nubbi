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

export const getNoteById = async (
  id: string,
  userId: string,
): Promise<NoteDocument | null> => {
  return await note.findOne({ _id: id, userId, ...ACTIVE_NOTE_FILTER });
};

export const getRootNotes = async (
  userId: string,
): Promise<NoteListDocument[]> => {
  return await note
    .find({ parentId: null, userId, ...ACTIVE_NOTE_FILTER })
    .sort({ createdAt: -1 })
    .limit(NOTE_QUERY_LIMIT)
    .select(NOTE_LIST_PROJECTION);
};

export const getAllNotes = async (
  userId: string,
): Promise<NoteListDocument[]> => {
  return await note
    .find({ userId, ...ACTIVE_NOTE_FILTER })
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(NOTE_QUERY_LIMIT)
    .select(NOTE_LIST_PROJECTION);
};

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
