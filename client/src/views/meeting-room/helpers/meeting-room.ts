import type { MutableRefObject } from "react";

export const hasVideoTrack = (stream: MediaStream | null): boolean =>
  Boolean(stream?.getVideoTracks().length);

export const getJoinErrorMessage = (reason?: string): string => {
  if (reason === "MEETING_ENDED") return "会议已结束";
  if (reason === "MEETING_NOT_APPROVED") return "会议当前不可加入";
  if (reason === "MEETING_NOT_FOUND") return "会议房间不存在";
  if (reason === "INVALID_ACCESS") return "入会凭证已失效，请重新验证";
  return "加入会议失败，请重新验证";
};

export const attachMediaStream = (
  videoRef: MutableRefObject<HTMLVideoElement | null>,
  stream: MediaStream,
): void => {
  if (!videoRef.current) return;
  videoRef.current.srcObject = null;
  videoRef.current.srcObject = stream;
};
