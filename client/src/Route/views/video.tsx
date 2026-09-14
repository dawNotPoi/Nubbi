import useMediaStream from "@/hooks/useMedia";
import useP2PConnection from "@/hooks/useP2PConnection";
import { useEffect, useRef } from "react";
import {
  TbCameraBolt,
  TbCameraOff,
  TbMicrophone,
  TbMicrophoneOff,
} from "react-icons/tb";

export default function Video() {
  const {
    mediaStream,
    devices,
    switchDevice,
    videoStatu,
    audioStatu,
    toggleDevice,
  } = useMediaStream();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { remoteStreams, connectToPeer, destroyPeerConnections, peersRef } =
    useP2PConnection();

  const updateVideo = (mediaStream: MediaStream) => {
    if (!mediaStream) return;
    localVideoRef.current!.srcObject = null;
    localVideoRef.current!.srcObject = mediaStream;
  };
  //初始化中央视频
  useEffect(() => {
    if (mediaStream) {
      updateVideo(mediaStream);
      connectToPeer("room1", mediaStream);
    }
    return () => {
      destroyPeerConnections();
    };
  }, [mediaStream]);

  const handlerSwitchDevice = async (
    kind: "audioinput" | "videoinput",
    deviceId: string
  ) => {
    if (!mediaStream) return;
    switchDevice(
      kind,
      deviceId,
      (_, oldTrack, newTrack) => {
        peersRef.current &&
          Object.values(peersRef.current).forEach((peer) => {
            peer.replaceTrack(oldTrack, newTrack, mediaStream);
          });
      },
      (stream) => {
        updateVideo(stream);
      }
    );
  };

  const handlerDeviceToggle = (kind: "audio" | "video", enabled: boolean) => {
    toggleDevice(kind, enabled);
  };

  return (
    <div className="h-screen w-screen">
      <main className="h-[calc(100vh-40px)] w-full flex gap-1">
        <div className="bg-normal flex flex-col size-full  flex-1  overflow-hidden">
          <header className="h-10">
            VIDEO <button>join</button>
          </header>
          <section className="flex-1 w-full overflow-hidden flex justify-center items-center">
            <video
              autoPlay
              className="object-fit size-full"
              ref={localVideoRef}
            ></video>
          </section>
        </div>
        <aside className=" w-[15%] py-10     bg-normal ">
          <ul className=" min-w-[200px] h-full max-w-[300px] flex gap-1 flex-col overflow-y-scroll justify-center scrollbar-none">
            {Object.entries(remoteStreams).map(([peerId, stream]) => {
              return (
                <li className="w-full aspect-video" key={peerId}>
                  <video
                    className="size-full overflow-hidden object-cover"
                    autoPlay
                    playsInline
                    ref={(el) => {
                      if (!el) return;
                      if (el.srcObject !== stream) el.srcObject = stream;
                    }}
                  ></video>
                </li>
              );
            })}
          </ul>
        </aside>
      </main>
      <footer className="h-[40px] w-full flex items-center  gap-8 ">
        <div className="bg-white">
          <button
            onClick={() => {
              handlerDeviceToggle("video", !videoStatu.open);
            }}
            className="size-fit"
          >
            {!videoStatu.open ? <TbCameraOff /> : <TbCameraBolt />}
          </button>
          <select
            onChange={(e) => {
              handlerSwitchDevice("videoinput", e.target.value);
            }}
            className="w-40"
          >
            {devices.video.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white">
          <button
            onClick={() => {
              handlerDeviceToggle("audio", !audioStatu.open);
            }}
            className="size-fit"
          >
            {!audioStatu.open ? <TbMicrophoneOff /> : <TbMicrophone />}
          </button>
          <select
            onChange={(e) => handlerSwitchDevice("videoinput", e.target.value)}
            className="w-40"
          >
            {devices.audio.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label}
              </option>
            ))}
          </select>
        </div>
      </footer>
    </div>
  );
}
