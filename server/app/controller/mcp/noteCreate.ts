import { createNote } from "@/controller/note/create";
import { recordUserTags } from "@/controller/tag";
import Note from "@/models/note";
import { httpError, serializeNote } from "./shared";
import type { McpContentNoteResult } from "./types";

/** MCP 创建笔记的输入参数 */
export type CreateMcpNoteInput = {
  title?: string;
  content?: string;
  parentId?: string | null;
  author?: string | null;
  tags?: string[];
  date?: Date;
  meta?: Array<{ key: string; value?: unknown; type: string }> | Record<string, unknown>;
};

/** 创建 Agent 笔记：校验父笔记存在，创建后进入收件箱并记录标签 */
export const createMcpNote = async (
  userId: string,
  input: CreateMcpNoteInput,
): Promise<McpContentNoteResult> => {
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
  await recordUserTags(userId, input.tags);

  return {
    ...serializeNote(created),
    contentLength: created.content.length,
  };
};
