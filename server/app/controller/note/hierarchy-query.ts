import note from "@/models/note";
import {
  ACTIVE_NOTE_FILTER,
  DEFAULT_NOTE_TITLE,
  NOTE_LIST_PROJECTION,
  NOTE_QUERY_LIMIT,
} from "./query-config";
import type {
  NoteListDocument,
  NotePathItem,
} from "./query-types";

export const getNoteAncestors = async (
  noteId: string,
  userId: string,
  options: { includeDeleted?: boolean } = {},
): Promise<NotePathItem[]> => {
  const ancestors: NotePathItem[] = [];
  const visitedNoteIds = new Set<string>();
  const visibilityFilter = options.includeDeleted ? {} : ACTIVE_NOTE_FILTER;
  const currentNote = await note
    .findOne({ _id: noteId, userId, ...visibilityFilter })
    .select("parentId")
    .lean();

  if (!currentNote) return ancestors;

  let currentParentId = currentNote.parentId
    ? String(currentNote.parentId)
    : null;

  while (currentParentId && !visitedNoteIds.has(currentParentId)) {
    visitedNoteIds.add(currentParentId);

    const parentNote = await note
      .findOne({ _id: currentParentId, userId, ...visibilityFilter })
      .select("title parentId")
      .lean();

    if (!parentNote) break;

    ancestors.unshift({
      _id: String(parentNote._id),
      title: parentNote.title || DEFAULT_NOTE_TITLE,
    });
    currentParentId = parentNote.parentId
      ? String(parentNote.parentId)
      : null;
  }

  return ancestors;
};

export const getDirectChildren = async (
  parentId: string,
  userId: string,
): Promise<NoteListDocument[]> => {
  return await note
    .find({ parentId, userId, ...ACTIVE_NOTE_FILTER })
    .sort({ createdAt: -1 })
    .limit(NOTE_QUERY_LIMIT)
    .select(NOTE_LIST_PROJECTION);
};

export const validateNoteMoveTarget = async ({
  noteId,
  parentId,
  userId,
}: {
  noteId: string;
  parentId?: string | null;
  userId: string;
}): Promise<boolean> => {
  if (!parentId) return true;
  if (parentId === noteId) return false;

  const targetNote = await note
    .findOne({ _id: parentId, userId, ...ACTIVE_NOTE_FILTER })
    .select("parentId")
    .lean();

  if (!targetNote) return false;

  const visitedNoteIds = new Set<string>();
  let currentParentId = targetNote.parentId
    ? String(targetNote.parentId)
    : null;

  while (currentParentId) {
    if (
      currentParentId === noteId ||
      visitedNoteIds.has(currentParentId)
    ) {
      return false;
    }

    visitedNoteIds.add(currentParentId);
    const parentNote = await note
      .findOne({ _id: currentParentId, userId, ...ACTIVE_NOTE_FILTER })
      .select("parentId")
      .lean();

    if (!parentNote) return false;
    currentParentId = parentNote.parentId
      ? String(parentNote.parentId)
      : null;
  }

  return true;
};
