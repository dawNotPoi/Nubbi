import type { MeetingAccessResult, MeetingType } from "@/api/meeting";

export const isMeetingEnded = (meeting: MeetingType): boolean =>
  Boolean(meeting.endedAt) ||
  Date.now() >=
    new Date(meeting.startTime).getTime() + meeting.duration * 60 * 1000;

export const meetingRequiresPassword = (meeting: MeetingType): boolean =>
  Boolean(meeting.hasPassword);

export const getAccessErrorMessage = (
  reason: MeetingAccessResult["reason"],
): string => {
  if (reason === "INVALID_PASSWORD") return "会议密码错误";
  if (reason === "MEETING_ENDED") return "会议已结束";
  if (reason === "NOT_APPROVED") return "会议当前不可加入";
  if (reason === "NOT_FOUND") return "会议房间不存在";
  return "验证会议权限失败";
};
