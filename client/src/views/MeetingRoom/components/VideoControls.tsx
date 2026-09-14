import Input from "antd/es/input/Input";
import clsx from "clsx";
import {
  BiCamera,
  BiCameraOff,
  BiMicrophone,
  BiMicrophoneOff,
} from "react-icons/bi";
import { LuMessageSquareText } from "react-icons/lu";
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
  isCommentOpen: boolean;
  commentCount: number;
  onToggleDevice: (kind: MediaToggleKind, enabled: boolean) => void;
  onSwitchDevice: (kind: MediaDeviceKind, deviceId: string) => void;
  onToggleComment: () => void;
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
  badgeCount?: number;
  onClick?: () => void;
  withSelect?: boolean;
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
              selected
                ? "bg-slate-100 text-slate-900"
                : "text-slate-600 hover:bg-slate-50",
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

function ActionItem({
  active,
  label,
  icon,
  badgeCount,
  onClick,
  withSelect = false,
  children,
}: ActionItemProps) {
  return (
    <div className="flex items-stretch rounded-xl border border-slate-200 shadow-sm">
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-l-xl px-3 py-2 text-center transition-all",
          active
            ? "bg-white text-slate-700 hover:bg-slate-50"
            : "bg-slate-50 text-slate-400 hover:bg-slate-100",
        )}
      >
        {badgeCount ? (
          <span className="absolute -right-1.5 -top-1.5 flex min-w-5 items-center justify-center rounded-full bg-[#2f3437] px-1.5 text-[10px] font-semibold leading-5 text-white shadow-sm">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        ) : null}
        <span className="flex size-5 shrink-0 items-center justify-center text-[22px]">
          {icon}
        </span>
        <span
          className={clsx(
            "max-w-full truncate text-[11px] leading-4",
            active ? "text-slate-700" : "text-slate-400",
          )}
        >
          {label}
        </span>
      </button>
      {withSelect ? children : null}
    </div>
  );
}

export default function VideoControls({
  devices,
  videoStatus,
  audioStatus,
  isCommentOpen,
  commentCount,
  onToggleDevice,
  onSwitchDevice,
  onToggleComment,
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
            withSelect
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
            withSelect
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
          <ActionItem
            active={isCommentOpen}
            label={isCommentOpen ? "关闭评论" : "打开评论"}
            icon={<LuMessageSquareText />}
            badgeCount={commentCount}
            onClick={onToggleComment}
          />
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
