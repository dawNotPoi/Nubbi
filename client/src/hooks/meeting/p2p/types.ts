import type { MeetingComment } from "@/views/meeting-room/types";
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from "react";
import type Peer from "simple-peer";
import type { Socket } from "socket.io-client";

export type RoomUserInfo = {
  peerId: string;
  userId: string;
  roomId: string;
  name: string;
  image: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
};

export type JoinMeetingResponse = {
  ok: boolean;
  reason?: string;
  existingPeers: string[];
  roomUsers: RoomUserInfo[];
};

export type RoomMedia = {
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
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

export type PeerMap = Record<string, Peer.Instance>;
export type PendingSignalMap = Record<string, Peer.SignalData[]>;
export type RoomUserMap = Record<string, RoomUserInfo>;
export type RemoteStreamMap = Record<string, MediaStream>;

export type PeerManager = {
  peersRef: MutableRefObject<PeerMap>;
  localStreamRef: MutableRefObject<MediaStream | null>;
  pendingSignalsRef: MutableRefObject<PendingSignalMap>;
  ensurePeerConnection: (
    peerId: string,
    initiator: boolean,
  ) => Peer.Instance;
  updateLocalStream: (stream: MediaStream | null) => void;
  removePeer: (peerId: string) => void;
  acceptSignal: (data: {
    senderId: string;
    signal: Peer.SignalData;
  }) => void;
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
  connectToPeer: (roomId: string, stream: MediaStream | null) => void;
  remoteStreams: RemoteStreamMap;
  roomUsers: RoomUserMap;
  meetingComments: MeetingComment[];
  meetingEndedAt: number;
  reconnectEpoch: number;
  localPeerId: string;
  destroyPeerConnections: () => void;
  peersRef: MutableRefObject<PeerMap>;
};

export type SocketEventState = {
  socket: Socket;
  connectedRoomRef: MutableRefObject<string>;
  peerManager: PeerManager;
  setRoomUsers: Dispatch<SetStateAction<RoomUserMap>>;
  setLocalPeerId: Dispatch<SetStateAction<string>>;
  setMeetingComments: Dispatch<SetStateAction<MeetingComment[]>>;
  onMeetingEnded: () => void;
  onSocketReconnect: () => void;
};
