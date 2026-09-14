import type { MeetingComment } from "@/views/meeting-room/types";
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import type { Socket } from "socket.io-client";
import type { MeetingSignal, PeerNegotiation, PeerStatusMap } from "./connection-types";

export type RoomUserInfo = {
  peerId: string;
  userId: string;
  roomId: string;
  name: string;
  image: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  /** 可选的展示标记，不改变成员权限。 */
  isScreenSharing?: boolean;
};

export type JoinMeetingResponse = {
  ok: boolean;
  reason?: string;
  existingPeers: string[];
  roomUsers: RoomUserInfo[];
  iceServers?: RTCIceServer[];
};

export type RoomMedia = {
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
  isScreenSharing?: boolean;
};

export type SendMeetingCommentResponse = {
  ok: boolean;
  reason?: string;
  comment?: MeetingComment;
};

export type EndMeetingResponse = {
  ok: boolean;
  reason?: string;
};

export type RoomUserMap = Record<string, RoomUserInfo>;
export type RemoteStreamMap = Record<string, MediaStream>;

export type PeerManager = {
  configure: (servers: RTCIceServer[]) => void;
  reconcile: (peerIds: string[]) => void;
  acceptSession: (session: PeerNegotiation, iceServers?: RTCIceServer[]) => void;
  suspend: () => void;
  retryPeer: (peerId: string) => void;
  updateLocalStream: (stream: MediaStream | null) => void;
  removePeer: (peerId: string) => void;
  acceptSignal: (data: MeetingSignal) => void;
  destroyAllPeers: () => void;
};

export type SocketActions = {
  joinRoom: (
    roomId: string,
    accessToken: string,
    media?: RoomMedia,
  ) => Promise<JoinMeetingResponse>;
  syncRoomUser: (roomId: string, media?: RoomMedia) => void;
  sendMeetingComment: (
    roomId: string,
    content: string,
  ) => Promise<SendMeetingCommentResponse>;
  endMeeting: (roomId: string) => Promise<EndMeetingResponse>;
};

export type UseP2PConnectionResult = SocketActions & {
  transportConnected: boolean;
  reconnect: () => void;
  connectToPeer: (roomId: string, stream: MediaStream | null) => void;
  remoteStreams: RemoteStreamMap;
  roomUsers: RoomUserMap;
  meetingComments: MeetingComment[];
  meetingEndedAt: number;
  reconnectEpoch: number;
  localPeerId: string;
  destroyPeerConnections: () => void;
  peerStatuses: PeerStatusMap;
  retryPeer: (peerId: string) => void;
  iceWarning: string;
};

export type SocketEventState = {
  clientSessionIdRef: MutableRefObject<string>;
  setTransportConnected: Dispatch<SetStateAction<boolean>>;
  socket: Socket;
  connectedRoomRef: MutableRefObject<string>;
  peerManager: PeerManager;
  setRoomUsers: Dispatch<SetStateAction<RoomUserMap>>;
  setLocalPeerId: Dispatch<SetStateAction<string>>;
  setMeetingComments: Dispatch<SetStateAction<MeetingComment[]>>;
  onMeetingEnded: () => void;
  onSocketReconnect: () => void;
};
