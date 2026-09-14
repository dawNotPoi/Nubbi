import { getSocketBaseUrl } from "@/utils/env";
import { ensureJwt } from "@/utils/auth";
import { atom } from "jotai";
import { Socket, io } from "socket.io-client";
const url = getSocketBaseUrl();
// socket 实例的 atom

/** Socket 连接状态快照 */
interface SocketState {
  instance: Socket | null;
  connected: boolean;
}

/** 当前 Socket 实例及连接状态 */
export const socketAtom = atom<SocketState>({
  instance: null,
  connected: false,
});

/**
 * 初始化 Socket 连接的写入 atom。
 * 连接成功后建立 connect/disconnect 监听，返回清理函数用于断开。
 */
export const initSocketAtom = atom(null, (_, set) => {
  const socket = io(url, {
    autoConnect: false,
    withCredentials: true,
    auth: (callback) => {
      void ensureJwt()
        .then((token) => callback(token ? { token } : {}))
        .catch(() => callback({}));
    },
    reconnection: true,
    reconnectionAttempts: 5,
  });
  socket.connect();
  socket.on("connect", () => {
    set(socketAtom, (state) => ({ ...state, connected: true }));
  });

  socket.on("disconnect", () => {
    set(socketAtom, (state) => ({ ...state, connected: false }));
  });

  set(socketAtom, { instance: socket, connected: socket.connected });

  return () => {
    socket.disconnect();
    set(socketAtom, { instance: null, connected: false });
  };
});
