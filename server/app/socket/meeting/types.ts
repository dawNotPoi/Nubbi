import type {
  MeetingCommentInfo,
  MeetingJoinFailureReason,
} from "@/controller/meeting/types";
import type { MeetingIceServer } from "@/services/meeting/ice-configuration";

export type RoomUserInfo = {
  peerId: string;
  userId: string;
  roomId: string;
  name: string;
  image: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  /** 仅用于客户端选择展示画面，不用于鉴权。 */
  isScreenSharing?: boolean;
};

export type JoinMeetingResponse =
  | {
      ok: true;
      iceServers: MeetingIceServer[];
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
