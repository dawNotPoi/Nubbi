import { useMemo, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import type { Socket } from "socket.io-client";
import type { PeerStatusMap } from "./connection-types";
import { PeerNetwork } from "./peer-network";
import type { PeerManager, RemoteStreamMap } from "./types";

/** @param input 信令引用及远端流发布器。@returns 稳定身份的媒体连接协调器和诊断。 */
export function usePeerManager(input: { socketRef: MutableRefObject<Socket | null>; setRemoteStreams: Dispatch<SetStateAction<RemoteStreamMap>> }): { manager: PeerManager; peerStatuses: PeerStatusMap } {
  const { socketRef, setRemoteStreams } = input;
  const [peerStatuses, setPeerStatuses] = useState<PeerStatusMap>({});
  const network = useMemo(() => new PeerNetwork({ socket: () => socketRef.current, onStreams: setRemoteStreams, onStatus: setPeerStatuses }), [socketRef, setRemoteStreams]);
  const manager = useMemo<PeerManager>(() => ({
    configure: (servers) => network.configure(servers),
    reconcile: (peerIds) => network.reconcile(peerIds),
    acceptSession: (session, servers) => network.acceptSession(session, servers),
    suspend: () => network.suspend(),
    acceptSignal: (signal) => network.acceptSignal(signal),
    updateLocalStream: (stream) => network.update(stream),
    removePeer: (peerId) => network.remove(peerId),
    retryPeer: (peerId) => network.retry(peerId),
    destroyAllPeers: () => network.reset(),
  }), [network]);
  return { manager, peerStatuses };
}
