import { atom } from "jotai";
import { Socket, io } from "socket.io-client";
const url = import.meta.env.VITE_SOCKET_URL;
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
    reconnection: true,
    reconnectionAttempts: 5,
  });
  console.log(socket);
  socket.connect();
  socket.on("connect", () => {
    console.log("connect sucess");
    set(socketAtom, (state) => ({ ...state, connected: true }));
  });

  socket.on("disconnect", () => {
    console.log("connect close");
    set(socketAtom, (state) => ({ ...state, connected: false }));
  });

  set(socketAtom, { instance: socket, connected: socket.connected });

  return () => {
    socket.disconnect();
    set(socketAtom, { instance: null, connected: false });
  };
});
