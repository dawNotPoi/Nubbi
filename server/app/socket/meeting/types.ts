import type {
  MeetingCommentInfo,
  MeetingJoinFailureReason,
} from "@/controller/meeting/types";

export type RoomUserInfo = {
  peerId: string;
  userId: string;
  roomId: string;
  name: string;
  image: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
};

export type JoinMeetingResponse =
  | {
      ok: true;
      existingPeers: string[];
      roomUsers: RoomUserInfo[];
    }
  | {
      ok: false;
      reason:
        | MeetingJoinFailureReason
        | "INVALID_PAYLOAD"
        | "UNAUTHORIZED"
        | "JOIN_FAILED";
      existingPeers: [];
      roomUsers: [];
    };

export type MeetingActionResponse = {
  ok: boolean;
  reason?: string;
};

export type MeetingCommentResponse = MeetingActionResponse & {
  comment?: MeetingCommentInfo;
};
