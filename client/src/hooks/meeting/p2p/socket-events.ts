import type { MeetingComment } from "@/views/meeting-room/types";
import type Peer from "simple-peer";
import type {
  RoomUserInfo,
  SocketEventState,
} from "./types";

function toRoomUsersMap(users: RoomUserInfo[]): Record<string, RoomUserInfo> {
  return users.reduce<Record<string, RoomUserInfo>>((result, user) => {
    result[user.peerId] = user;
    return result;
  }, {});
}

export function registerMeetingSocketEvents({
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
  const handleConnect = (): void => {
    setLocalPeerId(socket.id || "");
    if (hasConnected) onSocketReconnect();
    else hasConnected = true;
  };
  const handleDisconnect = (): void => {
    setLocalPeerId("");
  };
  const handleNewUser = (roomUser: RoomUserInfo): void => {
    setRoomUsers((previous) => ({
      ...previous,
      [roomUser.peerId]: roomUser,
    }));
    if (
      roomUser.peerId !== socket.id &&
      connectedRoomRef.current === roomUser.roomId
    ) {
      peerManager.ensurePeerConnection(roomUser.peerId, true);
    }
  };
  const handleUserLeft = (peerId: string): void => {
    peerManager.removePeer(peerId);
  };
  const handleSignal = (data: {
    senderId: string;
    signal: Peer.SignalData;
  }): void => {
    peerManager.acceptSignal(data);
  };
  const handleRoomUsers = (users: RoomUserInfo[]): void => {
    setRoomUsers(toRoomUsersMap(users));
  };
  const handleComments = (comments: MeetingComment[]): void => {
    setMeetingComments(comments);
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
  socket.on("handlerNewUser", handleNewUser);
  socket.on("user-left", handleUserLeft);
  socket.on("signal", handleSignal);
  socket.on("room-users-sync", handleRoomUsers);
  socket.on("meeting-comments-sync", handleComments);
  socket.on("meeting-comment-created", handleCommentCreated);
  socket.on("meeting-ended", handleMeetingEnded);

  return (): void => {
    socket.off("connect", handleConnect);
    socket.off("disconnect", handleDisconnect);
    socket.off("handlerNewUser", handleNewUser);
    socket.off("user-left", handleUserLeft);
    socket.off("signal", handleSignal);
    socket.off("room-users-sync", handleRoomUsers);
    socket.off("meeting-comments-sync", handleComments);
    socket.off("meeting-comment-created", handleCommentCreated);
    socket.off("meeting-ended", handleMeetingEnded);
    socket.disconnect();
  };
}
