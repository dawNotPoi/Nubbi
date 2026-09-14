import { httpError } from "@/common/http-error";
import { assertOwnedNote } from "@/controller/note/access";
import summary, { type SummaryDocument } from "@/models/summary";

export type CreateSummaryInput = {
  content: string;
  noteId: string;
};

export type FindSummaryInput = {
  noteId: string;
};

export const createSummary = async (
  userId: string,
  input: CreateSummaryInput,
): Promise<SummaryDocument> => {
  await assertOwnedNote(userId, input.noteId);

  const item = await summary.findOneAndUpdate(
    { noteId: input.noteId },
    { $set: { content: input.content } },
    {
      new: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      upsert: true,
    },
  );

  if (!item) throw httpError(500, "摘要保存失败");
  return item;
};

export const findSummary = async (
  userId: string,
  input: FindSummaryInput,
): Promise<SummaryDocument | null> => {
  await assertOwnedNote(userId, input.noteId);
  return summary.findOne({ noteId: input.noteId });
};
