import logger from "@/common/logger";
import type { AuthenticatedUser } from "@/lib/authUser";
import { getSessionAuthContextFromHeaders } from "@/middleware/authentication";
import { isAccountDeletionInProgress } from "@/services/auth/account-mutation-guard";
import type { IncomingHttpHeaders } from "node:http";
import type { Server, Socket } from "socket.io";

/** Socket 数据中存放的认证用户 */
type SocketData = {
  actor?: AuthenticatedUser;
};

/** 握手 token 的最大长度，防止超长 token 占满内存 */
const MAX_HANDSHAKE_TOKEN_LENGTH = 16_384;

/** 从 Socket 握手认证数据中提取 token，非法输入返回空字符串 */
function getHandshakeToken(socket: Socket): string | null {
  const token = socket.handshake.auth?.token;
  if (token === undefined) return null;
  if (typeof token !== "string") return "";
  if (!token || token.length > MAX_HANDSHAKE_TOKEN_LENGTH) return "";
  return token;
}

/** 获取 Socket 的认证用户，账号注销中返回 null */
export function getSocketActor(socket: Socket): AuthenticatedUser | null {
  const data = socket.data as SocketData;
  const actor = data.actor;
  return actor && !isAccountDeletionInProgress(actor.id) ? actor : null;
}

/** 断开指定用户的全部 Socket 连接（账号注销时调用） */
export function disconnectUserSockets(io: Server, userId: string): void {
  io.sockets.sockets.forEach((socket) => {
    const actor = (socket.data as SocketData).actor;
    if (actor?.id === userId) socket.disconnect(true);
  });
}

/** Socket.IO 握手认证：提取 token，解析会话，校验注销状态 */
export function authenticateSocket(
  socket: Socket,
  next: (error?: Error) => void,
): void {
  void (async () => {
    const token = getHandshakeToken(socket);
    if (token === "") {
      next(new Error("Unauthorized"));
      return;
    }

    const headers: IncomingHttpHeaders = { ...socket.request.headers };
    if (token) headers.authorization = `Bearer ${token}`;

    const context = await getSessionAuthContextFromHeaders(headers);
    if (!context || isAccountDeletionInProgress(context.user.id)) {
      next(new Error("Unauthorized"));
      return;
    }

    const data = socket.data as SocketData;
    data.actor = context.user;
    next();
  })().catch((error: unknown) => {
    logger.error("Socket 认证服务异常", { error });
    next(new Error("Authentication unavailable"));
  });
}
