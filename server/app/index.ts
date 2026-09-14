import { toNodeHandler } from "better-auth/node";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import log from "./common/chalk";
import { auth } from "./lib/auth";
import env from "./lib/env";
import { initMediasoup } from "./lib/media";
import { errorHandler } from "./middleware/common";
import admin from "./routes/admin";
import commentRouter from "./routes/comment";
import fileRouter from "./routes/file";
import imageRouter from "./routes/image";
import meetingRouter from "./routes/meeting";
import postRouter from "./routes/post";
import summryRouter from "./routes/summary";
import talkRotuer from "./routes/talk";
import P2PHandler from "./socket/P2PHandler";
import userHandlers from "./socket/userHandler";
const app = express();
const server = new http.Server(app);
// 服务器响应端口
const PORT = env.SERVER_PORT || 4000;
// socket端口
const SOCKETPORT = env.SOCKET_PORT || 4040;

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:5173"], // 替换为前端实际域名
  credentials: true, // 允许携带凭证（如 cookies）
  methods: ["GET", "POST", "PUT", "DELETE"], // 允许的请求方法
  allowedHeaders: ["Content-Type", "Authorization"], // 允许的请求头
};
app.use(cors(corsOptions));
const socketIO = new Server(SOCKETPORT as number, {
  cors: {
    origin: "*",
  },
});

//打印请求信息
app.use((req, res, next) => {
  log.info(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
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
app.use("/post", postRouter);
app.use("/download", express.static("static"));
app.use("/file", fileRouter);
app.use("/summary", summryRouter);
app.use("/talk", talkRotuer);
app.use("/meeting", meetingRouter);
app.use("/image", imageRouter);
app.use("/admin", admin);
app.use("/comment", commentRouter);
app.use(errorHandler);
// 404 处理
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

server.listen(PORT, () => {
  log.success(`服务器端口: ${PORT}`);
});

socketIO.on("connection", (socket) => {
  log.info(`⚡: ${socket.id} 用户已连接!`);
  userHandlers(socketIO, socket);
  // ICEServerHandlers(socketIO, socket);
  // mediaHandler(socketIO, socket);
  P2PHandler(socketIO, socket);
  socket.on("disconnect", () => {
    log.info(`🔥: ${socket.id} 用户已断开连接!`);
  });
});

initMediasoup().then(() => {
  log.success("mediasoup worker init");
});
