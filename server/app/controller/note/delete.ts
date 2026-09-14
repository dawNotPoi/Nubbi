import { httpError } from "@/common/http-error";
import note, { type NoteDocument } from "@/models/note";
import notePurgeTask from "@/models/notePurgeTask";
import { completePendingNotePurge } from "@/services/note/purge";
import { assertNotesNotPendingPurge } from "./access";
import { recalculateHasChildren } from "./structure-update";

export const collectDescendantNoteIds = async (
  noteId: string,
  userId: string,
  includeDeleted = false,
): Promise<string[]> => {
  const descendantIds: string[] = [];
  const visitedIds = new Set([noteId]);
  let parentIds = [noteId];

  while (parentIds.length > 0) {
    const children = await note
      .find({
        parentId: { $in: parentIds },
        userId,
        ...(includeDeleted ? {} : { deletedAt: null }),
      })
      .select("_id")
      .lean();

    parentIds = children
      .map((child) => String(child._id))
      .filter((childId) => {
        if (visitedIds.has(childId)) return false;
        visitedIds.add(childId);
        return true;
      });
    descendantIds.push(...parentIds);
  }

  return descendantIds;
};

const deleteNoteRecord = async (
  noteId: string,
  userId: string,
): Promise<NoteDocument | null> => {
  const targetNote = await note
    .findOne({ _id: noteId, userId, deletedAt: null })
    .select("parentId")
    .lean();

  if (!targetNote) throw httpError(404, "Note not found");

  const deletedAt = new Date();
  const descendantIds = await collectDescendantNoteIds(noteId, userId);
  const targetIds = [noteId, ...descendantIds];

  await note.updateMany(
    { _id: { $in: targetIds }, userId },
    { $set: { deletedAt } },
  );

  await recalculateHasChildren(targetNote.parentId, userId);

  return await note.findOne({ _id: noteId, userId });
};

export const deleteNote = async (
  noteId: string,
  userId: string,
): Promise<NoteDocument | null> =>
  deleteNoteRecord(noteId, userId);

const restoreNoteRecord = async (
  noteId: string,
  userId: string,
): Promise<NoteDocument | null> => {
  const targetNote = await note
    .findOne({ _id: noteId, userId })
    .select("parentId deletedAt")
    .lean();

  if (!targetNote) throw httpError(404, "Note not found");

  if (!targetNote.deletedAt) {
    throw httpError(400, "Only trashed notes can be restored");
  }

  if (targetNote.parentId) {
    const parentNote = await note
      .findOne({ _id: targetNote.parentId, userId })
      .select("deletedAt")
      .lean();

    if (!parentNote || parentNote.deletedAt) {
      throw httpError(
        400,
        "Cannot restore note while its parent is in trash",
      );
    }
  }

  const descendantIds = await collectDescendantNoteIds(noteId, userId, true);
  const targetIds = [noteId, ...descendantIds];
  await assertNotesNotPendingPurge(userId, targetIds);

  await note.updateMany(
    { _id: { $in: targetIds }, userId },
    { $set: { deletedAt: null, expiresAt: null } },
  );

  await recalculateHasChildren(targetNote.parentId, userId);

  return await note.findOne({ _id: noteId, userId });
};

export const restoreNote = async (
  noteId: string,
  userId: string,
): Promise<NoteDocument | null> =>
  restoreNoteRecord(noteId, userId);

const purgeNoteRecord = async (
  noteId: string,
  userId: string,
): Promise<{ deletedCount: number }> => {
  let task = await notePurgeTask.findOne({
    userId,
    rootNoteId: noteId,
  });

  if (!task) {
    const targetNote = await note
      .findOne({ _id: noteId, userId })
      .select("parentId deletedAt")
      .lean();

    if (!targetNote) throw httpError(404, "Note not found");
    if (!targetNote.deletedAt) {
      throw httpError(400, "Only trashed notes can be purged");
    }

    const descendantIds = await collectDescendantNoteIds(
      noteId,
      userId,
      true,
    );
    task = await notePurgeTask.findOneAndUpdate(
      { userId, rootNoteId: noteId },
      {
        $setOnInsert: {
          userId,
          rootNoteId: noteId,
          targetIds: [noteId, ...descendantIds],
          parentId: targetNote.parentId,
        },
      },
      { new: true, upsert: true },
    );
  }
  if (!task) throw httpError(500, "Failed to prepare note purge");

  const result = await completePendingNotePurge(userId, noteId);
  if (!result) throw httpError(500, "Failed to find note purge task");
  return result;
};

export const purgeNote = async (
  noteId: string,
  userId: string,
): Promise<{ deletedCount: number }> =>
  purgeNoteRecord(noteId, userId);
