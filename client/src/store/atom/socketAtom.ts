import { getSocketBaseUrl } from "@/utils/env";
import { atom } from "jotai";
import { Socket, io } from "socket.io-client";
import { authSessionCoordinator } from "@/features/auth/model/session-coordinator";
import {
  isAccountScopeCurrent,
  requireAccountScope,
} from "@/features/auth/model/account-scope";
import { authLifecycleRegistry } from "@/features/auth/model/auth-lifecycle";
const url = getSocketBaseUrl();
// socket 实例的 atom

/** Socket 连接状态快照 */
interface SocketState {
  instance: Socket | null;
  connected: boolean;
  ownerId: string | null;
  generation: number | null;
}

/** 当前 Socket 实例及连接状态 */
export const socketAtom = atom<SocketState>({
  instance: null,
  connected: false,
  ownerId: null,
  generation: null,
});

let unregisterSocketLifecycle: (() => void) | null = null;

/**
 * 彻底解绑 Socket 监听器、关闭自动重连并断开实例。
 * @param socket 待销毁的 Socket 实例。
 * @returns 无返回值。
 */
const destroySocket = (socket: Socket): void => {
  socket.removeAllListeners();
  socket.io.reconnection(false);
  socket.disconnect();
  socket.io.removeAllListeners();
};

/**
 * 初始化 Socket 连接的写入 atom。
 * 连接成功后建立 connect/disconnect 监听，返回清理函数用于断开。
 */
export const initSocketAtom = atom(null, (get, set) => {
  const scope = requireAccountScope();
  const previous = get(socketAtom);
  if (previous.instance) destroySocket(previous.instance);
  unregisterSocketLifecycle?.();

  const socket = io(url, {
    autoConnect: false,
    withCredentials: true,
    auth: (callback) => {
      void authSessionCoordinator.ensureCredential()
        .then((credential) => {
          const valid =
            credential &&
            isAccountScopeCurrent(scope) &&
            credential.userId === scope.ownerId &&
            credential.generation === scope.generation;
          callback(valid ? { token: credential.token } : {});
        })
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

  set(socketAtom, {
    instance: socket,
    connected: socket.connected,
    ownerId: scope.ownerId,
    generation: scope.generation,
  });

  const cleanup = (): void => {
    destroySocket(socket);
    if (get(socketAtom).instance === socket) {
      set(socketAtom, {
        instance: null,
        connected: false,
        ownerId: null,
        generation: null,
      });
    }
  };
  const unregisterLifecycle = authLifecycleRegistry.register({
    id: "global-socket",
    disconnect: cleanup,
  });
  unregisterSocketLifecycle = unregisterLifecycle;

  return () => {
    unregisterLifecycle();
    if (unregisterSocketLifecycle === unregisterLifecycle) {
      unregisterSocketLifecycle = null;
    }
    cleanup();
  };
});
