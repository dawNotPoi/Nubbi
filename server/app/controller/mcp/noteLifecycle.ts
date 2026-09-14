import {
  assertAgentNote,
  assertPureAgentSubtree,
} from "@/controller/note/access";
import { collectDescendantNoteIds } from "@/controller/note/delete";
import { validateNoteMoveTarget } from "@/controller/note/query";
import { recalculateHasChildren } from "@/controller/note/update";
import { withNoteStructureLock } from "@/controller/note/structureLock";
import Note from "@/models/note";
import {
  assertExpectedDate,
  httpError,
  serializeNote,
  toIsoString,
} from "./shared";

const throwUpdateConflict = async (
  userId: string,
  noteId: string,
): Promise<never> => {
  const current = await Note.findOne({ _id: noteId, userId })
    .select("updatedAt deletedAt")
    .lean();
  throw httpError(409, "Note was changed; read it again and retry", {
    updatedAt: toIsoString(current?.updatedAt),
    deletedAt: toIsoString(current?.deletedAt),
  });
};

const moveMcpNoteUnlocked = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt: string; parentId: string | null },
) => {
  const access = await assertAgentNote(userId, noteId);
  await assertPureAgentSubtree(userId, noteId, true);
  assertExpectedDate(input.expectedUpdatedAt, access.updatedAt);

  if (input.parentId) {
    const parent = await Note.findOne({
      _id: input.parentId,
      userId,
      deletedAt: null,
    })
      .select("_id")
      .lean();
    if (!parent) throw httpError(404, "Parent note not found");
  }
  const validTarget = await validateNoteMoveTarget({
    noteId,
    parentId: input.parentId,
    userId,
  });
  if (!validTarget) {
    throw httpError(400, "Cannot move a note to itself or its descendant");
  }

  const updated = await Note.findOneAndUpdate(
    {
      _id: noteId,
      userId,
      source: "agent",
      deletedAt: null,
      updatedAt: access.updatedAt,
    },
    { $set: { parentId: input.parentId } },
    { new: true },
  );
  if (!updated) return throwUpdateConflict(userId, noteId);

  await recalculateHasChildren(access.parentId);
  if (input.parentId) {
    await Note.findByIdAndUpdate(input.parentId, { $set: { hasChildren: true } });
  }
  return serializeNote(updated);
};

export const moveMcpNote = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt: string; parentId: string | null },
) =>
  withNoteStructureLock(userId, () =>
    moveMcpNoteUnlocked(userId, noteId, input),
  );

export const archiveMcpNote = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt: string; archived: boolean },
) => {
  const access = await assertAgentNote(userId, noteId);
  assertExpectedDate(input.expectedUpdatedAt, access.updatedAt);
  const updated = await Note.findOneAndUpdate(
    {
      _id: noteId,
      userId,
      source: "agent",
      deletedAt: null,
      updatedAt: access.updatedAt,
    },
    { $set: { status: input.archived ? "archived" : "active" } },
    { new: true },
  );
  if (!updated) return throwUpdateConflict(userId, noteId);
  return serializeNote(updated);
};

const trashMcpNoteUnlocked = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt?: string },
) => {
  const access = await assertAgentNote(userId, noteId);
  await assertPureAgentSubtree(userId, noteId, true);
  if (input.expectedUpdatedAt) {
    assertExpectedDate(input.expectedUpdatedAt, access.updatedAt);
  }
  const descendantIds = await collectDescendantNoteIds(noteId, userId);
  const targetIds = [noteId, ...descendantIds];
  const deletedAt = new Date();
  const updated = await Note.findOneAndUpdate(
    {
      _id: noteId,
      userId,
      source: "agent",
      deletedAt: null,
      ...(input.expectedUpdatedAt ? { updatedAt: access.updatedAt } : {}),
    },
    { $set: { deletedAt } },
    { new: true },
  );
  if (!updated) return throwUpdateConflict(userId, noteId);
  await Note.updateMany(
    {
      _id: { $in: descendantIds },
      userId,
      source: "agent",
      deletedAt: null,
    },
    { $set: { deletedAt } },
  );
  await recalculateHasChildren(access.parentId);
  return { ...serializeNote(updated), affectedCount: targetIds.length };
};

export const trashMcpNote = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt?: string },
) =>
  withNoteStructureLock(userId, () =>
    trashMcpNoteUnlocked(userId, noteId, input),
  );

const restoreMcpNoteUnlocked = async (
  userId: string,
  noteId: string,
  input: { deletedAt?: string },
) => {
  const access = await assertPureAgentSubtree(userId, noteId, true);
  if (!access.deletedAt) throw httpError(400, "Only trashed notes can be restored");
  if (input.deletedAt) {
    assertExpectedDate(input.deletedAt, access.deletedAt, "deletedAt");
  }
  if (access.parentId) {
    const parent = await Note.findOne({
      _id: access.parentId,
      userId,
      deletedAt: null,
    }).select("_id");
    if (!parent) {
      throw httpError(409, "Restore the parent note before restoring this note");
    }
  }

  const descendantIds = await collectDescendantNoteIds(noteId, userId, true);
  const targetIds = [noteId, ...descendantIds];
  await Note.updateMany(
    { _id: { $in: targetIds }, userId, source: "agent" },
    { $set: { deletedAt: null, expiresAt: null } },
  );
  await recalculateHasChildren(access.parentId);
  const updated = await Note.findById(noteId);
  if (!updated) throw httpError(404, "Note not found");
  return { ...serializeNote(updated), affectedCount: targetIds.length };
};

export const restoreMcpNote = async (
  userId: string,
  noteId: string,
  input: { deletedAt?: string },
) =>
  withNoteStructureLock(userId, () =>
    restoreMcpNoteUnlocked(userId, noteId, input),
  );
