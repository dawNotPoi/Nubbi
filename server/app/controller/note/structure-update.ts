import { httpError } from "@/common/http-error";
import mongoose from "@/lib/db";
import note, {
  type NoteDocument,
} from "@/models/note";
import { recalculateHasChildren } from "@/services/note/structure";
import type { ClientSession } from "mongoose";
import type { NormalizedNoteProperties } from "./note-properties";

export { recalculateHasChildren };

const isTransactionUnsupported = (error: unknown): boolean =>
  error instanceof Error &&
  /Transaction numbers|replica set|Transaction.*not supported/i.test(
    error.message,
  );

const runWithOptionalTransaction = async <T>(
  task: (session?: ClientSession) => Promise<T>,
): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await task(session);
    });
    return result as T;
  } catch (error) {
    if (isTransactionUnsupported(error)) return await task();
    throw error;
  } finally {
    await session.endSession();
  }
};

/** 移动笔记并同步维护新旧父节点的 hasChildren 状态。 */
export const moveNote = async (
  userId: string,
  noteId: string,
  newParentId?: string | null,
  propertiesToUpdate: Omit<NormalizedNoteProperties, "parentId"> = {},
): Promise<NoteDocument> => {
  return await runWithOptionalTransaction(async (session) => {
    if (newParentId) {
      const parentNote = await note
        .findOne({ _id: newParentId, userId, deletedAt: null })
        .select("_id")
        .session(session ?? null)
        .lean();

      if (!parentNote) throw httpError(404, "Parent note not found");
    }

    const existingNote = await note
      .findOne({ _id: noteId, userId, deletedAt: null })
      .select("parentId")
      .session(session ?? null);

    if (!existingNote) throw httpError(404, "Note not found");

    const oldParentId = existingNote.parentId;
    const updatedNote = await note.findOneAndUpdate(
      { _id: noteId, userId },
      { $set: { ...propertiesToUpdate, parentId: newParentId || null } },
      { new: true, session },
    );

    if (!updatedNote) throw httpError(404, "Note not found");

    await recalculateHasChildren(oldParentId, userId, session);

    if (newParentId) {
      await note.findOneAndUpdate(
        { _id: newParentId, userId },
        { $set: { hasChildren: true } },
        { session },
      );
    }

    return updatedNote;
  });
};
