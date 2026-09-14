import type Peer from "simple-peer";

const sentTracks = new WeakMap<Peer.Instance, Map<string, MediaStreamTrack>>();

/** @param peer 新连接。@param stream 构造连接时已发送的流。@returns 无。 */
export function rememberPeerTracks(peer: Peer.Instance, stream: MediaStream | null): void {
  sentTracks.set(peer, new Map(stream?.getTracks().map((track) => [track.kind, track]) ?? []));
}

/** @param peer 已有连接。@param stream 身份保持稳定的本地流。@returns 无；支持首次开麦、换设备及共享。 */
export function syncPeerTracks(peer: Peer.Instance, stream: MediaStream): void {
  const previous = sentTracks.get(peer) ?? new Map<string, MediaStreamTrack>();
  const next = new Map(stream.getTracks().map((track) => [track.kind, track]));
  for (const kind of ["audio", "video"]) {
    const oldTrack = previous.get(kind);
    const newTrack = next.get(kind);
    if (oldTrack === newTrack) continue;
    if (oldTrack && newTrack) peer.replaceTrack(oldTrack, newTrack, stream);
    else if (oldTrack) peer.removeTrack(oldTrack, stream);
    else if (newTrack) peer.addTrack(newTrack, stream);
  }
  sentTracks.set(peer, next);
}
