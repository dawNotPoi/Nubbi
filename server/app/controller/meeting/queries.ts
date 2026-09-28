import { httpError } from "@/common/http-error";
import { buildPaginationResult, type PaginationResult, type PaginationInput } from "@/common/pagination";
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

/** @param actor 认证用户。@param pagination 分页参数。@returns 当前用户主持的会议分页。 */
export async function findMyMeetings(
  actor: AuthenticatedUser,
  pagination: PaginationInput,
): Promise<PaginationResult<MeetingListItem>> {
  const filter = { hostId: actor.id };
  const [items, total] = await Promise.all([
    meeting.find(filter).sort({ createdAt: -1, _id: -1 }).skip(pagination.offset).limit(pagination.limit),
    meeting.countDocuments(filter),
  ]);
  const normalized = await autoEndExpiredMeetings(items);
  return buildPaginationResult(normalized.map(serializeMeetingListItem), total, pagination);
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

/** @param pagination 分页参数。@returns 公开会议当前页，沿用已有公开范围。 */
export async function findAllMeetings(pagination: PaginationInput): Promise<PaginationResult<MeetingListItem>> {
  return getMeetingPage(pagination);
}

/** 公开：按 ID 查询会议详情，不存在返回 null */
export async function findMeetingById(
  meetingId: string,
): Promise<MeetingListItem | null> {
  const item = await meeting.findById(meetingId);
  if (!item) return null;
  return serializeMeetingListItem(await autoEndExpiredMeeting(item));
}

/** @param actor 认证用户。@param meetingId 主持的会议。@param pagination 分页参数。@returns 评论分页，按时间与 ID 正序。 */
export async function findHostedMeetingComments(
  actor: AuthenticatedUser,
  meetingId: string,
  pagination: PaginationInput,
): Promise<PaginationResult<MeetingCommentInfo>> {
  const ownedMeeting = await meeting.exists({
    _id: meetingId,
    hostId: actor.id,
  });
  if (!ownedMeeting) throw httpError(404, "Meeting not found");

  const filter = { roomId: meetingId };
  const [comments, total] = await Promise.all([
    meetingComment.find(filter).sort({ createdAt: 1, _id: 1 }).skip(pagination.offset).limit(pagination.limit),
    meetingComment.countDocuments(filter),
  ]);
  return buildPaginationResult(comments.map(serializeMeetingComment), total, pagination);
}
