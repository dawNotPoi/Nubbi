import { httpError } from "@/common/http-error";
import Note from "@/models/note";
import NotePurgeTask from "@/models/notePurgeTask";

export type NoteAccessSnapshot = {
  id: string;
  source: "user" | "agent";
  parentId: string | null;
  contentRevision: number;
  updatedAt: Date | null;
  deletedAt: Date | null;
};

export const getOwnedNoteSnapshot = async (
  userId: string,
  noteId: string,
  includeDeleted = false,
): Promise<NoteAccessSnapshot> => {
  const item = await Note.findOne({
    _id: noteId,
    userId,
    ...(includeDeleted ? {} : { deletedAt: null }),
  })
    .select("source parentId contentRevision updatedAt deletedAt")
    .lean();

  if (!item) throw httpError(404, "Note not found");

  return {
    id: String(item._id),
    source: item.source === "agent" ? "agent" : "user",
    parentId: item.parentId ? String(item.parentId) : null,
    contentRevision: item.contentRevision ?? 0,
    updatedAt: item.updatedAt ?? null,
    deletedAt: item.deletedAt ?? null,
  };
};

export const assertOwnedNote = getOwnedNoteSnapshot;

export const assertNotesNotPendingPurge = async (
  userId: string,
  noteIds: readonly string[],
): Promise<void> => {
  const pendingPurge = await NotePurgeTask.exists({
    userId,
    targetIds: { $in: noteIds },
  });
  if (pendingPurge) {
    throw httpError(409, "Note purge is still in progress");
  }
};

export const assertAgentNote = async (
  userId: string,
  noteId: string,
  includeDeleted = false,
): Promise<NoteAccessSnapshot> => {
  const item = await getOwnedNoteSnapshot(userId, noteId, includeDeleted);
  if (item.source !== "agent") {
    throw httpError(403, "MCP Agent keys can only modify Agent notes");
  }
  return item;
};

export const assertPureAgentSubtree = async (
  userId: string,
  noteId: string,
  includeDeleted = false,
): Promise<NoteAccessSnapshot> => {
  const root = await assertAgentNote(userId, noteId, includeDeleted);
  const visited = new Set([noteId]);
  let parentIds = [noteId];

  while (parentIds.length > 0) {
    const children = await Note.find({
      userId,
      parentId: { $in: parentIds },
      ...(includeDeleted ? {} : { deletedAt: null }),
    })
      .select("_id source")
      .lean();

    const userChild = children.find((child) => child.source !== "agent");
    if (userChild) {
      throw httpError(
        409,
        "This Agent note contains user-authored descendants and cannot be changed as a subtree",
        { conflictingNoteId: String(userChild._id) },
      );
    }

    parentIds = children
      .map((child) => String(child._id))
      .filter((id) => {
        if (visited.has(id)) return false;
        visited.add(id);
        return true;
      });
  }

  return root;
};
