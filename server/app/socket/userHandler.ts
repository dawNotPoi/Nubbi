import log from "@/common/chalk";

const userHandlers = (io, socket) => {
  socket.on("secrectMessage", ({ toId, msg }) => {
    io.to(toId).emit("secrectMessage", socket.id, msg);
  });
  socket.on("init", () => {
    socket.join("init");
    const members = io.sockets.adapter.rooms.get("init").size;
    log.info(socket.id + " 进入了网站\n" + "当前人数:" + members);
    socket.to("init").emit("updateMembers", { members });
  });
};
export default userHandlers;
