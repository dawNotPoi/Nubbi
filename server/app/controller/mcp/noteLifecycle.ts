import {
  assertAgentNote,
  assertNotesNotPendingPurge,
  assertPureAgentSubtree,
} from "@/controller/note/access";
import { collectDescendantNoteIds } from "@/controller/note/delete";
import { validateNoteMoveTarget } from "@/controller/note/hierarchy-query";
import { recalculateHasChildren } from "@/controller/note/structure-update";
import Note from "@/models/note";
import {
  assertExpectedDate,
  httpError,
  serializeNote,
} from "./shared";
import type { McpAffectedNoteResult, McpNoteResult } from "./types";
import { throwMcpUpdateConflict } from "./mutation-conflict";

/** 移动 Agent 笔记：校验目标合法性和纯 Agent 子树后更新父节点 */
const moveMcpNoteRecord = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt: string; parentId: string | null },
): Promise<McpNoteResult> => {
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
  if (!updated) return throwMcpUpdateConflict(userId, noteId);

  await recalculateHasChildren(access.parentId, userId);
  if (input.parentId) {
    await Note.findOneAndUpdate(
      { _id: input.parentId, userId },
      { $set: { hasChildren: true } },
    );
  }
  return serializeNote(updated);
};

/** 移动 Agent 笔记的对外入口 */
export const moveMcpNote = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt: string; parentId: string | null },
): Promise<McpNoteResult> =>
  moveMcpNoteRecord(userId, noteId, input);

/** 切换 Agent 笔记的归档状态 */
export const archiveMcpNote = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt: string; archived: boolean },
): Promise<McpNoteResult> => {
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
  if (!updated) return throwMcpUpdateConflict(userId, noteId);
  return serializeNote(updated);
};

/** 将 Agent 笔记及其子树移入回收站 */
const trashMcpNoteRecord = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt?: string },
): Promise<McpAffectedNoteResult> => {
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
  if (!updated) return throwMcpUpdateConflict(userId, noteId);
  await Note.updateMany(
    {
      _id: { $in: descendantIds },
      userId,
      source: "agent",
      deletedAt: null,
    },
    { $set: { deletedAt } },
  );
  await recalculateHasChildren(access.parentId, userId);
  return { ...serializeNote(updated), affectedCount: targetIds.length };
};

/** 将 Agent 笔记移入回收站的对外入口 */
export const trashMcpNote = async (
  userId: string,
  noteId: string,
  input: { expectedUpdatedAt?: string },
): Promise<McpAffectedNoteResult> =>
  trashMcpNoteRecord(userId, noteId, input);

/** 恢复回收站中的 Agent 笔记及其子树 */
const restoreMcpNoteRecord = async (
  userId: string,
  noteId: string,
  input: { deletedAt?: string },
): Promise<McpAffectedNoteResult> => {
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
  await assertNotesNotPendingPurge(userId, targetIds);
  await Note.updateMany(
    { _id: { $in: targetIds }, userId, source: "agent" },
    { $set: { deletedAt: null, expiresAt: null } },
  );
  await recalculateHasChildren(access.parentId, userId);
  const updated = await Note.findOne({ _id: noteId, userId });
  if (!updated) throw httpError(404, "Note not found");
  return { ...serializeNote(updated), affectedCount: targetIds.length };
};

/** 恢复 Agent 笔记的对外入口 */
export const restoreMcpNote = async (
  userId: string,
  noteId: string,
  input: { deletedAt?: string },
): Promise<McpAffectedNoteResult> =>
  restoreMcpNoteRecord(userId, noteId, input);
