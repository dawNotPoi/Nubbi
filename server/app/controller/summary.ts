import { httpError } from "@/common/http-error";
import { assertOwnedNote } from "@/controller/note/access";
import summary, { type SummaryDocument } from "@/models/summary";

/** 创建摘要的输入参数 */
export type CreateSummaryInput = {
  content: string;
  noteId: string;
};

/** 查询摘要的输入参数 */
export type FindSummaryInput = {
  noteId: string;
};

/** 创建/更新笔记摘要（按 noteId upsert） */
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

/** 查询笔记摘要，无权限或无记录时返回 null */
export const findSummary = async (
  userId: string,
  input: FindSummaryInput,
): Promise<SummaryDocument | null> => {
  await assertOwnedNote(userId, input.noteId);
  return summary.findOne({ noteId: input.noteId });
};
