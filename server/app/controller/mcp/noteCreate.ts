import { createNote } from "@/controller/note/create";
import { syncUserTags } from "@/controller/tag";
import Note from "@/models/note";
import { httpError, serializeNote } from "./shared";

export type CreateMcpNoteInput = {
  title?: string;
  content?: string;
  parentId?: string | null;
  author?: string | null;
  tags?: string[];
  date?: Date;
  meta?: Array<{ key: string; value?: unknown; type: string }> | Record<string, unknown>;
};

export const createMcpNote = async (
  userId: string,
  input: CreateMcpNoteInput,
) => {
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

  const created = await createNote({
    ...input,
    userId,
    source: "agent",
    status: "inbox",
  });
  await syncUserTags(userId, input.tags);

  return {
    ...serializeNote(created),
    contentLength: created.content.length,
  };
};
