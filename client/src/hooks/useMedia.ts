import { useCallback, useEffect, useRef, useState } from "react";

const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: false,
};

const isTrackRequested = (
  constraint?: boolean | MediaTrackConstraints,
): constraint is true | MediaTrackConstraints => {
  return constraint !== false && constraint !== undefined;
};

const getRequestConstraints = (
  constraints: MediaStreamConstraints,
): MediaStreamConstraints => {
  const audioRequested = isTrackRequested(constraints.audio);
  const videoRequested = isTrackRequested(constraints.video);

  if (!audioRequested && !videoRequested) {
    return {
      audio: true,
      video: true,
    };
  }

  return {
    audio: audioRequested ? constraints.audio : false,
    video: videoRequested ? constraints.video : false,
  };
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
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenTrackRef = useRef<MediaStreamTrack | null>(null);
  const [devices, setDevices] = useState<{
    audio: MediaDeviceInfo[];
    video: MediaDeviceInfo[];
  }>({ audio: [], video: [] });
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const replaceVideoTrack = useCallback(
    (
      nextTrack: MediaStreamTrack,
      beforeSwitch?: (
        stream: MediaStream,
        oldTrack: MediaStreamTrack,
        newTrack: MediaStreamTrack,
      ) => void,
      afterSwitch?: (stream: MediaStream) => void,
    ) => {
      const currentStream = mediaStream;

      if (!currentStream) return false;

      const currentTrack = currentStream.getVideoTracks()[0];

      if (!currentTrack) return false;

      beforeSwitch?.(currentStream, currentTrack, nextTrack);
      currentStream.removeTrack(currentTrack);
      currentStream.addTrack(nextTrack);
      setVideoStatu({
        open: nextTrack.enabled,
        deviceId: nextTrack.getSettings().deviceId || "",
      });
      afterSwitch?.(currentStream);

      return true;
    },
    [mediaStream],
  );

  const getMediaStream = useCallback(async () => {
    try {
      const requestConstraints = getRequestConstraints(constraints);
      const nextMediaStream =
        await navigator.mediaDevices.getUserMedia(requestConstraints);
      const videoTrack = nextMediaStream.getVideoTracks()[0];
      const audioTrack = nextMediaStream.getAudioTracks()[0];
      const videoEnabled = isTrackRequested(constraints.video);
      const audioEnabled = isTrackRequested(constraints.audio);

      if (videoTrack) {
        cameraTrackRef.current = videoTrack;
        videoTrack.enabled = videoEnabled;
        setVideoStatu({
          open: videoEnabled,
          deviceId: videoTrack.getSettings().deviceId || "",
        });
      }

      if (audioTrack) {
        audioTrack.enabled = audioEnabled;
        setAudioStatu({
          open: audioEnabled,
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
        newTrack: MediaStreamTrack,
      ) => void,
      afterSwitch?: (stream: MediaStream) => void,
    ) => {
      let nextTrackStream: MediaStream;

      try {
        nextTrackStream = await navigator.mediaDevices.getUserMedia(
          kind === "audioinput"
            ? { audio: { deviceId: { exact: deviceId } }, video: false }
            : { video: { deviceId: { exact: deviceId } }, audio: false },
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

      if (kind === "videoinput" && isScreenSharing) {
        const previousCameraTrack = cameraTrackRef.current;

        nextTrack.enabled = videoStatu.open;
        cameraTrackRef.current = nextTrack;
        setVideoStatu({
          open: nextTrack.enabled,
          deviceId: nextTrack.getSettings().deviceId || "",
        });

        if (previousCameraTrack && previousCameraTrack !== nextTrack) {
          previousCameraTrack.stop();
        }

        return nextTrack;
      }

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
        cameraTrackRef.current = nextTrack;
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
    [isScreenSharing, mediaStream, videoStatu.open],
  );

  const stopScreenShare = useCallback(
    (
      beforeSwitch?: (
        stream: MediaStream,
        oldTrack: MediaStreamTrack,
        newTrack: MediaStreamTrack,
      ) => void,
      afterSwitch?: (stream: MediaStream) => void,
    ) => {
      const currentScreenTrack = screenTrackRef.current;
      const currentCameraTrack = cameraTrackRef.current;

      if (!mediaStream || !currentScreenTrack || !currentCameraTrack) return;

      currentCameraTrack.enabled = videoStatu.open;
      const replaced = replaceVideoTrack(
        currentCameraTrack,
        beforeSwitch,
        afterSwitch,
      );

      if (!replaced) return;

      screenTrackRef.current = null;
      currentScreenTrack.onended = null;
      currentScreenTrack.stop();
      setIsScreenSharing(false);
    },
    [mediaStream, replaceVideoTrack, videoStatu.open],
  );

  const startScreenShare = useCallback(
    async (
      beforeSwitch?: (
        stream: MediaStream,
        oldTrack: MediaStreamTrack,
        newTrack: MediaStreamTrack,
      ) => void,
      afterSwitch?: (stream: MediaStream) => void,
    ) => {
      if (!mediaStream || isScreenSharing) return false;

      let displayStream: MediaStream;

      try {
        displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      } catch (error) {
        console.error("Failed to start screen share.", error);
        return false;
      }

      const nextScreenTrack = displayStream.getVideoTracks()[0];

      if (!nextScreenTrack) return false;

      nextScreenTrack.enabled = true;
      const replaced = replaceVideoTrack(
        nextScreenTrack,
        beforeSwitch,
        afterSwitch,
      );

      if (!replaced) {
        nextScreenTrack.stop();
        return false;
      }

      screenTrackRef.current = nextScreenTrack;
      setVideoStatu({
        open: true,
        deviceId: nextScreenTrack.getSettings().deviceId || "",
      });
      setIsScreenSharing(true);
      nextScreenTrack.onended = () => {
        stopScreenShare(beforeSwitch, afterSwitch);
      };

      return true;
    },
    [isScreenSharing, mediaStream, replaceVideoTrack, stopScreenShare],
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
    [mediaStream],
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
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    toggleDevice,
  };
}

export default useMediaStream;
