import { ensureJwt } from "@/utils/auth";
import { getSocketBaseUrl } from "@/utils/env";
import type { MeetingComment } from "@/views/meeting-room/types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { registerMeetingSocketEvents } from "./meeting/p2p/socket-events";
import type {
  RemoteStreamMap,
  RoomUserMap,
  UseP2PConnectionResult,
} from "./meeting/p2p/types";
import { usePeerManager } from "./meeting/p2p/use-peer-manager";
import { useSocketActions } from "./meeting/p2p/use-socket-actions";

export type { RoomUserInfo } from "./meeting/p2p/types";

const SOCKET_URL = getSocketBaseUrl();

/** @returns 信令会话、独立媒体状态和会议操作；卸载时统一释放连接。 */
const useP2PConnection = (): UseP2PConnectionResult => {
  const socketRef = useRef<Socket | null>(null);
  const connectedRoomRef = useRef("");
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamMap>({});
  const [roomUsers, setRoomUsers] = useState<RoomUserMap>({});
  const [localPeerId, setLocalPeerId] = useState("");
  const [meetingComments, setMeetingComments] = useState<MeetingComment[]>([]);
  const [meetingEndedAt, setMeetingEndedAt] = useState(0);
  const [reconnectEpoch, setReconnectEpoch] = useState(0);
  const [transportConnected, setTransportConnected] = useState(false);
  const [iceWarning, setIceWarning] = useState("");
  const clientSessionIdRef = useRef("");
  if (!clientSessionIdRef.current) clientSessionIdRef.current = crypto.randomUUID();
  const { manager: peerManager, peerStatuses } = usePeerManager({ socketRef, setRemoteStreams });
  // 主动重建不依赖 Socket 是否恢复旧 ID，用新的客户端会话代次让双方清除旧连接。
  const reconnect = useCallback((): void => {
    clientSessionIdRef.current = crypto.randomUUID();
    peerManager.destroyAllPeers();
    socketRef.current?.disconnect().connect();
  }, [peerManager]);
  const socketActions = useSocketActions({
    socketRef,
    connectedRoomRef,
    setLocalPeerId,
    setRoomUsers,
    peerManager,
    setIceWarning,
    clientSessionIdRef,
  });

  const connectToPeer = useCallback(
    (roomId: string, stream: MediaStream | null): void => {
      if (!roomId) return;
      connectedRoomRef.current = roomId;
      peerManager.updateLocalStream(stream);
    },
    [peerManager],
  );

  const destroyPeerConnections = useCallback((): void => {
    peerManager.destroyAllPeers();
    connectedRoomRef.current = "";
    setRoomUsers({});
    setMeetingComments([]);
  }, [peerManager]);

  const handleMeetingEnded = useCallback((): void => {
    setMeetingEndedAt(Date.now());
  }, []);
  const handleSocketReconnect = useCallback((): void => {
    setReconnectEpoch((value) => value + 1);
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      auth: (callback) => {
        void ensureJwt()
          .then((token) => callback(token ? { token } : {}))
          .catch(() => callback({}));
      },
    });
    socketRef.current = socket;

    return registerMeetingSocketEvents({
      clientSessionIdRef,
      setTransportConnected,
      socket,
      connectedRoomRef,
      peerManager,
      setRoomUsers,
      setLocalPeerId,
      setMeetingComments,
      onMeetingEnded: handleMeetingEnded,
      onSocketReconnect: handleSocketReconnect,
    });
  }, [handleMeetingEnded, handleSocketReconnect, peerManager]);

  return {
    transportConnected,
    reconnect,
    ...socketActions,
    connectToPeer,
    remoteStreams,
    roomUsers,
    meetingComments,
    meetingEndedAt,
    reconnectEpoch,
    localPeerId,
    destroyPeerConnections,
    peerStatuses,
    retryPeer: peerManager.retryPeer,
    iceWarning,
  };
};

export default useP2PConnection;
