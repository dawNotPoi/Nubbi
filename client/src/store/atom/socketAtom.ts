import { getSocketBaseUrl } from "@/utils/env";
import { ensureJwt } from "@/utils/auth";
import { atom } from "jotai";
import { Socket, io } from "socket.io-client";
const url = getSocketBaseUrl();
// socket 实例的 atom

interface SocketState {
  instance: Socket | null;
  connected: boolean;
}
// 连接状态的 atom
export const socketAtom = atom<SocketState>({
  instance: null,
  connected: false,
});

// 初始化 socket 的派生 atom
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
