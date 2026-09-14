import { useCallback, useEffect, useRef, useState } from "react";
const CONSTRAINTS: MediaStreamConstraints = {
  audio: true,
  video: true,
};
function useMediaStream(contranints: MediaStreamConstraints = CONSTRAINTS) {
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [videoStatu, setVideoStatu] = useState({
    open: false,
    deviceId: "",
  });
  const [audioStatu, setAudioStatu] = useState({
    open: false,
    deviceId: "",
  });
  //防止重复调用
  let created = useRef(false);
  const [devices, setDevices] = useState<{
    audio: MediaDeviceInfo[];
    video: MediaDeviceInfo[];
  }>({ audio: [], video: [] });

  //获取本地媒体流
  const getMediaStream = useCallback(async () => {
    try {
      let newMedia: MediaStream | null = null;
      newMedia = await navigator.mediaDevices.getUserMedia(contranints);
      const videoTrack = newMedia.getVideoTracks()[0];
      const audioTrack = newMedia.getAudioTracks()[0];
      if (videoTrack)
        setVideoStatu({
          open: true,
          deviceId: videoTrack.getSettings().deviceId || "",
        });
      if (audioTrack)
        setAudioStatu({
          open: true,
          deviceId: audioTrack.getSettings().deviceId || "",
        });
      return newMedia;
    } catch (error) {
      console.error("获取媒体流失败", error);
      setAudioStatu({ open: false, deviceId: "" });
      setVideoStatu({ open: false, deviceId: "" });
      return null;
    }
  }, []);

  //获取设备列表
  const getDevices = useCallback(async () => {
    let device: any[] = [];
    try {
      //获取列表信息
      device = await navigator.mediaDevices.enumerateDevices();
    } catch (error) {
      console.error("设备信息获取失败", error);
    }
    const audioInputs = device.filter((device) => device.kind === "audioinput");
    const videoInputs = device.filter((device) => device.kind === "videoinput");
    setDevices({
      audio: audioInputs,
      video: videoInputs,
    });
  }, []);

  //切换设备
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
      //获取track
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
        });
      } catch (error) {
        console.error("Error accessing media devices.", error);
        return;
      }
      const newTrack =
        kind === "audioinput"
          ? stream.getAudioTracks()[0]
          : stream.getVideoTracks()[0];
      // 更新 localStream ref/state as needed
      const prev = mediaStream;
      if (!prev) return;
      const oldTrack =
        kind === "audioinput"
          ? prev.getAudioTracks()[0]
          : prev.getVideoTracks()[0];
      beforeSwitch?.(stream, oldTrack, newTrack);
      oldTrack.stop();
      prev.removeTrack(oldTrack);
      prev.addTrack(newTrack);
      newTrack.kind === "video"
        ? setVideoStatu({
            open: true,
            deviceId: newTrack.getSettings().deviceId || "",
          })
        : setAudioStatu({
            open: true,
            deviceId: newTrack.getSettings().deviceId || "",
          });
      afterSwitch?.(stream);
      return newTrack;
    },
    [mediaStream]
  );

  //开关设备
  const toggleDevice = useCallback(
    async (kind: "video" | "audio", enabled: boolean) => {
      console.log("toggleDevice");
      console.log("deviceTracks", mediaStream?.getTracks());
      if (!mediaStream) return;
      const tracks =
        kind === "video"
          ? mediaStream.getVideoTracks()
          : mediaStream.getAudioTracks();

      if (tracks.length > 0) {
        tracks.forEach((track) => {
          track.enabled = enabled;
        });
        if (kind === "video") {
          setVideoStatu((prev) => ({ ...prev, open: enabled }));
        } else {
          setAudioStatu((prev) => ({ ...prev, open: enabled }));
        }
      }
    },
    [mediaStream]
  );

  // 初始化Media
  useEffect(() => {
    //防止重复调用
    if (!created.current) {
      getMediaStream().then((stream) => {
        if (stream) {
          setMediaStream(stream);
        }
      });
    }
    return () => {
      created.current = true;
    };
  }, []);

  //初始化设备列表
  useEffect(() => {
    getDevices();
    navigator.mediaDevices.addEventListener("devicechange", getDevices);
    return () =>
      navigator.mediaDevices.removeEventListener("devicechange", getDevices);
  }, []);

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
