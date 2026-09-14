import { httpError } from "@/common/http-error";
import type { PaginationInput } from "@/common/pagination";
import type { AuthenticatedUser } from "@/lib/authUser";
import meeting from "@/models/meeting";
import meetingComment from "@/models/meetingComment";
import {
  autoEndExpiredMeeting,
  autoEndExpiredMeetings,
} from "@/services/meeting/lifecycle";
import {
  serializeMeetingListItem,
  type MeetingListItem,
} from "@/services/meeting/list-dto";
import { getLegacyMeetingPage, getMeetingPage } from "@/services/meeting/list";
import type { LegacyMeetingPageInput } from "@/services/meeting/types";
import { serializeMeetingComment } from "./comment-dto";
import type { MeetingCommentInfo } from "./types";

/** 查询当前用户主持的会议，自动结束已过期会议 */
export async function findMyMeetings(
  actor: AuthenticatedUser,
): Promise<MeetingListItem[]> {
  const items = await meeting.find({ hostId: actor.id });
  const normalized = await autoEndExpiredMeetings(items);
  return normalized.map(serializeMeetingListItem);
}

/** 分页查询全部会议 */
export async function findMeetingPage(
  pagination: PaginationInput,
): Promise<Awaited<ReturnType<typeof getMeetingPage>>> {
  return getMeetingPage(pagination);
}

/** 按旧版 schema 分页查询会议（兼容旧客户端） */
export async function findLegacyMeetingPage(
  input: LegacyMeetingPageInput,
): Promise<Awaited<ReturnType<typeof getLegacyMeetingPage>>> {
  return getLegacyMeetingPage(input);
}

/** 公开：查询全部会议（按创建时间倒序） */
export async function findAllMeetings(): Promise<MeetingListItem[]> {
  const items = await meeting.find().sort({ createdAt: -1 });
  const normalized = await autoEndExpiredMeetings(items);
  return normalized.map(serializeMeetingListItem);
}

/** 公开：按 ID 查询会议详情，不存在返回 null */
export async function findMeetingById(
  meetingId: string,
): Promise<MeetingListItem | null> {
  const item = await meeting.findById(meetingId);
  if (!item) return null;
  return serializeMeetingListItem(await autoEndExpiredMeeting(item));
}

/** 查询主持会议的评论列表（按创建时间正序） */
export async function findHostedMeetingComments(
  actor: AuthenticatedUser,
  meetingId: string,
): Promise<MeetingCommentInfo[]> {
  const ownedMeeting = await meeting.exists({
    _id: meetingId,
    hostId: actor.id,
  });
  if (!ownedMeeting) throw httpError(404, "Meeting not found");

  const comments = await meetingComment
    .find({ roomId: meetingId })
    .sort({ createdAt: 1 });
  return comments.map(serializeMeetingComment);
}
