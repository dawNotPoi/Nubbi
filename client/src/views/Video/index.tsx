import Image from "@/component/UI/Image";
import { useAuth } from "@/hooks/useAuth";
import useMediaStream from "@/hooks/useMedia";
import useP2PConnection from "@/hooks/useP2PConnection";
import Input from "antd/es/input/Input";
import React, { useEffect, useRef, useState } from "react";
import { AiOutlineUp } from "react-icons/ai";
import {
  BiCamera,
  BiCameraOff,
  BiMicrophone,
  BiMicrophoneOff,
} from "react-icons/bi";
import { SlScreenDesktop } from "react-icons/sl";
import { TbMicrophoneFilled } from "react-icons/tb";

export default function Video() {
  const {
    mediaStream,
    devices,
    switchDevice,
    videoStatu,
    audioStatu,
    toggleDevice,
  } = useMediaStream();

  const { user } = useAuth();

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

  const SideVideo: React.FC<{
    role?: "local" | "remote";
    peerId?: string;
    stream: MediaStream | null;
  }> = ({ peerId, role, stream }) => {
    let result = null;
    if (role == "local") {
      result = videoStatu.open ? (
        <video
          className="size-full overflow-hidden object-cover"
          autoPlay
          playsInline
          ref={(el) => {
            if (!el) return;
            if (el.srcObject !== stream) el.srcObject = stream;
          }}
        ></video>
      ) : (
        <div className="size-full overflow-hidden bg-black flex justify-center items-center">
          <Image className="size-[5rem] rounded-full" src={user?.image || ""} />
        </div>
      );
    } else {
      result = (
        <video
          className="size-full overflow-hidden object-cover"
          autoPlay
          playsInline
          ref={(el) => {
            if (!el) return;
            if (el.srcObject !== stream) el.srcObject = stream;
          }}
        ></video>
      );
    }

    return (
      <li className="w-full relative aspect-video">
        {result}
        <footer className="absolute flex gap-1 items-center text-white  bottom-1 left-0">
          <TbMicrophoneFilled />
          <span className="text-xs"> {user?.name || ""}</span>
        </footer>
      </li>
    );
  };

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col ">
      <main className="h-[calc(100vh-40px)] min-w-[800px] flex gap-1">
        <div className="bg-normal flex flex-col size-full  flex-1  overflow-hidden">
          <section className="flex-1 w-full overflow-hidden flex justify-center items-center">
            <video
              autoPlay
              className="object-fit size-full"
              ref={localVideoRef}
            ></video>
          </section>
        </div>
        <aside className=" w-[15%] py-10 bg-normal ">
          <ul className=" min-w-[200px] h-full max-w-[300px] flex gap-1 flex-col overflow-y-scroll justify-center scrollbar-none">
            {<SideVideo role="local" stream={mediaStream} />}
            {Object.entries(remoteStreams).map(([peerId, stream]) => {
              return <SideVideo key={peerId} peerId={peerId} stream={stream} />;
            })}
          </ul>
        </aside>
      </main>
      <footer className="h-[40px] bg-white w-full flex px-2 py-1 items-center gap-8 ">
        <div>
          <Input placeholder="说点什么" className="w-[200px]" type="text" />
        </div>
        <div className="iconButton flex-1 flex gap-2 h-full ml-[20%] ">
          {/* 视频按钮 */}
          <div className="flex  rounded-md w-[50px] group">
            <div className="hover:bg-normal pl-[10px]">
              <button
                className="w-[30px] h-[30px]"
                onClick={() => {
                  handlerDeviceToggle("video", !videoStatu.open);
                }}
              >
                {!videoStatu.open ? (
                  <BiCameraOff className="size-full" />
                ) : (
                  <BiCamera className="size-full" />
                )}
              </button>
            </div>
            <Select>
              <ul>
                {devices.video.map((item) => (
                  <li
                    key={item.deviceId}
                    className="px-2 flex cursor-pointer justify-between py-1 max-w-[400px] overflow-hidden text-ellipsis whitespace-nowrap   hover:bg-normalGray"
                  >
                    <span>{item.label}</span>
                    {item.deviceId === videoStatu.deviceId && (
                      <div className="ml-4">√</div>
                    )}
                  </li>
                ))}
              </ul>
            </Select>
          </div>
          {/* 音频按钮 */}
          <div className="flex rounded-md  w-[50px] group">
            <div className="hover:bg-normal pl-[10px]">
              <button
                className="w-[25px] h-[25px] flex justify-center items-center "
                onClick={() => {
                  handlerDeviceToggle("audio", !audioStatu.open);
                }}
              >
                {!audioStatu.open ? (
                  <BiMicrophoneOff className="size-full " />
                ) : (
                  <BiMicrophone className="size-full" />
                )}
              </button>
            </div>
            <Select>
              <ul>
                {devices.audio.map((item) => (
                  <li
                    key={item.deviceId}
                    className="px-2 flex cursor-pointer justify-between py-1 max-w-[400px] overflow-hidden text-ellipsis whitespace-nowrap   hover:bg-normalGray"
                  >
                    <span>{item.label}</span>
                    {item.deviceId === audioStatu.deviceId && (
                      <div className="ml-4">√</div>
                    )}
                  </li>
                ))}
              </ul>
            </Select>
          </div>
          <div className="rounded-md w-[50px] px-5">
            <SlScreenDesktop className="size-[30px]" />
          </div>
        </div>
      </footer>
    </div>
  );
}

const Select: React.FC<{
  value?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}> = ({ trigger, children }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const MenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const trg = triggerRef.current;
      const pop = MenuRef.current;
      if (pop && pop.contains(e.target as Node)) return;
      if (trg && trg.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  return (
    <div className="relative group-hover:bg-normal flex items-center w-[10px] z-50">
      <div
        ref={triggerRef}
        onClick={() => {
          setOpen(true);
        }}
        className="hover:cursor-pointer w-full"
      >
        <AiOutlineUp className="w-full" />
      </div>
      {open && (
        <div
          ref={MenuRef}
          className="absolute rounded-sm shadow-md overflow-hidden min-w-[50px] min-h-[20px] z-50 bottom-[100%] left-[50%] translate-x-[-50%] bg-white"
        >
          {children}
        </div>
      )}
    </div>
  );
};
