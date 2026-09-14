import note from "@/models/note";
import { recalculateHasChildren } from "./update";

const collectDescendantNoteIds = async (
  noteId: string,
  userId: string,
  includeDeleted = false,
) => {
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

export const deleteNote = async (noteId: string, userId: string) => {
  const targetNote = await note
    .findOne({ _id: noteId, userId, deletedAt: null })
    .select("parentId")
    .lean();

  if (!targetNote) return null;

  const deletedAt = new Date();
  const descendantIds = await collectDescendantNoteIds(noteId, userId);
  const targetIds = [noteId, ...descendantIds];

  await note.updateMany(
    { _id: { $in: targetIds }, userId },
    { $set: { deletedAt } },
  );

  await recalculateHasChildren(targetNote.parentId);

  return await note.findById(noteId);
};

export const restoreNote = async (noteId: string, userId: string) => {
  const targetNote = await note
    .findOne({ _id: noteId, userId })
    .select("parentId deletedAt")
    .lean();

  if (!targetNote) return null;

  if (!targetNote.deletedAt) {
    throw Object.assign(new Error("Only trashed notes can be restored"), {
      status: 400,
    });
  }

  if (targetNote.parentId) {
    const parentNote = await note
      .findOne({ _id: targetNote.parentId, userId })
      .select("deletedAt")
      .lean();

    if (!parentNote || parentNote.deletedAt) {
      throw Object.assign(
        new Error("Cannot restore note while its parent is in trash"),
        { status: 400 },
      );
    }
  }

  const descendantIds = await collectDescendantNoteIds(noteId, userId, true);
  const targetIds = [noteId, ...descendantIds];

  await note.updateMany(
    { _id: { $in: targetIds }, userId },
    { $set: { deletedAt: null, expiresAt: null } },
  );

  await recalculateHasChildren(targetNote.parentId);

  return await note.findById(noteId);
};

export const purgeNote = async (noteId: string, userId: string) => {
  const targetNote = await note
    .findOne({ _id: noteId, userId })
    .select("parentId deletedAt")
    .lean();

  if (!targetNote) return null;

  if (!targetNote.deletedAt) {
    throw Object.assign(new Error("Only trashed notes can be purged"), {
      status: 400,
    });
  }

  const descendantIds = await collectDescendantNoteIds(noteId, userId, true);
  const targetIds = [noteId, ...descendantIds];

  await note.deleteMany({ _id: { $in: targetIds }, userId });
  await recalculateHasChildren(targetNote.parentId);

  return { deletedCount: targetIds.length };
};
