import { toNodeHandler } from "better-auth/node";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import logger from "./common/logger";
import { auth } from "./lib/auth";
import env from "./lib/env";
import { errorHandler } from "./middleware/common";
import { requestLogger } from "./middleware/requestLogger";

import authRouter from "./routes/auth";
import fileRouter from "./routes/file";
import imageRouter from "./routes/image";
import meetingRouter from "./routes/meeting";
import noteRouter from "./routes/note";
import summryRouter from "./routes/summary";

import P2PHandler from "./socket/P2PHandler";
import userHandlers from "./socket/userHandler";
const app = express();
const server = new http.Server(app);
// 服务器响应端口
const PORT = env.SERVER_PORT || 4000;
// socket端口
const SOCKETPORT = env.SOCKET_PORT || 4040;

//跨域处理
const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (error: Error | null, allow?: boolean | string) => void,
  ) => {
    callback(null, origin || true);
  },
  credentials: true, // 允许携带凭证（如 cookies）
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Range"], // 允许的请求头
  exposedHeaders: [
    "set-auth-token",
    "set-auth-jwt",
    "Accept-Ranges",
    "Content-Length",
    "Content-Range",
  ],
};
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
const socketIO = new Server(SOCKETPORT as number, {
  cors: {
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean | string) => void,
    ) => {
      callback(null, origin || true);
    },
    credentials: true,
  },
});

// 请求日志
app.use(requestLogger);
//拦截用户信息请求
app.all("/api/auth/*", toNodeHandler(auth));

//进行表单上传时，默认限制100kb，要使用文件上传需要修改限制
app.use(bodyParser.json({ limit: "10MB" }));
app.use(bodyParser.urlencoded({ extended: false, limit: "10MB" }));

//测试是否能正常访问
app.get("/", (req, res) => {
  res.json({
    message: "Hello !",
  });
});

//接口路由处理
app.use("/auth", authRouter);
app.use("/note", noteRouter);
app.use("/download", express.static("static"));
app.use("/file", fileRouter);
app.use("/summary", summryRouter);

app.use("/meeting", meetingRouter);
app.use("/image", imageRouter);

app.use(errorHandler);
// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

server.listen(PORT, () => {
  logger.info(`服务器端口: ${PORT}`);
});

socketIO.on("connection", (socket) => {
  logger.info(`⚡: ${socket.id} 用户已连接!`);
  userHandlers(socketIO, socket);

  P2PHandler(socketIO, socket);
  socket.on("disconnect", () => {
    logger.info(`🔥: ${socket.id} 用户已断开连接!`);
  });
});
