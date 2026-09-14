export type MediaDeviceKind = "audioinput" | "videoinput";

export type MediaToggleKind = "audio" | "video";

export type DeviceStatus = {
  open: boolean;
  deviceId: string;
};

export type TrackReplaceHandler = (
  stream: MediaStream,
  oldTrack: MediaStreamTrack,
  newTrack: MediaStreamTrack,
) => void;

export type MediaDevices = {
  audio: MediaDeviceInfo[];
  video: MediaDeviceInfo[];
};

export type VideoRoomUser = {
  peerId: string;
  userId: string;
  roomId: string;
  name: string;
  image: string;
  email: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
};

export type StageParticipant = {
  id: string;
  name: string;
  avatarSrc?: string;
  stream: MediaStream | null;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  isLocal?: boolean;
};

export type MeetingComment = {
  _id: string;
  roomId: string;
  meetingId: string;
  content: string;
  userId: string;
  name: string;
  avatar: string;
  email: string;
  createdAt: string;
  updatedAt: string;
};
