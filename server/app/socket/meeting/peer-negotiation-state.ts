import { randomUUID } from "node:crypto";

/** 服务端签发的双方连接代次，防止恢复时互相抢占。 */
export type PeerNegotiation = { connectionId: string; revision: number; initiatorId: string; peerIds: string[] };
const connections = new Map<string, PeerNegotiation>();

/** @param first 成员一。@param second 成员二。@returns 与成员顺序无关的键。 */
function pairKey(first: string, second: string): string { return JSON.stringify([first, second].sort()); }

/** @param socketId 离开的成员。@returns 无；丢弃相关连接代次。 */
export function removePeerNegotiations(socketId: string): void {
  for (const [key, session] of connections) if (session.peerIds.includes(socketId)) connections.delete(key);
}

/** @param senderId 发送方。@param targetId 接收方。@param connectionId 连接代次。@returns 信令是否属于当前连接。 */
export function isCurrentNegotiation(senderId: string, targetId: string, connectionId: string): boolean {
  return connections.get(pairKey(senderId, targetId))?.connectionId === connectionId;
}

/** @param first 成员一。@param second 成员二。@param expectedConnectionId 请求替换的旧连接。@returns 同步比较并交换后的唯一协商结果。 */
export function negotiatePeerPair(first: string, second: string, expectedConnectionId?: string): PeerNegotiation {
  const key = pairKey(first, second);
  const current = connections.get(key);
  if (current && current.connectionId !== expectedConnectionId) return current;
  const session = { connectionId: randomUUID(), revision: (current?.revision ?? 0) + 1, initiatorId: [first, second].sort()[0], peerIds: [first, second] };
  connections.set(key, session);
  return session;
}
