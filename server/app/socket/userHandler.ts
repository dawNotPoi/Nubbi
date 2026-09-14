import log from "@/common/chalk";
import { createComment, getCommentList, reply } from "../controller/comment";

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
  socket.on("joinRoom", ({ room }) => {
    socket.join(room);
    getCommentList({ postId: room }).then((data) => {
      socket.emit("listInit", data);
    });
  });
  socket.on("send", ({ room = "Home", message }) => {
    createComment({ postId: room, ...message }).then((data) => {
      io.to(room).emit("chatList", data.data);
    });
  });
  socket.on("reply", ({ postId = "Home", ...data }) => {
    reply({ postId, ...data })
      .then((data) => {
        io.to(postId).emit("subChatOut", data.data);
      })
      .catch((error) => {
        log.error(error);
      });
  });
};
export default userHandlers;
