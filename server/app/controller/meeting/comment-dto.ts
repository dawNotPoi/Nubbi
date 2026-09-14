import type { MeetingCommentInfo } from "./types";

/** 会议评论的数据库记录源类型 */
type MeetingCommentSource = {
  _id?: unknown;
  roomId?: unknown;
  meetingId?: unknown;
  content?: unknown;
  userId?: unknown;
  name?: unknown;
  avatar?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  toObject?: () => Record<string, unknown>;
};

/** 将评论记录安全转为日期对象，无效值回退到纪元时间 */
const toDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  const parsed = new Date(typeof value === "string" ? value : 0);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

/** 将会议评论记录序列化为业务对象 */
export function serializeMeetingComment(value: unknown): MeetingCommentInfo {
  const source = value as MeetingCommentSource;
  const plain =
    typeof source.toObject === "function" ? source.toObject() : source;

  return {
    _id: String(plain._id ?? ""),
    roomId: String(plain.roomId ?? ""),
    meetingId: String(plain.meetingId ?? ""),
    content: String(plain.content ?? ""),
    userId: String(plain.userId ?? ""),
    name: String(plain.name ?? "Guest"),
    avatar: String(plain.avatar ?? ""),
    createdAt: toDate(plain.createdAt),
    updatedAt: toDate(plain.updatedAt),
  };
}
