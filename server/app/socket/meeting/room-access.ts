import { isMeetingActive } from "@/controller/meeting/realtime";
import type { Server } from "socket.io";
import { endMeetingRoom } from "./room-state";

const ACTIVE_STATE_TTL_MS = 5_000;
const activeStateCache = new Map<
  string,
  { active: boolean; checkedAt: number }
>();

/** 二次校验已入会成员，避免会议状态变化后继续使用实时通道。 */
export const ensureMeetingRoomActive = async (
  io: Server,
  roomId: string,
): Promise<boolean> => {
  const now = Date.now();
  const cached = activeStateCache.get(roomId);
  if (cached && now - cached.checkedAt < ACTIVE_STATE_TTL_MS) {
    return cached.active;
  }

  const active = await isMeetingActive(roomId);
  activeStateCache.set(roomId, { active, checkedAt: now });
  if (active) return true;

  activeStateCache.delete(roomId);
  await endMeetingRoom(io, roomId, "system");
  return false;
};
