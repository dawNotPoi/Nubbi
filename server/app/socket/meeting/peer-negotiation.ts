import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { getSocketActor } from "../authentication";
import { acknowledge } from "./acknowledgement";
import { ensureMeetingRoomActive } from "./room-access";
import { areSocketsInSameRoom, getSocketRoom } from "./room-state";
import { createMeetingIceConfiguration } from "@/services/meeting/ice-configuration";
import { negotiatePeerPair } from "./peer-negotiation-state";

const negotiationSchema = z.object({ targetId: z.string().min(1).max(200), expectedConnectionId: z.string().uuid().optional() }).strict();

/** @param io 信令服务。@param socket 已认证连接。@returns 无；注册可安全重复的协商请求。 */
export function registerPeerNegotiation(io: Server, socket: Socket): void {
  socket.on("negotiateMeetingPeer", (payload: unknown, callback: unknown) => {
    void (async () => {
      const parsed = negotiationSchema.safeParse(payload);
      const actor = getSocketActor(socket);
      const roomId = getSocketRoom(socket.id);
      if (!parsed.success || !actor || !roomId || parsed.data.targetId === socket.id) return acknowledge(callback, { ok: false });
      const { targetId, expectedConnectionId } = parsed.data;
      if (!areSocketsInSameRoom(socket.id, targetId) || !await ensureMeetingRoomActive(io, roomId)) return acknowledge(callback, { ok: false });
      if (!socket.connected || !getSocketActor(socket) || !io.sockets.sockets.has(targetId) || !areSocketsInSameRoom(socket.id, targetId)) return acknowledge(callback, { ok: false });
      const iceServers = createMeetingIceConfiguration(actor.id);
      const target = io.sockets.sockets.get(targetId);
      const targetActor = target && getSocketActor(target);
      if (!targetActor) return acknowledge(callback, { ok: false });
      const targetIceServers = createMeetingIceConfiguration(targetActor.id);
      const session = negotiatePeerPair(socket.id, targetId, expectedConnectionId);
      socket.emit("meeting-peer-session", { session, iceServers, clientSessionId: socket.data.meetingClientSessionId });
      target.emit("meeting-peer-session", { session, iceServers: targetIceServers, clientSessionId: target.data.meetingClientSessionId });
      acknowledge(callback, { ok: true, session, iceServers });
    })().catch(() => acknowledge(callback, { ok: false }));
  });
}
