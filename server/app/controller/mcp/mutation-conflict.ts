import Note from "@/models/note";
import { httpError, toIsoString } from "./shared";

export const throwMcpUpdateConflict = async (
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
