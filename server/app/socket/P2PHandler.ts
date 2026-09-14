import { Server, Socket } from "socket.io";
let user = new Map<string, string>();
const P2PHandler = (io: Server, socket: Socket) => {
  socket.on("joinRoom", ({ roomId }, callback) => {
    const userId = socket.id;
    socket.join(roomId);
    user.set(userId, roomId);
    socket.on("disconnect", () => {
      socket.to(roomId).emit("user-left", userId);
    });

    socket.to(roomId).emit("handlerNewUser", { userId, peerId: socket.id });
    const clients = io.sockets.adapter.rooms.get(roomId) || new Set();
    const existingPeers = Array.from(clients).filter((id) => id !== socket.id);
    callback(existingPeers);
  });

  // 转发 WebRTC 信令数据 (SDP Offer/Answer, ICE Candidate)
  socket.on("signal", (data) => {
    // data 格式: { targetId: '...', signal: '...' }
    // 转发给目标用户
    io.to(data.targetId).emit("signal", {
      senderId: socket.id,
      signal: data.signal,
    });
  });
};

export default P2PHandler;
