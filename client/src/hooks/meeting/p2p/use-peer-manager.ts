import {
  useCallback,
  useMemo,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import Peer from "simple-peer";
import type { Socket } from "socket.io-client";
import type {
  PeerManager,
  RemoteStreamMap,
} from "./types";

type UsePeerManagerInput = {
  socketRef: MutableRefObject<Socket | null>;
  setRemoteStreams: Dispatch<SetStateAction<RemoteStreamMap>>;
};

function syncPeerTracks(peer: Peer.Instance, stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    try {
      peer.addTrack(track, stream);
    } catch (error) {
      console.error("Failed to add local track to peer.", error);
    }
  });
}

export function usePeerManager({
  socketRef,
  setRemoteStreams,
}: UsePeerManagerInput): PeerManager {
  const peersRef = useRef<Record<string, Peer.Instance>>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingSignalsRef = useRef<
    Record<string, Peer.SignalData[]>
  >({});

  const createPeer = useCallback(
    (
      peerId: string,
      initiator: boolean,
      stream: MediaStream | null,
    ): Peer.Instance => {
      const syncRemoteStream = (remoteStream: MediaStream): void => {
        setRemoteStreams((previous) => ({
          ...previous,
          [peerId]: remoteStream,
        }));
      };
      const peer = new Peer({
        initiator,
        trickle: false,
        stream: stream || undefined,
        config: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        },
      });

      peer.on("signal", (signal) => {
        socketRef.current?.emit("signal", { targetId: peerId, signal });
      });
      peer.on("stream", syncRemoteStream);
      peer.on("track", (_track, remoteStream) => {
        if (remoteStream) syncRemoteStream(remoteStream);
      });
      peer.on("close", () => {
        delete peersRef.current[peerId];
        setRemoteStreams((previous) => {
          const nextStreams = { ...previous };
          delete nextStreams[peerId];
          return nextStreams;
        });
      });
      peer.on("error", (error) => {
        console.error(`Peer ${peerId} error:`, error);
      });
      return peer;
    },
    [setRemoteStreams, socketRef],
  );

  const flushPendingSignals = useCallback((peerId: string): void => {
    const peer = peersRef.current[peerId];
    const pendingSignals = pendingSignalsRef.current[peerId];
    if (!peer || !pendingSignals?.length) return;

    pendingSignals.forEach((signal) => {
      if (!peer.destroyed) peer.signal(signal);
    });
    delete pendingSignalsRef.current[peerId];
  }, []);

  const ensurePeerConnection = useCallback(
    (peerId: string, initiator: boolean): Peer.Instance => {
      const existingPeer = peersRef.current[peerId];
      if (existingPeer && !existingPeer.destroyed) return existingPeer;

      const peer = createPeer(peerId, initiator, localStreamRef.current);
      peersRef.current[peerId] = peer;
      flushPendingSignals(peerId);
      return peer;
    },
    [createPeer, flushPendingSignals],
  );

  const updateLocalStream = useCallback(
    (stream: MediaStream | null): void => {
      const previousStream = localStreamRef.current;
      localStreamRef.current = stream;
      if (!stream || previousStream === stream) return;

      Object.values(peersRef.current).forEach((peer) => {
        if (!peer.destroyed) syncPeerTracks(peer, stream);
      });
    },
    [],
  );

  const removePeer = useCallback(
    (peerId: string): void => {
      const peer = peersRef.current[peerId];
      if (peer && !peer.destroyed) peer.destroy();
      delete peersRef.current[peerId];
      delete pendingSignalsRef.current[peerId];
      setRemoteStreams((previous) => {
        const nextStreams = { ...previous };
        delete nextStreams[peerId];
        return nextStreams;
      });
    },
    [setRemoteStreams],
  );

  const acceptSignal = useCallback(
    (data: { senderId: string; signal: Peer.SignalData }): void => {
      const peer = peersRef.current[data.senderId];
      if (peer && !peer.destroyed) {
        peer.signal(data.signal);
        return;
      }
      const pendingSignals = pendingSignalsRef.current[data.senderId] ?? [];
      pendingSignals.push(data.signal);
      pendingSignalsRef.current[data.senderId] = pendingSignals;
      ensurePeerConnection(data.senderId, false);
    },
    [ensurePeerConnection],
  );

  const destroyAllPeers = useCallback((): void => {
    Object.values(peersRef.current).forEach((peer) => peer.destroy());
    peersRef.current = {};
    localStreamRef.current = null;
    pendingSignalsRef.current = {};
    setRemoteStreams({});
  }, [setRemoteStreams]);

  return useMemo(
    () => ({
      peersRef,
      localStreamRef,
      pendingSignalsRef,
      ensurePeerConnection,
      updateLocalStream,
      removePeer,
      acceptSignal,
      destroyAllPeers,
    }),
    [
      acceptSignal,
      destroyAllPeers,
      ensurePeerConnection,
      removePeer,
      updateLocalStream,
    ],
  );
}
