import { useCallback, useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { io, Socket } from "socket.io-client";
const SocketUrl = import.meta.env.VITE_SOCKET_URL;

const useP2PConnection = () => {
  const socketRef = useRef<Socket | null>(null);

  const [remoteStreams, setRemoteStreams] = useState<{
    [id: string]: MediaStream;
  }>({});
  const peersRef = useRef<{ [id: string]: Peer.Instance }>({});
  const createPeer = (
    peerId: string,
    initiator: boolean,
    stream: MediaStream
  ) => {
    const peer = new Peer({
      initiator: initiator, //true 发送offer，false 接受offer
      trickle: false, //禁用ICE的trickle模式 简化指令
      stream: stream, //附加本地媒体流
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    });

    peer.on("signal", (signal) => {
      socketRef.current?.emit("signal", { targetId: peerId, signal });
    });

    peer.on("stream", (remoteStream) => {
      console.log(`收到收到来自&{peerId}的流`, remoteStream);
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: remoteStream, // 将流与 PeerId 绑定
      }));
    });

    peer.on("close", () => {
      console.log(`Peer ${peerId} closed.`);
      delete peersRef.current[peerId];
      setRemoteStreams((prev) => {
        const updatedStreams = { ...prev };
        delete updatedStreams[peerId];
        console.log(updatedStreams);
        return updatedStreams;
      });
    });
    peer.on("error", (err) => {
      console.error(`Peer ${peerId} 错误:`, err);
    });

    return peer;
  };

  const connectToPeer = useCallback((roomId: string, stream: MediaStream) => {
    const socket = socketRef.current;
    if (!socket || !stream) return;
    //处理新用户加入
    socket.on("handlerNewUser", (data: { userId: string; peerId: string }) => {
      console.log("handlerNewUser", data.peerId);
      const peer = createPeer(data.peerId, true, stream);
      peersRef.current[data.peerId] = peer;
    });
    //处理用户离开
    socket.on("user-left", (userId: string) => {
      console.log(`Peer ${userId} closed.`);
      delete peersRef.current[userId];
      setRemoteStreams((prev) => {
        const updatedStreams = { ...prev };
        delete updatedStreams[userId];
        console.log(updatedStreams);
        return updatedStreams;
      });
    });

    //处理p2p信号交换
    socket.on(
      "signal",
      (data: { senderId: string; signal: Peer.SignalData }) => {
        const peer = peersRef.current[data.senderId];
        if (peer && !peer.destroyed) {
          peer.signal(data.signal);
        }
      }
    );
    //加入房间 获取到所有用户信息并发送offer
    socket.emit("joinRoom", { roomId }, (existingPeers: string[]) => {
      existingPeers.forEach((peerId) => {
        console.log("连接到已有用户", peerId);
        const peer = createPeer(peerId, false, stream);
        peersRef.current[peerId] = peer;
      });
    });
  }, []);

  const destroyPeerConnections = () => {
    console.log("销毁所有Peer连接");
    Object.values(peersRef.current).forEach((peer) => {
      console.log("peer", peer);

      peer.destroy();
    });
  };
  //初始化socket连接
  useEffect(() => {
    socketRef.current = io(SocketUrl);
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return { connectToPeer, remoteStreams, destroyPeerConnections, peersRef };
};

export default useP2PConnection;
