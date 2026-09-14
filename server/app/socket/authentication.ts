import logger from "@/common/logger";
import type { AuthenticatedUser } from "@/lib/authUser";
import { getSessionAuthContextFromHeaders } from "@/middleware/authentication";
import { isAccountDeletionInProgress } from "@/services/auth/account-mutation-guard";
import type { IncomingHttpHeaders } from "node:http";
import type { Server, Socket } from "socket.io";

type SocketData = {
  actor?: AuthenticatedUser;
};

const MAX_HANDSHAKE_TOKEN_LENGTH = 16_384;

function getHandshakeToken(socket: Socket): string | null {
  const token = socket.handshake.auth?.token;
  if (token === undefined) return null;
  if (typeof token !== "string") return "";
  if (!token || token.length > MAX_HANDSHAKE_TOKEN_LENGTH) return "";
  return token;
}

export function getSocketActor(socket: Socket): AuthenticatedUser | null {
  const data = socket.data as SocketData;
  const actor = data.actor;
  return actor && !isAccountDeletionInProgress(actor.id) ? actor : null;
}

export function disconnectUserSockets(io: Server, userId: string): void {
  io.sockets.sockets.forEach((socket) => {
    const actor = (socket.data as SocketData).actor;
    if (actor?.id === userId) socket.disconnect(true);
  });
}

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
