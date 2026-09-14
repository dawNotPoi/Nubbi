import { Server, Socket } from "socket.io";

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

const socketRooms = new Map<string, string>();
const roomUsers = new Map<string, Map<string, RoomUserInfo>>();

function getRoomUsers(roomId: string) {
  return Array.from(roomUsers.get(roomId)?.values() || []);
}

function syncRoomUsers(io: Server, roomId: string) {
  io.to(roomId).emit("room-users-sync", getRoomUsers(roomId));
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
      callback?.({ existingPeers, roomUsers: getRoomUsers(roomId) });
    },
  );

  socket.on("signal", (data) => {
    io.to(data.targetId).emit("signal", {
      senderId: socket.id,
      signal: data.signal,
    });
  });

  socket.on("disconnect", () => {
    const roomId = removeRoomUser(socket.id);
    if (!roomId) return;

    socket.to(roomId).emit("user-left", socket.id);
    syncRoomUsers(io, roomId);
  });
};

export default P2PHandler;
