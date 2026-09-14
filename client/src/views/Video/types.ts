export type MediaDeviceKind = "audioinput" | "videoinput";

export type MediaToggleKind = "audio" | "video";

export type DeviceStatus = {
  open: boolean;
  deviceId: string;
};

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
