import logger from "@/common/logger";
import type { Server, Socket } from "socket.io";

const userHandlers = (io: Server, socket: Socket): void => {
  socket.on("init", () => {
    socket.join("init");
    const members = io.sockets.adapter.rooms.get("init")?.size ?? 0;
    logger.info(`${socket.id} 进入了网站，当前人数: ${members}`);
    socket.to("init").emit("updateMembers", { members });
  });
};
export default userHandlers;
