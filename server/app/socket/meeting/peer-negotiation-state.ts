import { randomUUID } from "node:crypto";

/** 服务端签发的双方连接代次，防止恢复时互相抢占。 */
export type PeerNegotiation = {
  connectionId: string;
  revision: number;
  initiatorId: string;
  peerIds: string[];
};

/** 当前单进程内每对成员只持有一份协商状态，成员退出后清理。 */
const negotiationsByPair = new Map<string, PeerNegotiation>();

/**
 * @param first 成员一。@param second 成员二。@returns 与成员顺序无关的键。
 */
function createPeerPairKey(first: string, second: string): string {
  return JSON.stringify([first, second].sort());
}

/**
 * @param socketId 离开的成员。@returns 无；丢弃相关连接代次。
 */
export function removePeerNegotiations(socketId: string): void {
  for (const [pairKey, negotiation] of negotiationsByPair) {
    if (negotiation.peerIds.includes(socketId)) negotiationsByPair.delete(pairKey);
  }
}

/**
 * @param senderId 发送方。@param targetId 接收方。@param connectionId 连接代次。@returns 信令是否属于当前连接。
 */
export function isCurrentNegotiation(senderId: string, targetId: string, connectionId: string): boolean {
  return negotiationsByPair.get(createPeerPairKey(senderId, targetId))?.connectionId === connectionId;
}

/**
 * 同步比较旧代次并生成新协商，避免双方同时重建时产生两个不同的连接。
 * @param first 成员一的 Socket ID。
 * @param second 成员二的 Socket ID。
 * @param expectedConnectionId 请求替换的旧连接；不传表示获取或创建当前协商。
 * @returns 当前可使用的唯一协商结果，过期的替换请求复用最新结果。
 */
export function negotiatePeerPair(first: string, second: string, expectedConnectionId?: string): PeerNegotiation {
  const pairKey = createPeerPairKey(first, second);
  const currentNegotiation = negotiationsByPair.get(pairKey);
  if (currentNegotiation && currentNegotiation.connectionId !== expectedConnectionId) {
    return currentNegotiation;
  }

  const nextNegotiation: PeerNegotiation = {
    connectionId: randomUUID(),
    revision: (currentNegotiation?.revision ?? 0) + 1,
    // 确定性的排序使请求到达顺序不影响发起方选择。
    initiatorId: [first, second].sort()[0],
    peerIds: [first, second],
  };
  negotiationsByPair.set(pairKey, nextNegotiation);
  return nextNegotiation;
}
