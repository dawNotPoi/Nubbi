import Note from "@/models/note";
import { httpError, toIsoString } from "./shared";

/** 抛出 MCP 更新冲突错误：附上服务端最新时间戳供客户端重试 */
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
