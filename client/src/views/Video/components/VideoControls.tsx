import Input from "antd/es/input/Input";
import clsx from "clsx";
import { BiCamera, BiCameraOff, BiMicrophone, BiMicrophoneOff } from "react-icons/bi";
import { SlScreenDesktop } from "react-icons/sl";
import type {
  DeviceStatus,
  MediaDeviceKind,
  MediaDevices,
  MediaToggleKind,
} from "../types";
import Select from "./Select";

type VideoControlsProps = {
  devices: MediaDevices;
  videoStatus: DeviceStatus;
  audioStatus: DeviceStatus;
  onToggleDevice: (kind: MediaToggleKind, enabled: boolean) => void;
  onSwitchDevice: (kind: MediaDeviceKind, deviceId: string) => void;
};

type DeviceMenuProps = {
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  onSelect: (deviceId: string) => void;
};

type ActionItemProps = {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
};

function DeviceMenu({ devices, selectedDeviceId, onSelect }: DeviceMenuProps) {
  if (devices.length === 0) {
    return (
      <ul className="min-w-[260px] py-2">
        <li className="mx-2 rounded-lg px-3 py-2 text-sm text-slate-400">
          暂无可用设备
        </li>
      </ul>
    );
  }

  return (
    <ul className="min-w-[260px] py-2">
      {devices.map((item) => {
        const selected = item.deviceId === selectedDeviceId;

        return (
          <li
            key={item.deviceId}
            onClick={() => onSelect(item.deviceId)}
            className={clsx(
              "mx-2 flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
              selected ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <span className="max-w-[190px] overflow-hidden text-ellipsis whitespace-nowrap">
              {item.label || "Unnamed device"}
            </span>
            {selected && <span className="text-xs text-slate-400">当前</span>}
          </li>
        );
      })}
    </ul>
  );
}

function ActionItem({ active, label, icon, onClick, children }: ActionItemProps) {
  return (
    <div className="flex w-[84px] flex-col items-center">
      <div className="flex items-center justify-center gap-[4px]">
        <button
          type="button"
          onClick={onClick}
          className={clsx(
            "flex size-10 items-center justify-center rounded-xl border transition-all",
            active
              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              : "border-slate-200 bg-slate-50 text-slate-400 hover:bg-slate-100"
          )}
        >
          <span className="flex size-5 items-center justify-center text-[22px]">{icon}</span>
        </button>
        {children}
      </div>
      <span
        className={clsx(
          "mt-1 w-full text-center text-xs leading-5",
          active ? "text-slate-700" : "text-slate-400"
        )}
      >
        {label}
      </span>
    </div>
  );
}

export default function VideoControls({
  devices,
  videoStatus,
  audioStatus,
  onToggleDevice,
  onSwitchDevice,
}: VideoControlsProps) {
  return (
    <footer className="w-full border-t border-slate-200 bg-white/95 px-3 py-2 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-[210px] items-center gap-2">
          <div className="w-full rounded-xl bg-slate-100 px-1 py-1">
            <Input
              placeholder="说点什么..."
              bordered={false}
              className="bg-transparent"
              type="text"
            />
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center gap-5">
          <ActionItem
            active={audioStatus.open}
            label="选择音频"
            icon={audioStatus.open ? <BiMicrophone /> : <BiMicrophoneOff />}
            onClick={() => onToggleDevice("audio", !audioStatus.open)}
          >
            <Select>
              <DeviceMenu
                devices={devices.audio}
                selectedDeviceId={audioStatus.deviceId}
                onSelect={(deviceId) => onSwitchDevice("audioinput", deviceId)}
              />
            </Select>
          </ActionItem>

          <ActionItem
            active={videoStatus.open}
            label={videoStatus.open ? "开启视频" : "关闭视频"}
            icon={videoStatus.open ? <BiCamera /> : <BiCameraOff />}
            onClick={() => onToggleDevice("video", !videoStatus.open)}
          >
            <Select>
              <DeviceMenu
                devices={devices.video}
                selectedDeviceId={videoStatus.deviceId}
                onSelect={(deviceId) => onSwitchDevice("videoinput", deviceId)}
              />
            </Select>
          </ActionItem>

          <ActionItem active label="共享屏幕" icon={<SlScreenDesktop />} />
        </div>

        <div className="flex w-[210px] justify-end">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50"
          >
            结束会议
          </button>
        </div>
      </div>
    </footer>
  );
}
