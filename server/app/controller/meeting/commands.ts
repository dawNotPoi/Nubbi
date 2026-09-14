import { httpError } from "@/common/http-error";
import type { AuthenticatedUser } from "@/lib/authUser";
import meeting from "@/models/meeting";
import meetingComment from "@/models/meetingComment";
import {
  reserveMeetingAccessAttempt,
  settleMeetingAccessAttempt,
} from "@/services/meeting/access-rate-limit";
import {
  autoEndExpiredMeeting,
  getMeetingEndTimestamp,
} from "@/services/meeting/lifecycle";
import {
  serializeMeetingListItem,
  type MeetingListItem,
} from "@/services/meeting/list-dto";
import {
  hashMeetingPassword,
  verifyLegacyMeetingPassword,
  verifyMeetingPassword,
} from "@/services/meeting/password";
import {
  beginMeetingClosures,
  cancelMeetingClosures,
} from "@/services/meeting/mutation-guard";
import { notifyMeetingRoomClosure } from "@/services/meeting/room-events";
import { issueMeetingAccessToken } from "./access-token";
import type { MeetingAccessResult } from "./types";

/** 创建会议输入参数 */
type CreateMeetingInput = {
  title: string;
  startTime: Date;
  duration: number;
  password?: string;
};

/** 审核会议输入参数 */
type VetMeetingInput = {
  id: string;
  status: "approved" | "rejected";
};

/** 校验会议访问输入参数 */
type ValidateMeetingAccessInput = {
  id: string;
  password: string;
};

export async function createMeeting(
  actor: AuthenticatedUser,
  input: CreateMeetingInput,
): Promise<MeetingListItem> {
  const normalizedPassword = input.password?.trim() || "";
  const created = await meeting.create({
    ...input,
    hostId: actor.id,
    password: "",
    passwordHash: await hashMeetingPassword(normalizedPassword),
  });
  return serializeMeetingListItem(created);
}

/** 审核会议：批准直接更新状态，拒绝则同时触发会议房间关闭通知 */
export async function vetHostedMeeting(
  actor: AuthenticatedUser,
  input: VetMeetingInput,
): Promise<MeetingListItem> {
  const owned = await meeting.exists({ _id: input.id, hostId: actor.id });
  if (!owned) throw httpError(404, "Meeting not found");

  if (input.status !== "rejected") {
    const updated = await meeting.findOneAndUpdate(
      { _id: input.id, hostId: actor.id },
      { $set: { status: input.status } },
      { new: true },
    );
    if (!updated) throw httpError(404, "Meeting not found");
    return serializeMeetingListItem(updated);
  }

  await beginMeetingClosures([input.id]);
  try {
    const updated = await meeting.findOneAndUpdate(
      { _id: input.id, hostId: actor.id },
      { $set: { status: input.status } },
      { new: true },
    );
    if (!updated) throw httpError(404, "Meeting not found");
    await notifyMeetingRoomClosure({
      roomId: String(updated._id),
      endedBy: actor.id,
    });
    return serializeMeetingListItem(updated);
  } finally {
    cancelMeetingClosures([input.id]);
  }
}

/** 删除自己主持的会议：触发房间关闭通知并清理评论 */
export async function deleteHostedMeeting(
  actor: AuthenticatedUser,
  meetingId: string,
): Promise<MeetingListItem> {
  const owned = await meeting.exists({ _id: meetingId, hostId: actor.id });
  if (!owned) throw httpError(404, "Meeting not found");

  await beginMeetingClosures([meetingId]);
  try {
    const deleted = await meeting.findOneAndDelete({
      _id: meetingId,
      hostId: actor.id,
    });
    if (!deleted) throw httpError(404, "Meeting not found");

    await notifyMeetingRoomClosure({ roomId: meetingId, endedBy: actor.id });
    await meetingComment.deleteMany({ roomId: meetingId });
    return serializeMeetingListItem(deleted);
  } finally {
    cancelMeetingClosures([meetingId]);
  }
}

/** 校验会议访问权限：过期/密码/审批校验，通过后签发访问令牌 */
export async function validateMeetingAccess(
  actor: AuthenticatedUser,
  input: ValidateMeetingAccessInput,
): Promise<MeetingAccessResult> {
  const item = await autoEndExpiredMeeting(await meeting.findById(input.id));
  if (!item) return { passed: false, reason: "NOT_FOUND" };
  if (item.endedAt) return { passed: false, reason: "MEETING_ENDED" };
  if (item.status && item.status !== "approved") {
    return { passed: false, reason: "NOT_APPROVED" };
  }
  const meetingExpiresAt = getMeetingEndTimestamp(item);
  if (
    meetingExpiresAt === null ||
    !Number.isFinite(meetingExpiresAt) ||
    meetingExpiresAt <= Date.now()
  ) {
    return { passed: false, reason: "MEETING_ENDED" };
  }

  const passwordHash =
    typeof item.passwordHash === "string" ? item.passwordHash : "";
  const legacyPassword =
    typeof item.password === "string" ? item.password : "";
  if (passwordHash || legacyPassword) {
    const meetingId = String(item._id);
    const limit = reserveMeetingAccessAttempt(meetingId, actor.id);
    if (!limit.allowed) {
      throw httpError(429, "会议密码尝试过于频繁，请稍后再试", {
        retryAfterSeconds: limit.retryAfterSeconds,
      });
    }

    let passwordMatched = false;
    try {
      passwordMatched = passwordHash
        ? await verifyMeetingPassword(input.password, passwordHash)
        : verifyLegacyMeetingPassword(input.password, legacyPassword);
    } finally {
      settleMeetingAccessAttempt(meetingId, actor.id, passwordMatched);
    }
    if (!passwordMatched) {
      return { passed: false, reason: "INVALID_PASSWORD" };
    }

    if (!passwordHash) {
      await meeting.updateOne(
        { _id: item._id, password: legacyPassword },
        {
          $set: {
            password: "",
            passwordHash: await hashMeetingPassword(legacyPassword),
          },
        },
      );
    }
  }

  const grant = await issueMeetingAccessToken({
    meetingId: String(item._id),
    userId: actor.id,
    expiresAt: meetingExpiresAt,
  });
  return { passed: true, reason: "OK", ...grant };
}
