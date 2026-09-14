import {
  useCallback,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { Socket } from "socket.io-client";
import type {
  EndMeetingResponse,
  JoinMeetingResponse,
  RoomMedia,
  RoomUserInfo,
  RoomUserMap,
  SendMeetingCommentResponse,
  SocketActions,
} from "./types";

const JOIN_TIMEOUT_MS = 10_000;

type UseSocketActionsInput = {
  socketRef: MutableRefObject<Socket | null>;
  connectedRoomRef: MutableRefObject<string>;
  setLocalPeerId: Dispatch<SetStateAction<string>>;
  setRoomUsers: Dispatch<SetStateAction<RoomUserMap>>;
  ensurePeerConnection: (
    peerId: string,
    initiator: boolean,
  ) => unknown;
};

function toRoomUsersMap(users: RoomUserInfo[]): RoomUserMap {
  return users.reduce<RoomUserMap>((result, user) => {
    result[user.peerId] = user;
    return result;
  }, {});
}

export function useSocketActions({
  socketRef,
  connectedRoomRef,
  setLocalPeerId,
  setRoomUsers,
  ensurePeerConnection,
}: UseSocketActionsInput): SocketActions {
  const joinRoom = useCallback(
    (
      roomId: string,
      accessToken: string,
      media?: RoomMedia,
    ): Promise<JoinMeetingResponse> =>
      new Promise<JoinMeetingResponse>((resolve) => {
        const socket = socketRef.current;
        if (!socket || !roomId || !accessToken) {
          resolve({
            ok: false,
            reason: "INVALID_PAYLOAD",
            existingPeers: [],
            roomUsers: [],
          });
          return;
        }

        let settled = false;
        const timeoutId = window.setTimeout(() => {
          settled = true;
          resolve({
            ok: false,
            reason: "JOIN_TIMEOUT",
            existingPeers: [],
            roomUsers: [],
          });
        }, JOIN_TIMEOUT_MS);

        socket.emit(
          "joinMeetingRoom",
          {
            roomId,
            accessToken,
            media: {
              isVideoEnabled: media?.isVideoEnabled ?? false,
              isAudioEnabled: media?.isAudioEnabled ?? false,
            },
          },
          (response: JoinMeetingResponse) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            if (!response.ok) {
              resolve(response);
              return;
            }

            connectedRoomRef.current = roomId;
            setLocalPeerId(socket.id || "");
            setRoomUsers(toRoomUsersMap(response.roomUsers));
            response.existingPeers.forEach((peerId) => {
              ensurePeerConnection(peerId, false);
            });
            resolve(response);
          },
        );
      }),
    [
      connectedRoomRef,
      ensurePeerConnection,
      setLocalPeerId,
      setRoomUsers,
      socketRef,
    ],
  );

  const syncRoomUser = useCallback(
    (roomId: string, media?: RoomMedia): void => {
      const socket = socketRef.current;
      if (!socket || !roomId) return;
      socket.emit("syncMeetingUser", {
        roomId,
        media: {
          isVideoEnabled: media?.isVideoEnabled ?? false,
          isAudioEnabled: media?.isAudioEnabled ?? false,
        },
      });
    },
    [socketRef],
  );

  const sendMeetingComment = useCallback(
    (
      roomId: string,
      content: string,
    ): Promise<SendMeetingCommentResponse> =>
      new Promise<SendMeetingCommentResponse>((resolve) => {
        const socket = socketRef.current;
        if (!socket || !roomId || !content.trim()) {
          resolve({ ok: false, reason: "INVALID_PAYLOAD" });
          return;
        }
        socket.emit(
          "sendMeetingComment",
          { roomId, content },
          (response: SendMeetingCommentResponse) => resolve(response),
        );
      }),
    [socketRef],
  );

  const endMeeting = useCallback(
    (roomId: string): Promise<EndMeetingResponse> =>
      new Promise<EndMeetingResponse>((resolve) => {
        const socket = socketRef.current;
        if (!socket || !roomId) {
          resolve({ ok: false, reason: "INVALID_ROOM" });
          return;
        }
        socket.emit(
          "endMeeting",
          { roomId },
          (response: EndMeetingResponse) => resolve(response),
        );
      }),
    [socketRef],
  );

  return {
    joinRoom,
    syncRoomUser,
    sendMeetingComment,
    endMeeting,
  };
}
