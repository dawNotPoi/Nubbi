export type MeetingAccessFailureReason =
  | "NOT_FOUND"
  | "INVALID_PASSWORD"
  | "NOT_APPROVED"
  | "MEETING_ENDED";

export type MeetingAccessResult =
  | {
      passed: true;
      reason: "OK";
      accessToken: string;
      expiresInSeconds: number;
    }
  | {
      passed: false;
      reason: MeetingAccessFailureReason;
    };

export type MeetingCommentInfo = {
  _id: string;
  roomId: string;
  meetingId: string;
  content: string;
  userId: string;
  name: string;
  avatar: string;
  createdAt: Date;
  updatedAt: Date;
};

export type MeetingJoinFailureReason =
  | "INVALID_ACCESS"
  | "MEETING_NOT_FOUND"
  | "MEETING_NOT_APPROVED"
  | "MEETING_ENDED";

export type MeetingJoinResult =
  | { ok: true; expiresAt: number }
  | { ok: false; reason: MeetingJoinFailureReason };
