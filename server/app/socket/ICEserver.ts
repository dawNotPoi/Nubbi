import log from "@/common/chalk";
import { Socket } from "socket.io";
let rooms = new Map();
const getOrCreateRoom = (id) => {
  if (!rooms.has(id)) {
    rooms.set(id, {
      id: id,
      users: new Map(),
      createAt: Date.now(),
    });
  }
  return rooms.get(id);
};

const ICEServerHandlers = (io, socket: Socket) => {
  let callRoom = "";
  // 房间加入事件转发
  socket.on("join", ({ target, name, avatar, id }) => {
    socket.join(target);
    callRoom = target;
    socket.to(target).emit("join", { sender: socket.id, name, avatar, id });
  });
  // 广播用户offer事件
  socket.on("offer", ({ sdp, target, ...user }) => {
    socket.to(target).emit("offer", { sdp, sender: socket.id, ...user });
  });
  //广播用户answer事件
  socket.on("answer", ({ sdp, target }) => {
    socket.to(target).emit("answer", { sdp, sender: socket.id });
  });
  //处理用户离开
  socket.on("left", async ({ target }) => {
    socket.leave(target);
    socket.to(target).emit("left", { sender: socket.id });
  });
  //处理候选人交换
  socket.on("ice-candidate", async ({ candidate, target }) => {
    socket.to(target).emit("ice-candidate", { candidate, sender: socket.id });
  });
  //处理用户手动挂断
  socket.on("hang-down-server", ({ id, roomId }) => {
    socket.to(roomId).emit("hang-down");
  });
  socket.on("disconnect", () => {
    log.success("disconnect \t" + socket.id);
    socket.to(callRoom).emit("left", { sender: socket.id });
  });
  socket.on("change", ({ target, type, state }) => {
    socket.to(target).emit("change", { type, state, sender: socket.id });
  });
  socket.on("message", ({ target, content, name, avatar, time, sender }) => {
    io.to(target).emit("message", { content, name, avatar, time, sender });
  });
};

export default ICEServerHandlers;
