import type { MeetingComment } from "@/views/meeting-room/types";
import type { MeetingSignal, PeerNegotiation } from "./connection-types";
import type {
  RoomUserInfo,
  SocketEventState,
} from "./types";

/** @param users 服务端成员快照。@returns 按连接身份索引的成员表。 */
function toRoomUsersMap(users: RoomUserInfo[]): Record<string, RoomUserInfo> {
  return users.reduce<Record<string, RoomUserInfo>>((result, user) => {
    result[user.peerId] = user;
    return result;
  }, {});
}

/** @param state 当前会话的状态发布器和媒体协调器。@returns 取消监听并释放连接的操作。 */
export function registerMeetingSocketEvents({
  clientSessionIdRef,
  setTransportConnected,
  socket,
  connectedRoomRef,
  peerManager,
  setRoomUsers,
  setLocalPeerId,
  setMeetingComments,
  onMeetingEnded,
  onSocketReconnect,
}: SocketEventState): () => void {
  let hasConnected = false;
  let previousSocketId = "";
  let disconnectTimer: ReturnType<typeof setTimeout> | undefined;
  const handleConnect = (): void => {
    clearTimeout(disconnectTimer);
    disconnectTimer = undefined;
    if (previousSocketId && previousSocketId !== socket.id) peerManager.destroyAllPeers();
    previousSocketId = socket.id || "";
    setTransportConnected(true);
    setLocalPeerId(socket.id || "");
    if (hasConnected) onSocketReconnect();
    else hasConnected = true;
  };
  const handleDisconnect = (): void => {
    setTransportConnected(false);
    peerManager.suspend();
    if (!disconnectTimer) disconnectTimer = setTimeout(() => { peerManager.destroyAllPeers(); setRoomUsers({}); }, 15_000);
  };
  const handleNewUser = (roomUser: RoomUserInfo): void => {
    setRoomUsers((previous) => ({
      ...previous,
      [roomUser.peerId]: roomUser,
    }));
  };
  const handleUserLeft = (peerId: string): void => {
    peerManager.removePeer(peerId);
  };
  const handleSignal = (data: MeetingSignal & { clientSessionId: string }): void => {
    if (data.clientSessionId !== clientSessionIdRef.current) return;
    peerManager.acceptSignal(data);
  };
  const handlePeerSession = (data: { session: PeerNegotiation; iceServers: RTCIceServer[]; clientSessionId: string }): void => {
    if (data.clientSessionId === clientSessionIdRef.current) peerManager.acceptSession(data.session, data.iceServers);
  };
  const handleRoomUsers = (users: RoomUserInfo[]): void => {
    setRoomUsers(toRoomUsersMap(users));
    peerManager.reconcile(users.map((user) => user.peerId));
  };
  const handleComments = (comments: MeetingComment[]): void => {
    setMeetingComments((previous) => Array.from(new Map([...comments, ...previous].map((comment) => [comment._id, comment])).values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
  };
  const handleCommentCreated = (comment: MeetingComment): void => {
    setMeetingComments((previous) => {
      if (previous.some((item) => item._id === comment._id)) return previous;
      return [...previous, comment];
    });
  };
  const handleMeetingEnded = (): void => {
    peerManager.destroyAllPeers();
    connectedRoomRef.current = "";
    setRoomUsers({});
    setMeetingComments([]);
    onMeetingEnded();
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleDisconnect);
  socket.on("handlerNewUser", handleNewUser);
  socket.on("user-left", handleUserLeft);
  socket.on("signal", handleSignal);
  socket.on("meeting-peer-session", handlePeerSession);
  socket.on("room-users-sync", handleRoomUsers);
  socket.on("meeting-comments-sync", handleComments);
  socket.on("meeting-comment-created", handleCommentCreated);
  socket.on("meeting-ended", handleMeetingEnded);

  return (): void => {
    clearTimeout(disconnectTimer);
    peerManager.destroyAllPeers();
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off("connect_error", handleDisconnect);
    socket.off("handlerNewUser", handleNewUser);
    socket.off("user-left", handleUserLeft);
    socket.off("signal", handleSignal);
    socket.off("meeting-peer-session", handlePeerSession);
    socket.off("room-users-sync", handleRoomUsers);
    socket.off("meeting-comments-sync", handleComments);
    socket.off("meeting-comment-created", handleCommentCreated);
    socket.off("meeting-ended", handleMeetingEnded);
    socket.disconnect();
  };
}
