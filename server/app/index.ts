import { toNodeHandler } from "better-auth/node";
import cors, { type CorsOptions, type CorsOriginCallback } from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import logger from "./common/logger";
import { auth } from "./lib/auth";
import env from "./lib/env";
import { isTrustedOrigin } from "./lib/trusted-origins";
import { trackBetterAuthMutation } from "./middleware/better-auth-mutation";
import { errorHandler, withAccountContext } from "./middleware/common";
import { requestLogger } from "./middleware/requestLogger";
import { rejectScopedApiKeys } from "./middleware/session";
import { subscribeAccountDeletionStart } from "./services/auth/account-mutation-guard";
import {
  prepareFileUploadInfrastructure,
  startFileUploadMaintenance,
} from "./services/fileUpload/maintenance";
import { startImageCleanupMaintenance } from "./services/image/cleanup";
import { subscribeMeetingRoomClosure } from "./services/meeting/room-events";
import { startNotePurgeMaintenance } from "./services/note/purge";
import { startStorageCleanupMaintenance } from "./services/storageCleanupQueue";

import authRouter from "./routes/auth";
import fileRouter from "./routes/file";
import imageRouter from "./routes/image";
import meetingRouter from "./routes/meeting";
import noteRouter from "./routes/note";
import mcpApiRouter from "./routes/mcp";
import summaryRouter from "./routes/summary";
import tagRouter from "./routes/tag";

import {
  authenticateSocket,
  disconnectUserSockets,
} from "./socket/authentication";
import registerMeetingSocketHandlers from "./socket/meeting";
import { endMeetingRoom } from "./socket/meeting/room-state";
import userHandlers from "./socket/user-handler";
const app = express();
const server = new http.Server(app);
const betterAuthHandler = toNodeHandler(auth);

if (env.TRUST_PROXY_HOPS > 0) {
  app.set("trust proxy", env.TRUST_PROXY_HOPS);
}

const resolveCorsOrigin = (
  origin: string | undefined,
  callback: CorsOriginCallback,
): void => {
  callback(null, isTrustedOrigin(origin));
};

const corsOptions: CorsOptions = {
  origin: resolveCorsOrigin,
  credentials: true, // 允许携带凭证（如 cookies）
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-API-Key", "Range"], // 允许的请求头
  exposedHeaders: [
    "set-auth-token",
    "set-auth-jwt",
    "Accept-Ranges",
    "Content-Length",
    "Content-Range",
  ],
};
app.use(cors(corsOptions));

// CORS 中间件已处理 OPTIONS 预检请求，无需额外 app.options
const socketIO = new Server({
  connectionStateRecovery: { maxDisconnectionDuration: 15_000, skipMiddlewares: false },
  cors: {
    origin: resolveCorsOrigin,
    credentials: true,
  },
});
subscribeAccountDeletionStart((userId) =>
  disconnectUserSockets(socketIO, userId),
);

// 请求日志
app.use(requestLogger);
//拦截用户信息请求
// 将所有 /api/auth/* 请求转发给 Better Auth 处理器
app.all(
  "/api/auth/*splat",
  trackBetterAuthMutation,
  withAccountContext((req, res) => betterAuthHandler(req, res)),
);

// 解析 JSON 和 URL 编码请求体（Express 5 内置，替代 body-parser）
app.use(express.json({ limit: "10MB" }));
app.use(express.urlencoded({ extended: false, limit: "10MB" }));

//测试是否能正常访问
app.get("/", (req, res) => {
  res.json({
    message: "Hello !",
  });
});

//接口路由处理
app.use("/auth", authRouter);
app.use("/note", noteRouter);
app.use("/mcp-api", mcpApiRouter);
app.use(
  ["/tag", "/file", "/summary", "/meeting", "/image"],
  rejectScopedApiKeys,
);
app.use("/tag", tagRouter);
app.use("/file", fileRouter);
app.use("/summary", summaryRouter);

app.use("/meeting", meetingRouter);
app.use("/image", imageRouter);

// 404 处理
app.use((req, res) => {
  res.status(404).json({ code: 0, message: "Not Found", data: null });
});
app.use(errorHandler);

socketIO.use(authenticateSocket);
socketIO.on("connection", (socket) => {
  logger.info(`⚡: ${socket.id} 用户已连接!`);
  userHandlers(socketIO, socket);

  registerMeetingSocketHandlers(socketIO, socket);
  socket.on("disconnect", () => {
    logger.info(`🔥: ${socket.id} 用户已断开连接!`);
  });
});
subscribeMeetingRoomClosure(({ roomId, endedBy }) =>
  endMeetingRoom(socketIO, roomId, endedBy),
);

await prepareFileUploadInfrastructure();
socketIO.listen(env.SOCKET_PORT);
server.listen(env.SERVER_PORT, () => {
  startStorageCleanupMaintenance();
  startImageCleanupMaintenance();
  startNotePurgeMaintenance();
  logger.info(`服务器端口: ${env.SERVER_PORT}`);
  void startFileUploadMaintenance().catch((error) => {
    logger.error("文件上传维护任务启动失败", { error });
  });
});
