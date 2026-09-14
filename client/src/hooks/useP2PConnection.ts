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

const useP2PConnection = (): UseP2PConnectionResult => {
  const socketRef = useRef<Socket | null>(null);
  const connectedRoomRef = useRef("");
  const [remoteStreams, setRemoteStreams] = useState<RemoteStreamMap>({});
  const [roomUsers, setRoomUsers] = useState<RoomUserMap>({});
  const [localPeerId, setLocalPeerId] = useState("");
  const [meetingComments, setMeetingComments] = useState<MeetingComment[]>([]);
  const [meetingEndedAt, setMeetingEndedAt] = useState(0);
  const [reconnectEpoch, setReconnectEpoch] = useState(0);
  const peerManager = usePeerManager({ socketRef, setRemoteStreams });
  const socketActions = useSocketActions({
    socketRef,
    connectedRoomRef,
    setLocalPeerId,
    setRoomUsers,
    ensurePeerConnection: peerManager.ensurePeerConnection,
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
    ...socketActions,
    connectToPeer,
    remoteStreams,
    roomUsers,
    meetingComments,
    meetingEndedAt,
    reconnectEpoch,
    localPeerId,
    destroyPeerConnections,
    peersRef: peerManager.peersRef,
  };
};

export default useP2PConnection;
