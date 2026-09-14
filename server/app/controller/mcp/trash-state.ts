import {
  assertNotesNotPendingPurge,
  assertPureAgentSubtree,
} from "@/controller/note/access";
import { collectDescendantNoteIds } from "@/controller/note/delete";
import Note from "@/models/note";

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
