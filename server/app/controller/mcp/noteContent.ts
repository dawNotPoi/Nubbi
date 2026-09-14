import Note from "@/models/note";
import { assertAgentNote } from "@/controller/note/access";
import { httpError, serializeNote, toIsoString } from "./shared";
import type { McpContentNoteResult } from "./types";

export type ContentEditInput = {
  mode: "replace" | "append" | "prepend" | "replace_text";
  baseContentRevision: number;
  content?: string;
  oldText?: string;
  newText?: string;
};

const replaceUniqueText = (
  content: string,
  oldText: string,
  newText: string,
  contentRevision: number,
): string => {
  const firstIndex = content.indexOf(oldText);
  const secondIndex =
    firstIndex < 0 ? -1 : content.indexOf(oldText, firstIndex + 1);
  const matchCount = firstIndex < 0 ? 0 : secondIndex < 0 ? 1 : 2;
  if (matchCount !== 1) {
    throw httpError(
      409,
      matchCount === 0
        ? "oldText was not found; read the note and retry"
        : "oldText matched more than once; provide a unique passage",
      { matchCount, contentRevision },
    );
  }
  return `${content.slice(0, firstIndex)}${newText}${content.slice(
    firstIndex + oldText.length,
  )}`;
};

const buildContent = (
  current: string,
  input: ContentEditInput,
  contentRevision: number,
): string => {
  if (input.mode === "replace_text") {
    return replaceUniqueText(
      current,
      input.oldText ?? "",
      input.newText ?? "",
      contentRevision,
    );
  }
  const content = input.content ?? "";
  if (input.mode === "append") return `${current}${content}`;
  if (input.mode === "prepend") return `${content}${current}`;
  return content;
};

export const editMcpNoteContent = async (
  userId: string,
  noteId: string,
  input: ContentEditInput,
): Promise<McpContentNoteResult> => {
  const access = await assertAgentNote(userId, noteId);
  const item = await Note.findOne({
    _id: noteId,
    userId,
    source: "agent",
    deletedAt: null,
  })
    .select("content contentRevision updatedAt")
    .lean();
  if (!item) throw httpError(404, "Note not found");

  const currentRevision = item.contentRevision ?? 0;
  if (input.baseContentRevision !== currentRevision) {
    throw httpError(409, "Content revision conflict; read the note and retry", {
      contentRevision: currentRevision,
      updatedAt: toIsoString(item.updatedAt),
    });
  }

  const nextContent = buildContent(item.content ?? "", input, currentRevision);
  const revisionFilter =
    access.contentRevision === 0
      ? { $or: [{ contentRevision: 0 }, { contentRevision: { $exists: false } }] }
      : { contentRevision: access.contentRevision };
  const updated = await Note.findOneAndUpdate(
    {
      _id: noteId,
      userId,
      source: "agent",
      deletedAt: null,
      ...revisionFilter,
    },
    { $set: { content: nextContent }, $inc: { contentRevision: 1 } },
    { new: true },
  );

  if (!updated) {
    const current = await Note.findOne({ _id: noteId, userId })
      .select("contentRevision updatedAt")
      .lean();
    throw httpError(409, "Content revision conflict; read the note and retry", {
      contentRevision: current?.contentRevision ?? null,
      updatedAt: toIsoString(current?.updatedAt),
    });
  }

  return {
    ...serializeNote(updated),
    contentLength: nextContent.length,
  };
};
