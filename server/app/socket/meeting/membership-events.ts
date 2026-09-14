import {
  authorizeMeetingJoin,
} from "@/controller/meeting/realtime";
import logger from "@/common/logger";
import { runMeetingMutation } from "@/services/meeting/mutation-guard";
import { getSocketActor } from "@/socket/authentication";
import type { Server, Socket } from "socket.io";
import {
  areSocketsInSameRoom,
  getRoomUsers,
  getSocketRoom,
  leaveRoom,
  scheduleMeetingRoomExpiration,
  syncRoomUsers,
  upsertRoomUser,
} from "./room-state";
import {
  joinMeetingSchema,
  signalSchema,
  syncMeetingUserSchema,
} from "./schemas";
import type { JoinMeetingResponse } from "./types";
import { acknowledge } from "./acknowledgement";
import { ensureMeetingRoomActive } from "./room-access";
import { publishCommentSnapshot } from "./comment-snapshot";
import { createMeetingIceConfiguration } from "@/services/meeting/ice-configuration";
import { cancelMemberDeparture, scheduleMemberDeparture } from "./member-recovery";
import { isCurrentNegotiation } from "./peer-negotiation-state";

/** @param reason 入会失败原因。@returns 不暴露成员信息的失败响应。 */
const failedJoin = (
  reason: Extract<JoinMeetingResponse, { ok: false }>["reason"],
): JoinMeetingResponse => ({
  ok: false,
  reason,
  existingPeers: [],
  roomUsers: [],
});

/** @param io 信令服务。@param socket 请求连接。@param payload 待校验请求。@returns 权限检查和成员登记结果。 */
async function joinMeeting(
  io: Server,
  socket: Socket,
  payload: unknown,
): Promise<JoinMeetingResponse> {
  const actor = getSocketActor(socket);
  if (!actor) return failedJoin("UNAUTHORIZED");

  const parsed = joinMeetingSchema.safeParse(payload);
  if (!parsed.success) return failedJoin("INVALID_PAYLOAD");

  return runMeetingMutation(parsed.data.roomId, async () => {
    const access = await authorizeMeetingJoin({
      meetingId: parsed.data.roomId,
      userId: actor.id,
      accessToken: parsed.data.accessToken,
    });
    if (!access.ok) return failedJoin(access.reason);
    if (!getSocketActor(socket)) return failedJoin("UNAUTHORIZED");
    const iceServers = createMeetingIceConfiguration(actor.id);
    scheduleMeetingRoomExpiration(
      io,
      parsed.data.roomId,
      access.expiresAt,
    );

    const previousRoomId = getSocketRoom(socket.id);
    const previousClientSessionId: unknown = socket.data.meetingClientSessionId;
    if (previousRoomId && (previousRoomId !== parsed.data.roomId || previousClientSessionId !== parsed.data.clientSessionId)) {
      leaveRoom(io, socket, previousRoomId);
    }
    socket.data.meetingClientSessionId = parsed.data.clientSessionId;

    const existedInRoom =
      getRoomUsers(parsed.data.roomId).some(
        (roomUser) => roomUser.peerId === socket.id,
      );
    await socket.join(parsed.data.roomId);
    if (!socket.connected || !getSocketActor(socket)) {
      socket.leave(parsed.data.roomId);
      return failedJoin("UNAUTHORIZED");
    }
    const nextUser = upsertRoomUser({
      roomId: parsed.data.roomId,
      socketId: socket.id,
      actor,
      media: parsed.data.media,
    });
    cancelMemberDeparture(socket.id);
    const clients =
      io.sockets.adapter.rooms.get(parsed.data.roomId) ??
      new Set<string>();
    const existingPeers = Array.from(clients).filter(
      (socketId) => socketId !== socket.id,
    );

    if (!existedInRoom) {
      socket.to(parsed.data.roomId).emit("handlerNewUser", nextUser);
    }
    syncRoomUsers(io, parsed.data.roomId);

    return {
      ok: true,
      iceServers,
      existingPeers,
      roomUsers: getRoomUsers(parsed.data.roomId),
    };
  });
}

/** @param io 信令服务。@param socket 已认证连接。@returns 无；注册加入、状态同步和代次校验信令。 */
export function registerMeetingMembershipEvents(
  io: Server,
  socket: Socket,
): void {
  socket.on(
    "joinMeetingRoom",
    (
      payload: unknown,
      callback?: unknown,
    ) => {
      void joinMeeting(io, socket, payload)
        .then((response) => {
          acknowledge(callback, response);
          const roomId = getSocketRoom(socket.id);
          if (response.ok && roomId) publishCommentSnapshot(socket, roomId);
        })
        .catch((error: unknown) => {
          logger.error("加入会议房间失败", { socketId: socket.id, error });
          acknowledge(callback, failedJoin("JOIN_FAILED"));
        });
    },
  );

  socket.on("syncMeetingUser", (payload: unknown) => {
    void (async () => {
      const actor = getSocketActor(socket);
      const parsed = syncMeetingUserSchema.safeParse(payload);
      if (!actor || !parsed.success) return;
      if (getSocketRoom(socket.id) !== parsed.data.roomId) return;
      if (!(await ensureMeetingRoomActive(io, parsed.data.roomId))) return;
      if (!socket.connected || !getSocketActor(socket)) return;
      if (getSocketRoom(socket.id) !== parsed.data.roomId) return;

      upsertRoomUser({
        roomId: parsed.data.roomId,
        socketId: socket.id,
        actor,
        media: parsed.data.media,
      });
      syncRoomUsers(io, parsed.data.roomId);
    })().catch((error: unknown) => {
      logger.error("会议成员状态同步失败", { socketId: socket.id, error });
    });
  });

  socket.on("signal", (payload: unknown) => {
    void (async () => {
      if (!getSocketActor(socket)) return;
      const parsed = signalSchema.safeParse(payload);
      if (!parsed.success) return;
      const roomId = getSocketRoom(socket.id);
      if (!roomId) return;
      if (!areSocketsInSameRoom(socket.id, parsed.data.targetId)) return;
      if (!isCurrentNegotiation(socket.id, parsed.data.targetId, parsed.data.connectionId)) return;
      if (!(await ensureMeetingRoomActive(io, roomId))) return;
      if (!socket.connected || !getSocketActor(socket)) return;
      if (!areSocketsInSameRoom(socket.id, parsed.data.targetId)) return;
      if (!isCurrentNegotiation(socket.id, parsed.data.targetId, parsed.data.connectionId)) return;

      io.to(parsed.data.targetId).emit("signal", {
        senderId: socket.id,
        clientSessionId: io.sockets.sockets.get(parsed.data.targetId)?.data.meetingClientSessionId,
        connectionId: parsed.data.connectionId,
        signal: parsed.data.signal,
      });
    })().catch((error: unknown) => {
      logger.error("会议信令转发失败", { socketId: socket.id, error });
    });
  });

  socket.on("disconnect", (reason) => scheduleMemberDeparture(io, socket, reason));
}
