import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Socket } from "socket.io-client";
import { requestAcknowledgement } from "./request-acknowledgement";
import type { EndMeetingResponse, JoinMeetingResponse, PeerManager, RoomMedia, RoomUserMap, SendMeetingCommentResponse, SocketActions } from "./types";

type UseSocketActionsInput = {
  socketRef: MutableRefObject<Socket | null>;
  connectedRoomRef: MutableRefObject<string>;
  setLocalPeerId: Dispatch<SetStateAction<string>>;
  setRoomUsers: Dispatch<SetStateAction<RoomUserMap>>;
  peerManager: PeerManager;
  setIceWarning: (warning: string) => void;
  clientSessionIdRef: MutableRefObject<string>;
};

/** @param input 信令引用及成员状态更新器。@returns 带超时和断线保护的会议操作。 */
export function useSocketActions({ socketRef, connectedRoomRef, setLocalPeerId, setRoomUsers, peerManager, setIceWarning, clientSessionIdRef }: UseSocketActionsInput): SocketActions {
  const joinRoom = useCallback(async (roomId: string, accessToken: string, media?: RoomMedia): Promise<JoinMeetingResponse> => {
    if (!roomId || !accessToken) return { ok: false, reason: "INVALID_PAYLOAD", existingPeers: [], roomUsers: [] };
    const socket = socketRef.current;
    const clientSessionId = clientSessionIdRef.current;
    const response = await requestAcknowledgement<JoinMeetingResponse>(socket, "joinMeetingRoom", { roomId, accessToken, media, clientSessionId });
    if (!response.ok) return { ok: false, reason: response.reason, existingPeers: [], roomUsers: [] };
    const result = response.value;
    if (clientSessionId !== clientSessionIdRef.current) return { ok: false, reason: "DISCONNECTED", existingPeers: [], roomUsers: [] };
    if (result.ok && socket === socketRef.current && socket?.connected) {
      connectedRoomRef.current = roomId;
      setLocalPeerId(socket.id || "");
      setRoomUsers(Object.fromEntries(result.roomUsers.map((user) => [user.peerId, user])));
      const servers = result.iceServers ?? [];
      peerManager.configure(servers);
      setIceWarning(servers.some((server) => (Array.isArray(server.urls) ? server.urls : [server.urls]).some((url) => /^turns?:/.test(url))) ? "" : "未配置 TURN 中继，部分跨网络连接可能失败。");
      peerManager.reconcile(result.roomUsers.map((user) => user.peerId));
    }
    return result;
  }, [socketRef, connectedRoomRef, setLocalPeerId, setRoomUsers, peerManager, setIceWarning, clientSessionIdRef]);
  const syncRoomUser = useCallback((roomId: string, media?: RoomMedia): void => {
    if (socketRef.current?.connected && connectedRoomRef.current === roomId) socketRef.current.emit("syncMeetingUser", { roomId, media });
  }, [socketRef, connectedRoomRef]);
  const sendMeetingComment = useCallback(async (roomId: string, content: string): Promise<SendMeetingCommentResponse> => {
    if (!content.trim()) return { ok: false, reason: "INVALID_PAYLOAD" };
    const response = await requestAcknowledgement<SendMeetingCommentResponse>(socketRef.current, "sendMeetingComment", { roomId, content });
    return response.ok ? response.value : { ok: false, reason: response.reason };
  }, [socketRef]);
  const endMeeting = useCallback(async (roomId: string): Promise<EndMeetingResponse> => {
    const response = await requestAcknowledgement<EndMeetingResponse>(socketRef.current, "endMeeting", { roomId });
    return response.ok ? response.value : { ok: false, reason: response.reason };
  }, [socketRef]);
  return { joinRoom, syncRoomUser, sendMeetingComment, endMeeting };
}
