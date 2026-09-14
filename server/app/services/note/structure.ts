import note, { type NoteEntity } from "@/models/note";
import type { ClientSession } from "mongoose";

/** 重新计算父笔记是否还存在未删除的直属子笔记。 */
export const recalculateHasChildren = async (
  parentId: NoteEntity["parentId"] | string | null | undefined,
  userId: string,
  session?: ClientSession,
): Promise<void> => {
  if (!parentId) return;

  const childCount = await note
    .countDocuments({ parentId, userId, deletedAt: null })
    .session(session ?? null);

  await note.findOneAndUpdate(
    { _id: parentId, userId },
    { $set: { hasChildren: childCount > 0 } },
    { session },
  );
};
