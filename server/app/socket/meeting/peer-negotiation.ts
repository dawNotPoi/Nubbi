import type { Server, Socket } from "socket.io";
import { z } from "zod/v3";
import { getSocketActor } from "../authentication";
import { acknowledge } from "./acknowledgement";
import { ensureMeetingRoomActive } from "./room-access";
import { areSocketsInSameRoom, getSocketRoom } from "./room-state";
import { createMeetingIceConfiguration } from "@/services/meeting/ice-configuration";
import { negotiatePeerPair } from "./peer-negotiation-state";

/** 协商只接受目标成员和预期替换的连接代次，不信任客户端提供身份或凭证。 */
const negotiationSchema = z.object({
  targetId: z.string().min(1).max(200),
  expectedConnectionId: z.string().uuid().optional(),
}).strict();

/**
 * 校验双方仍属于有效会议，再签发临时凭证和共享连接代次。
 * @param io 信令服务，用于查找当前目标连接。
 * @param socket 发起请求的已认证连接。
 * @param payload 外部输入；必须先通过运行时校验。
 * @param callback 外部确认回调，由 acknowledge 校验后调用。
 * @returns 处理完成；拒绝时不泄露房间、身份和配置细节。
 */
async function handlePeerNegotiation(
  io: Server,
  socket: Socket,
  payload: unknown,
  callback: unknown,
): Promise<void> {
  const parsedRequest = negotiationSchema.safeParse(payload);
  const requestingActor = getSocketActor(socket);
  const roomId = getSocketRoom(socket.id);
  if (!parsedRequest.success || !requestingActor || !roomId) {
    return acknowledge(callback, { ok: false });
  }

  const { targetId, expectedConnectionId } = parsedRequest.data;
  if (targetId === socket.id || !areSocketsInSameRoom(socket.id, targetId)) {
    return acknowledge(callback, { ok: false });
  }
  if (!await ensureMeetingRoomActive(io, roomId)) {
    return acknowledge(callback, { ok: false });
  }

  // 会议有效性检查包含异步操作，返回后必须再次检查在线身份和房间归属。
  const targetSocket = io.sockets.sockets.get(targetId);
  const isRequesterActive = socket.connected && Boolean(getSocketActor(socket));
  if (!isRequesterActive || !targetSocket || !areSocketsInSameRoom(socket.id, targetId)) {
    return acknowledge(callback, { ok: false });
  }
  const targetActor = getSocketActor(targetSocket);
  if (!targetActor) return acknowledge(callback, { ok: false });

  // 两边凭证都成功生成后才更新协商状态，配置异常不会留下半次协商。
  const requesterIceServers = createMeetingIceConfiguration(requestingActor.id);
  const targetIceServers = createMeetingIceConfiguration(targetActor.id);
  const session = negotiatePeerPair(socket.id, targetId, expectedConnectionId);
  socket.emit("meeting-peer-session", {
    session,
    iceServers: requesterIceServers,
    clientSessionId: socket.data.meetingClientSessionId,
  });
  targetSocket.emit("meeting-peer-session", {
    session,
    iceServers: targetIceServers,
    clientSessionId: targetSocket.data.meetingClientSessionId,
  });
  acknowledge(callback, { ok: true, session, iceServers: requesterIceServers });
}

/**
 * 注册协商事件，协议入口只负责交接请求和兜底失败确认。
 * @param io 信令服务。
 * @param socket 已认证连接。
 * @returns 无；相同代次的重复协商不会重复创建连接。
 */
export function registerPeerNegotiation(io: Server, socket: Socket): void {
  socket.on("negotiateMeetingPeer", (payload: unknown, callback: unknown) => {
    void handlePeerNegotiation(io, socket, payload, callback).catch(() => {
      acknowledge(callback, { ok: false });
    });
  });
}
