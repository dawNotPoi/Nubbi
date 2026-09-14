import type { AuthenticatedUser } from "@/lib/authUser";
import type { Server, Socket } from "socket.io";
import type { RoomMedia } from "./schemas";
import type { RoomUserInfo } from "./types";

const socketRooms = new Map<string, string>();
const roomUsers = new Map<string, Map<string, RoomUserInfo>>();
const roomExpirationTimers = new Map<string, NodeJS.Timeout>();
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

export function getSocketRoom(socketId: string): string | null {
  return socketRooms.get(socketId) ?? null;
}

export function getRoomUsers(roomId: string): RoomUserInfo[] {
  return Array.from(roomUsers.get(roomId)?.values() ?? []);
}

export function syncRoomUsers(io: Server, roomId: string): void {
  io.to(roomId).emit("room-users-sync", getRoomUsers(roomId));
}

export function upsertRoomUser(input: {
  roomId: string;
  socketId: string;
  actor: AuthenticatedUser;
  media?: RoomMedia;
}): RoomUserInfo {
  const nextUser: RoomUserInfo = {
    peerId: input.socketId,
    userId: input.actor.id,
    roomId: input.roomId,
    name: input.actor.name || "Guest",
    image: input.actor.image || "",
    isVideoEnabled: input.media?.isVideoEnabled ?? false,
    isAudioEnabled: input.media?.isAudioEnabled ?? false,
  };

  const users =
    roomUsers.get(input.roomId) ?? new Map<string, RoomUserInfo>();
  users.set(input.socketId, nextUser);
  roomUsers.set(input.roomId, users);
  socketRooms.set(input.socketId, input.roomId);
  return nextUser;
}

export function removeRoomUser(socketId: string): string | null {
  const roomId = socketRooms.get(socketId);
  if (!roomId) return null;

  const users = roomUsers.get(roomId);
  users?.delete(socketId);
  if (users?.size === 0) roomUsers.delete(roomId);
  socketRooms.delete(socketId);
  return roomId;
}

export function leaveRoom(
  io: Server,
  socket: Socket,
  roomId: string,
): void {
  socket.leave(roomId);
  const removedRoomId = removeRoomUser(socket.id);
  if (!removedRoomId) return;

  socket.to(removedRoomId).emit("user-left", socket.id);
  syncRoomUsers(io, removedRoomId);
}

export function areSocketsInSameRoom(
  sourceSocketId: string,
  targetSocketId: string,
): boolean {
  const roomId = getSocketRoom(sourceSocketId);
  return Boolean(roomId && getSocketRoom(targetSocketId) === roomId);
}

export async function endMeetingRoom(
  io: Server,
  roomId: string,
  endedBy: string,
): Promise<void> {
  const expirationTimer = roomExpirationTimers.get(roomId);
  if (expirationTimer) clearTimeout(expirationTimer);
  roomExpirationTimers.delete(roomId);

  const socketsInRoom = await io.in(roomId).fetchSockets();
  io.to(roomId).emit("meeting-ended", { roomId, endedBy });

  socketsInRoom.forEach((memberSocket) => {
    memberSocket.leave(roomId);
    removeRoomUser(memberSocket.id);
  });
  roomUsers.delete(roomId);
}

function scheduleExpirationChunk(
  io: Server,
  roomId: string,
  expiresAt: number,
): void {
  const remaining = expiresAt - Date.now();
  if (!Number.isFinite(remaining) || remaining <= 0) {
    roomExpirationTimers.delete(roomId);
    void endMeetingRoom(io, roomId, "system");
    return;
  }

  const timer = setTimeout(
    () => {
      if (roomExpirationTimers.get(roomId) !== timer) return;
      roomExpirationTimers.delete(roomId);
      scheduleExpirationChunk(io, roomId, expiresAt);
    },
    Math.min(remaining, MAX_TIMEOUT_DELAY_MS),
  );
  timer.unref();
  roomExpirationTimers.set(roomId, timer);
}

export function scheduleMeetingRoomExpiration(
  io: Server,
  roomId: string,
  expiresAt: number,
): void {
  const existingTimer = roomExpirationTimers.get(roomId);
  if (existingTimer) clearTimeout(existingTimer);

  scheduleExpirationChunk(io, roomId, expiresAt);
}
