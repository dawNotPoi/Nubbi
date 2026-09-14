import { Server, Socket } from "socket.io";
import meeting from "../models/meeting";
import meetingComment from "../models/meetingComment";

type JoinUserPayload = {
  id?: string;
  name?: string;
  image?: string;
  email?: string;
};

type RoomUserInfo = {
  peerId: string;
  userId: string;
  roomId: string;
  name: string;
  image: string;
  email: string;
};

type JoinMeetingResponse = {
  existingPeers: string[];
  roomUsers: RoomUserInfo[];
};

type MeetingCommentInfo = {
  _id: string;
  roomId: string;
  meetingId: string;
  content: string;
  userId: string;
  name: string;
  avatar: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
};

const socketRooms = new Map<string, string>();
const roomUsers = new Map<string, Map<string, RoomUserInfo>>();

function serializeMeetingComment(commentDoc: any): MeetingCommentInfo {
  return {
    _id: String(commentDoc._id),
    roomId: commentDoc.roomId,
    meetingId: String(commentDoc.meetingId),
    content: commentDoc.content,
    userId: commentDoc.userId || "",
    name: commentDoc.name || "Guest",
    avatar: commentDoc.avatar || "",
    email: commentDoc.email || "",
    createdAt: commentDoc.createdAt,
    updatedAt: commentDoc.updatedAt,
  };
}

function getRoomUsers(roomId: string) {
  return Array.from(roomUsers.get(roomId)?.values() || []);
}

function syncRoomUsers(io: Server, roomId: string) {
  io.to(roomId).emit("room-users-sync", getRoomUsers(roomId));
}

async function syncMeetingComments(
  io: Server,
  roomId: string,
  target?: Socket,
) {
  const comments = await meetingComment.find({ roomId }).sort({ createdAt: 1 });
  const payload = comments.map(serializeMeetingComment);

  if (target) {
    target.emit("meeting-comments-sync", payload);
    return;
  }

  io.to(roomId).emit("meeting-comments-sync", payload);
}

function upsertRoomUser(roomId: string, socketId: string, user?: JoinUserPayload) {
  const nextUser: RoomUserInfo = {
    peerId: socketId,
    userId: user?.id || socketId,
    roomId,
    name: user?.name || "Guest",
    image: user?.image || "",
    email: user?.email || "",
  };

  if (!roomUsers.has(roomId)) {
    roomUsers.set(roomId, new Map<string, RoomUserInfo>());
  }

  roomUsers.get(roomId)!.set(socketId, nextUser);
  socketRooms.set(socketId, roomId);
  return nextUser;
}

function removeRoomUser(socketId: string) {
  const roomId = socketRooms.get(socketId);
  if (!roomId) return null;

  const members = roomUsers.get(roomId);
  members?.delete(socketId);

  if (members && members.size === 0) {
    roomUsers.delete(roomId);
  }

  socketRooms.delete(socketId);
  return roomId;
}

function leaveRoom(io: Server, socket: Socket, roomId: string) {
  socket.leave(roomId);
  const removedRoomId = removeRoomUser(socket.id);

  if (!removedRoomId) return;

  socket.to(roomId).emit("user-left", socket.id);
  syncRoomUsers(io, roomId);
}

const P2PHandler = (io: Server, socket: Socket) => {
  socket.on(
    "joinMeetingRoom",
    (
      { roomId, user }: { roomId?: string; user?: JoinUserPayload },
      callback?: (response: JoinMeetingResponse) => void,
    ) => {
      if (!roomId) {
        callback?.({ existingPeers: [], roomUsers: [] });
        return;
      }

      const previousRoomId = socketRooms.get(socket.id);
      if (previousRoomId && previousRoomId !== roomId) {
        leaveRoom(io, socket, previousRoomId);
      }

      const existedInRoom = roomUsers.get(roomId)?.has(socket.id) || false;

      socket.join(roomId);
      const nextUser = upsertRoomUser(roomId, socket.id, user);
      const clients = io.sockets.adapter.rooms.get(roomId) || new Set<string>();
      const existingPeers = Array.from(clients).filter((id) => id !== socket.id);

      if (!existedInRoom) {
        socket.to(roomId).emit("handlerNewUser", nextUser);
      }

      syncRoomUsers(io, roomId);
      void syncMeetingComments(io, roomId, socket);
      callback?.({ existingPeers, roomUsers: getRoomUsers(roomId) });
    },
  );

  socket.on(
    "syncMeetingUser",
    ({ roomId, user }: { roomId?: string; user?: JoinUserPayload }) => {
      if (!roomId) return;

      const currentRoomId = socketRooms.get(socket.id);
      if (currentRoomId !== roomId) return;

      upsertRoomUser(roomId, socket.id, user);
      syncRoomUsers(io, roomId);
    }
  );

  socket.on("signal", (data) => {
    io.to(data.targetId).emit("signal", {
      senderId: socket.id,
      signal: data.signal,
    });
  });

  socket.on(
    "sendMeetingComment",
    async (
      {
        roomId,
        comment,
      }: {
        roomId?: string;
        comment?: JoinUserPayload & { content?: string };
      },
      callback?: (response: { ok: boolean; comment?: MeetingCommentInfo; reason?: string }) => void,
    ) => {
      try {
        const content = comment?.content?.trim();
        if (!roomId || !content) {
          callback?.({ ok: false, reason: "INVALID_PAYLOAD" });
          return;
        }

        const existingMeeting = await meeting.findById(roomId);
        if (!existingMeeting) {
          callback?.({ ok: false, reason: "MEETING_NOT_FOUND" });
          return;
        }

        const createdComment = await meetingComment.create({
          meetingId: existingMeeting._id,
          roomId,
          content,
          userId: comment?.id || socket.id,
          name: comment?.name || "Guest",
          avatar: comment?.image || "",
          email: comment?.email || "",
        });

        const serializedComment = serializeMeetingComment(createdComment);
        io.to(roomId).emit("meeting-comment-created", serializedComment);
        callback?.({ ok: true, comment: serializedComment });
      } catch {
        callback?.({ ok: false, reason: "CREATE_FAILED" });
      }
    },
  );

  socket.on("disconnect", () => {
    const roomId = removeRoomUser(socket.id);
    if (!roomId) return;

    socket.to(roomId).emit("user-left", socket.id);
    syncRoomUsers(io, roomId);
  });
};

export default P2PHandler;
