import type { AuthenticatedUser } from "@/lib/authUser";
import type { Server, Socket } from "socket.io";
import type { RoomMedia } from "./schemas";
import type { RoomUserInfo } from "./types";
import { removePeerNegotiations } from "./peer-negotiation-state";

/** socketId → roomId 的映射 */
const socketRooms = new Map<string, string>();
/** roomId → 房间成员信息映射 */
const roomUsers = new Map<string, Map<string, RoomUserInfo>>();
/** roomId → 房间过期定时器 */
const roomExpirationTimers = new Map<string, NodeJS.Timeout>();
/** setTimeout 最大延迟（约 24.8 天），超出需分块调度 */
const MAX_TIMEOUT_DELAY_MS = 2_147_483_647;

/** 查询 socket 所在的房间 */
export function getSocketRoom(socketId: string): string | null {
  return socketRooms.get(socketId) ?? null;
}

/** 获取房间内的全部成员信息 */
export function getRoomUsers(roomId: string): RoomUserInfo[] {
  return Array.from(roomUsers.get(roomId)?.values() ?? []);
}

/** 向房间广播最新的成员列表 */
export function syncRoomUsers(io: Server, roomId: string): void {
  io.to(roomId).emit("room-users-sync", getRoomUsers(roomId));
}

/** 将用户加入房间并登记成员信息，返回成员对象 */
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
    isScreenSharing: input.media?.isScreenSharing ?? false,
  };

  const users =
    roomUsers.get(input.roomId) ?? new Map<string, RoomUserInfo>();
  users.set(input.socketId, nextUser);
  roomUsers.set(input.roomId, users);
  socketRooms.set(input.socketId, input.roomId);
  return nextUser;
}

/** 移除房间成员，返回其所在房间 ID（若存在） */
export function removeRoomUser(socketId: string): string | null {
  removePeerNegotiations(socketId);
  const roomId = socketRooms.get(socketId);
  if (!roomId) return null;

  const users = roomUsers.get(roomId);
  users?.delete(socketId);
  if (users?.size === 0) roomUsers.delete(roomId);
  socketRooms.delete(socketId);
  return roomId;
}

/** 让 socket 离开房间并广播通知 */
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

/** 判断两个 socket 是否在同一房间 */
export function areSocketsInSameRoom(
  sourceSocketId: string,
  targetSocketId: string,
): boolean {
  const roomId = getSocketRoom(sourceSocketId);
  return Boolean(roomId && getSocketRoom(targetSocketId) === roomId);
}

/** 结束会议房间：清空定时器、广播通知、断开所有成员 */
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
  // 短断成员不在活动 Socket 列表里，也必须清除房间身份及连接代次。
  for (const user of getRoomUsers(roomId)) removeRoomUser(user.peerId);
  roomUsers.delete(roomId);
}

/** 分块调度会议过期：避免超出 setTimeout 最大延迟 */
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

/** 安排会议房间在指定时间自动结束 */
export function scheduleMeetingRoomExpiration(
  io: Server,
  roomId: string,
  expiresAt: number,
): void {
  const existingTimer = roomExpirationTimers.get(roomId);
  if (existingTimer) clearTimeout(existingTimer);

  scheduleExpirationChunk(io, roomId, expiresAt);
}
