import type { MeetingComment } from "@/views/MeetingRoom/types";
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
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
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
  isVideoEnabled?: boolean;
  isAudioEnabled?: boolean;
};

type SendMeetingCommentResponse = {
  ok: boolean;
  reason?: string;
  comment?: MeetingComment;
};

type EndMeetingResponse = {
  ok: boolean;
  reason?: string;
};

const toRoomUsersMap = (users: RoomUserInfo[]) => {
  return users.reduce<Record<string, RoomUserInfo>>((result, user) => {
    result[user.peerId] = user;
    return result;
  }, {});
};

const syncPeerTracks = (peer: Peer.Instance, stream: MediaStream) => {
  stream.getTracks().forEach((track) => {
    try {
      peer.addTrack(track, stream);
    } catch (error) {
      console.error("Failed to add local track to peer.", error);
    }
  });
};

const useP2PConnection = () => {
  const socketRef = useRef<Socket | null>(null);
  const connectedRoomRef = useRef("");
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingSignalsRef = useRef<Record<string, Peer.SignalData[]>>({});
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [roomUsers, setRoomUsers] = useState<Record<string, RoomUserInfo>>({});
  const [localPeerId, setLocalPeerId] = useState("");
  const [meetingComments, setMeetingComments] = useState<MeetingComment[]>([]);
  const [meetingEndedAt, setMeetingEndedAt] = useState(0);
  const peersRef = useRef<{ [id: string]: Peer.Instance }>({});
  const createPeer = useCallback(
    (peerId: string, initiator: boolean, stream: MediaStream | null) => {
      const syncRemoteStream = (remoteStream: MediaStream) => {
        setRemoteStreams((prev) => ({
          ...prev,
          [peerId]: remoteStream,
        }));
      };

      const peer = new Peer({
        initiator,
        trickle: false,
        stream: stream || undefined,
        config: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        },
      });

      peer.on("signal", (signal) => {
        socketRef.current?.emit("signal", { targetId: peerId, signal });
      });

      peer.on("stream", (remoteStream) => {
        syncRemoteStream(remoteStream);
      });

      peer.on("track", (_, remoteStream) => {
        if (!remoteStream) return;

        syncRemoteStream(remoteStream);
      });

      peer.on("close", () => {
        delete peersRef.current[peerId];
        setRemoteStreams((prev) => {
          const nextStreams = { ...prev };
          delete nextStreams[peerId];
          return nextStreams;
        });
      });

      peer.on("error", (error) => {
        console.error(`Peer ${peerId} error:`, error);
      });

      return peer;
    },
    [],
  );

  const flushPendingSignals = useCallback((peerId: string) => {
    const peer = peersRef.current[peerId];
    const pendingSignals = pendingSignalsRef.current[peerId];

    if (!peer || !pendingSignals?.length) return;

    pendingSignals.forEach((signal) => {
      if (!peer.destroyed) {
        peer.signal(signal);
      }
    });

    delete pendingSignalsRef.current[peerId];
  }, []);

  const ensurePeerConnection = useCallback(
    (peerId: string, initiator: boolean) => {
      const existingPeer = peersRef.current[peerId];
      if (existingPeer && !existingPeer.destroyed) {
        return existingPeer;
      }

      const peer = createPeer(peerId, initiator, localStreamRef.current);
      peersRef.current[peerId] = peer;
      flushPendingSignals(peerId);
      return peer;
    },
    [createPeer, flushPendingSignals],
  );

  const joinRoom = useCallback(
    (roomId: string, currentUser?: CurrentUserInfo) => {
      const socket = socketRef.current;
      if (!socket || !roomId) return;

      socket.emit(
        "joinMeetingRoom",
        {
          roomId,
          user: {
            id: currentUser?.id,
            name: currentUser?.name || undefined,
            image: currentUser?.image || undefined,
            email: currentUser?.email || undefined,
            isVideoEnabled: currentUser?.isVideoEnabled || false,
            isAudioEnabled: currentUser?.isAudioEnabled || false,
          },
        },
        ({ existingPeers, roomUsers }: JoinMeetingResponse) => {
          connectedRoomRef.current = roomId;
          setLocalPeerId(socket.id || "");
          setRoomUsers(toRoomUsersMap(roomUsers));
          existingPeers.forEach((peerId) => {
            ensurePeerConnection(peerId, false);
          });
        },
      );
    },
    [ensurePeerConnection],
  );

  const connectToPeer = useCallback(
    (roomId: string, stream: MediaStream | null, currentUser?: CurrentUserInfo) => {
      if (!roomId) return;

      const previousStream = localStreamRef.current;
      localStreamRef.current = stream;
      connectedRoomRef.current = roomId;

      if (stream && previousStream !== stream) {
        Object.values(peersRef.current).forEach((peer) => {
          if (!peer.destroyed) {
            syncPeerTracks(peer, stream);
          }
        });
      }
    },
    [],
  );

  const syncRoomUser = useCallback(
    (roomId: string, currentUser?: CurrentUserInfo) => {
      const socket = socketRef.current;
      if (!socket || !roomId) return;

      socket.emit("syncMeetingUser", {
        roomId,
        user: {
          id: currentUser?.id,
          name: currentUser?.name || undefined,
          image: currentUser?.image || undefined,
          email: currentUser?.email || undefined,
          isVideoEnabled: currentUser?.isVideoEnabled || false,
          isAudioEnabled: currentUser?.isAudioEnabled || false,
        },
      });
    },
    [],
  );

  const destroyPeerConnections = useCallback(() => {
    Object.values(peersRef.current).forEach((peer) => {
      peer.destroy();
    });

    peersRef.current = {};
    connectedRoomRef.current = "";
    localStreamRef.current = null;
    pendingSignalsRef.current = {};
    setRemoteStreams({});
    setRoomUsers({});
    setMeetingComments([]);
  }, []);

  const sendMeetingComment = useCallback(
    (roomId: string, content: string, currentUser?: CurrentUserInfo) => {
      return new Promise<SendMeetingCommentResponse>((resolve) => {
        const socket = socketRef.current;
        if (!socket || !roomId || !content.trim()) {
          resolve({ ok: false, reason: "INVALID_PAYLOAD" });
          return;
        }

        socket.emit(
          "sendMeetingComment",
          {
            roomId,
            comment: {
              id: currentUser?.id,
              name: currentUser?.name || undefined,
              image: currentUser?.image || undefined,
              email: currentUser?.email || undefined,
              content,
            },
          },
          (response: SendMeetingCommentResponse) => {
            resolve(response);
          },
        );
      });
    },
    [],
  );

  const endMeeting = useCallback((roomId: string, userId?: string) => {
    return new Promise<EndMeetingResponse>((resolve) => {
      const socket = socketRef.current;
      if (!socket || !roomId) {
        resolve({ ok: false, reason: "INVALID_ROOM" });
        return;
      }

      socket.emit("endMeeting", { roomId, userId }, (response: EndMeetingResponse) => {
        resolve(response);
      });
    });
  }, []);

  //初始化socket连接
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
    socketRef.current.on("handlerNewUser", (roomUser: RoomUserInfo) => {
      setRoomUsers((prev) => ({
        ...prev,
        [roomUser.peerId]: roomUser,
      }));

      if (
        roomUser.peerId === socketRef.current?.id ||
        connectedRoomRef.current !== roomUser.roomId
      ) {
        return;
      }

      ensurePeerConnection(roomUser.peerId, true);
    });
    socketRef.current.on("user-left", (peerId: string) => {
      delete peersRef.current[peerId];
      delete pendingSignalsRef.current[peerId];
      setRemoteStreams((prev) => {
        const nextStreams = { ...prev };
        delete nextStreams[peerId];
        return nextStreams;
      });
    });
    socketRef.current.on(
      "signal",
      (data: { senderId: string; signal: Peer.SignalData }) => {
        const peer = peersRef.current[data.senderId];
        if (peer && !peer.destroyed) {
          peer.signal(data.signal);
          return;
        }

        if (!pendingSignalsRef.current[data.senderId]) {
          pendingSignalsRef.current[data.senderId] = [];
        }

        pendingSignalsRef.current[data.senderId].push(data.signal);
        ensurePeerConnection(data.senderId, false);
      },
    );
    socketRef.current.on("room-users-sync", (users: RoomUserInfo[]) => {
      setRoomUsers(toRoomUsersMap(users));
    });
    socketRef.current.on(
      "meeting-comments-sync",
      (comments: MeetingComment[]) => {
        setMeetingComments(comments);
      },
    );
    socketRef.current.on(
      "meeting-comment-created",
      (comment: MeetingComment) => {
        setMeetingComments((prev) => {
          if (prev.some((item) => item._id === comment._id)) {
            return prev;
          }

          return [...prev, comment];
        });
      },
    );
    socketRef.current.on("meeting-ended", () => {
      Object.values(peersRef.current).forEach((peer) => {
        peer.destroy();
      });
      peersRef.current = {};
      connectedRoomRef.current = "";
      localStreamRef.current = null;
      pendingSignalsRef.current = {};
      setRemoteStreams({});
      setRoomUsers({});
      setMeetingComments([]);
      setMeetingEndedAt(Date.now());
    });

    return () => {
      socketRef.current?.off("connect", handleConnect);
      socketRef.current?.off("disconnect", handleDisconnect);
      socketRef.current?.off("handlerNewUser");
      socketRef.current?.off("user-left");
      socketRef.current?.off("signal");
      socketRef.current?.off("room-users-sync");
      socketRef.current?.off("meeting-comments-sync");
      socketRef.current?.off("meeting-comment-created");
      socketRef.current?.off("meeting-ended");
      socketRef.current?.disconnect();
    };
  }, [ensurePeerConnection]);

  return {
    joinRoom,
    connectToPeer,
    syncRoomUser,
    sendMeetingComment,
    endMeeting,
    remoteStreams,
    roomUsers,
    meetingComments,
    meetingEndedAt,
    localPeerId,
    destroyPeerConnections,
    peersRef,
  };
};

export default useP2PConnection;
