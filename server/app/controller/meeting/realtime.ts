import type { AuthenticatedUser } from "@/lib/authUser";
import meeting from "@/models/meeting";
import meetingComment from "@/models/meetingComment";
import { autoEndExpiredMeeting } from "@/services/meeting/lifecycle";
import { getMeetingEndTimestamp } from "@/services/meeting/lifecycle";
import { runMeetingMutation } from "@/services/meeting/mutation-guard";
import { verifyMeetingAccessToken } from "./access-token";
import { serializeMeetingComment } from "./comment-dto";
import type {
  MeetingCommentInfo,
  MeetingJoinResult,
} from "./types";

/** 查询活跃会议：自动结束已过期会议，过滤已结束或未批准状态 */
async function findActiveMeeting(meetingId: string) {
  const item = await autoEndExpiredMeeting(await meeting.findById(meetingId));
  if (!item) return null;
  if (item.endedAt) return null;
  if (item.status && item.status !== "approved") return null;
  return item;
}

/** 校验会议加入权限：验证访问令牌、会议状态和有效期 */
export async function authorizeMeetingJoin(input: {
  meetingId: string;
  userId: string;
  accessToken: string;
}): Promise<MeetingJoinResult> {
  const claims = await verifyMeetingAccessToken(input.accessToken);
  if (
    !claims ||
    claims.meetingId !== input.meetingId ||
    claims.userId !== input.userId
  ) {
    return { ok: false, reason: "INVALID_ACCESS" };
  }

  const item = await autoEndExpiredMeeting(
    await meeting.findById(input.meetingId),
  );
  if (!item) return { ok: false, reason: "MEETING_NOT_FOUND" };
  if (item.endedAt) return { ok: false, reason: "MEETING_ENDED" };
  if (item.status && item.status !== "approved") {
    return { ok: false, reason: "MEETING_NOT_APPROVED" };
  }
  const expiresAt = getMeetingEndTimestamp(item);
  if (expiresAt === null) {
    return { ok: false, reason: "MEETING_ENDED" };
  }
  return { ok: true, expiresAt };
}

/** 判断会议是否仍处于活跃状态 */
export async function isMeetingActive(meetingId: string): Promise<boolean> {
  return Boolean(await findActiveMeeting(meetingId));
}

/** 判断会议是否由指定主持人持有 */
export async function isMeetingHostedBy(input: {
  meetingId: string;
  hostId: string;
}): Promise<boolean> {
  return Boolean(
    await meeting.exists({
      _id: input.meetingId,
      hostId: input.hostId,
      endedAt: null,
    }),
  );
}

/** 查询会议的实时评论列表 */
export async function findRealtimeMeetingComments(
  meetingId: string,
): Promise<MeetingCommentInfo[]> {
  const comments = await meetingComment
    .find({ roomId: meetingId })
    .sort({ createdAt: 1 });
  return comments.map(serializeMeetingComment);
}

/** 创建实时会议评论（受会议写锁保护） */
export function createRealtimeMeetingComment(input: {
  meetingId: string;
  actor: AuthenticatedUser;
  content: string;
}): Promise<MeetingCommentInfo | null> {
  return runMeetingMutation(input.meetingId, async () => {
    const item = await findActiveMeeting(input.meetingId);
    if (!item) return null;

    const created = await meetingComment.create({
      meetingId: item._id,
      roomId: input.meetingId,
      content: input.content,
      userId: input.actor.id,
      name: input.actor.name || "Guest",
      avatar: input.actor.image || "",
    });
    return serializeMeetingComment(created);
  });
}

/** 结束会议（仅主持人可操作），返回是否成功 */
export async function endHostedMeeting(input: {
  meetingId: string;
  hostId: string;
}): Promise<boolean> {
  const updated = await meeting.findOneAndUpdate(
    {
      _id: input.meetingId,
      hostId: input.hostId,
      endedAt: null,
    },
    { $set: { endedAt: new Date() } },
  );
  return Boolean(updated);
}
