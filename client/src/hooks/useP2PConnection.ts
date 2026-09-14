import { useCallback, useEffect, useRef, useState } from "react";
import Peer from "simple-peer";
import { io, Socket } from "socket.io-client";

const SocketUrl = import.meta.env.VITE_SOCKET_URL;

export type RoomUserInfo = {
  peerId: string;
  userId: string;
  roomId: string;
  name: string;
  image: string;
  email: string;
};

type JoinMeetingResponse = {
  existingPeers: string[];
  roomUsers: RoomUserInfo[];
};

type CurrentUserInfo = {
  id?: string;
  name?: string | null;
  image?: string | null;
  email?: string | null;
};

const toRoomUsersMap = (users: RoomUserInfo[]) => {
  return users.reduce<Record<string, RoomUserInfo>>((result, user) => {
    result[user.peerId] = user;
    return result;
  }, {});
};

const useP2PConnection = () => {
  const socketRef = useRef<Socket | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [roomUsers, setRoomUsers] = useState<Record<string, RoomUserInfo>>({});
  const [localPeerId, setLocalPeerId] = useState("");
  const peersRef = useRef<{ [id: string]: Peer.Instance }>({});

  const createPeer = (peerId: string, initiator: boolean, stream: MediaStream) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      },
    });

    peer.on("signal", (signal) => {
      socketRef.current?.emit("signal", { targetId: peerId, signal });
    });

    peer.on("stream", (remoteStream) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [peerId]: remoteStream,
      }));
    });

    peer.on("close", () => {
      delete peersRef.current[peerId];

      setRemoteStreams((prev) => {
        const nextStreams = { ...prev };
        delete nextStreams[peerId];
        return nextStreams;
      });

      setRoomUsers((prev) => {
        const nextUsers = { ...prev };
        delete nextUsers[peerId];
        return nextUsers;
      });
    });

    peer.on("error", (error) => {
      console.error(`Peer ${peerId} error:`, error);
    });

    return peer;
  };

  const connectToPeer = useCallback(
    (roomId: string, stream: MediaStream, currentUser?: CurrentUserInfo) => {
      const socket = socketRef.current;
      if (!socket || !stream) return;

      setLocalPeerId(socket.id || "");

      socket.off("handlerNewUser");
      socket.off("user-left");
      socket.off("signal");
      socket.off("room-users-sync");

      socket.on("handlerNewUser", (roomUser: RoomUserInfo) => {
        setRoomUsers((prev) => ({
          ...prev,
          [roomUser.peerId]: roomUser,
        }));

        if (roomUser.peerId === socket.id || peersRef.current[roomUser.peerId]) {
          return;
        }

        const peer = createPeer(roomUser.peerId, true, stream);
        peersRef.current[roomUser.peerId] = peer;
      });

      socket.on("user-left", (peerId: string) => {
        delete peersRef.current[peerId];

        setRemoteStreams((prev) => {
          const nextStreams = { ...prev };
          delete nextStreams[peerId];
          return nextStreams;
        });

        setRoomUsers((prev) => {
          const nextUsers = { ...prev };
          delete nextUsers[peerId];
          return nextUsers;
        });
      });

      socket.on("signal", (data: { senderId: string; signal: Peer.SignalData }) => {
        const peer = peersRef.current[data.senderId];
        if (peer && !peer.destroyed) {
          peer.signal(data.signal);
        }
      });

      socket.on("room-users-sync", (users: RoomUserInfo[]) => {
        setRoomUsers(toRoomUsersMap(users));
      });

      socket.emit(
        "joinMeetingRoom",
        {
          roomId,
          user: {
            id: currentUser?.id,
            name: currentUser?.name || undefined,
            image: currentUser?.image || undefined,
            email: currentUser?.email || undefined,
          },
        },
        ({ existingPeers, roomUsers }: JoinMeetingResponse) => {
          setRoomUsers(toRoomUsersMap(roomUsers));

          existingPeers.forEach((peerId) => {
            if (peersRef.current[peerId]) return;
            const peer = createPeer(peerId, false, stream);
            peersRef.current[peerId] = peer;
          });
        },
      );
    },
    [],
  );

  const destroyPeerConnections = useCallback(() => {
    Object.values(peersRef.current).forEach((peer) => {
      peer.destroy();
    });

    peersRef.current = {};
    setRemoteStreams({});
    setRoomUsers({});
  }, []);

  useEffect(() => {
    socketRef.current = io(SocketUrl);

    const handleConnect = () => {
      setLocalPeerId(socketRef.current?.id || "");
    };

    const handleDisconnect = () => {
      setLocalPeerId("");
    };

    socketRef.current.on("connect", handleConnect);
    socketRef.current.on("disconnect", handleDisconnect);

    return () => {
      socketRef.current?.off("connect", handleConnect);
      socketRef.current?.off("disconnect", handleDisconnect);
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    connectToPeer,
    remoteStreams,
    roomUsers,
    localPeerId,
    destroyPeerConnections,
    peersRef,
  };
};

export default useP2PConnection;
