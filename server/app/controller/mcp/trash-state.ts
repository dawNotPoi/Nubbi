import {
  assertNotesNotPendingPurge,
  assertPureAgentSubtree,
} from "@/controller/note/access";
import { collectDescendantNoteIds } from "@/controller/note/delete";
import Note from "@/models/note";

/** 判断回收站中的 Agent 笔记是否可恢复（纯 Agent 子树、无待删除任务、父节点有效） */
export const canRestoreMcpTrashNote = async (
  userId: string,
  noteId: string,
  parentId: unknown,
  source: unknown,
): Promise<boolean> => {
  if (source !== "agent") return false;

  try {
    await assertPureAgentSubtree(userId, noteId, true);
    const descendantIds = await collectDescendantNoteIds(
      noteId,
      userId,
      true,
    );
    await assertNotesNotPendingPurge(userId, [noteId, ...descendantIds]);
    if (!parentId) return true;

    const parent = await Note.exists({
      _id: parentId,
      userId,
      deletedAt: null,
    });
    return Boolean(parent);
  } catch {
    return false;
  }
};
