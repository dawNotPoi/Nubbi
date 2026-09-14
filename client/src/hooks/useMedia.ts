import { useCallback, useEffect, useRef, useState } from "react";

const CONSTRAINTS: MediaStreamConstraints = {
  audio: true,
  video: true,
};

function useMediaStream(constraints: MediaStreamConstraints = CONSTRAINTS) {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoStatu, setVideoStatu] = useState({
    open: false,
    deviceId: "",
  });
  const [audioStatu, setAudioStatu] = useState({
    open: false,
    deviceId: "",
  });
  const created = useRef(false);
  const [devices, setDevices] = useState<{
    audio: MediaDeviceInfo[];
    video: MediaDeviceInfo[];
  }>({ audio: [], video: [] });

  const getMediaStream = useCallback(async () => {
    try {
      const nextMediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      const videoTrack = nextMediaStream.getVideoTracks()[0];
      const audioTrack = nextMediaStream.getAudioTracks()[0];

      if (videoTrack) {
        setVideoStatu({
          open: true,
          deviceId: videoTrack.getSettings().deviceId || "",
        });
      }

      if (audioTrack) {
        setAudioStatu({
          open: true,
          deviceId: audioTrack.getSettings().deviceId || "",
        });
      }

      return nextMediaStream;
    } catch (error) {
      console.error("Failed to get media stream.", error);
      setAudioStatu({ open: false, deviceId: "" });
      setVideoStatu({ open: false, deviceId: "" });
      return null;
    }
  }, [constraints]);

  const getDevices = useCallback(async () => {
    let deviceList: MediaDeviceInfo[] = [];

    try {
      deviceList = await navigator.mediaDevices.enumerateDevices();
    } catch (error) {
      console.error("Failed to get device list.", error);
    }

    setDevices({
      audio: deviceList.filter((item) => item.kind === "audioinput"),
      video: deviceList.filter((item) => item.kind === "videoinput"),
    });
  }, []);

  const switchDevice = useCallback(
    async (
      kind: "audioinput" | "videoinput",
      deviceId: string,
      beforeSwitch?: (
        stream: MediaStream,
        oldTrack: MediaStreamTrack,
        newTrack: MediaStreamTrack
      ) => void,
      afterSwitch?: (stream: MediaStream) => void
    ) => {
      let nextTrackStream: MediaStream;

      try {
        nextTrackStream = await navigator.mediaDevices.getUserMedia(
          kind === "audioinput"
            ? { audio: { deviceId: { exact: deviceId } }, video: false }
            : { video: { deviceId: { exact: deviceId } }, audio: false }
        );
      } catch (error) {
        console.error("Error accessing media devices.", error);
        return;
      }

      const nextTrack =
        kind === "audioinput"
          ? nextTrackStream.getAudioTracks()[0]
          : nextTrackStream.getVideoTracks()[0];
      const currentStream = mediaStream;

      if (!currentStream || !nextTrack) return;

      const currentTrack =
        kind === "audioinput"
          ? currentStream.getAudioTracks()[0]
          : currentStream.getVideoTracks()[0];

      if (!currentTrack) return;

      beforeSwitch?.(nextTrackStream, currentTrack, nextTrack);
      currentTrack.stop();
      currentStream.removeTrack(currentTrack);
      currentStream.addTrack(nextTrack);

      if (nextTrack.kind === "video") {
        setVideoStatu({
          open: true,
          deviceId: nextTrack.getSettings().deviceId || "",
        });
      } else {
        setAudioStatu({
          open: true,
          deviceId: nextTrack.getSettings().deviceId || "",
        });
      }

      afterSwitch?.(currentStream);
      return nextTrack;
    },
    [mediaStream]
  );

  const toggleDevice = useCallback(
    async (kind: "video" | "audio", enabled: boolean) => {
      if (!mediaStream) return;

      const tracks =
        kind === "video"
          ? mediaStream.getVideoTracks()
          : mediaStream.getAudioTracks();

      if (tracks.length === 0) return;

      tracks.forEach((track) => {
        track.enabled = enabled;
      });

      if (kind === "video") {
        setVideoStatu((prev) => ({ ...prev, open: enabled }));
      } else {
        setAudioStatu((prev) => ({ ...prev, open: enabled }));
      }
    },
    [mediaStream]
  );

  useEffect(() => {
    if (created.current) return;

    getMediaStream().then((stream) => {
      if (stream) {
        setMediaStream(stream);
      }
    });

    return () => {
      created.current = true;
    };
  }, [getMediaStream]);

  useEffect(() => {
    getDevices();
    navigator.mediaDevices.addEventListener("devicechange", getDevices);

    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", getDevices);
    };
  }, [getDevices]);

  return {
    mediaStream,
    devices,
    switchDevice,
    videoStatu,
    audioStatu,
    toggleDevice,
  };
}

export default useMediaStream;
