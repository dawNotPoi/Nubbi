import { Dropdown } from "antd";
import { ChevronUp } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import type { DeviceStatus } from "../types";

type Props = { label: string; icon: ReactNode; status: DeviceStatus; devices: MediaDeviceInfo[];
  busy: boolean; onToggle: () => void; onSelect: (id: string) => void };

/** @param props 设备开关、选择及申请状态。@returns 键盘可操作且不被控制栏裁剪的设备菜单。 */
export function MediaDeviceControl({ label, icon, status, devices, busy, onToggle, onSelect }: Props): ReactElement {
  const available = devices.filter((device) => device.deviceId);
  return <div className="flex shrink-0 items-stretch rounded-control border border-border-button bg-white">
    <button type="button" aria-pressed={status.open} disabled={busy} onClick={onToggle}
      className="flex min-h-11 min-w-16 flex-col items-center justify-center gap-1 px-2 py-1 text-xs text-text-primary hover:bg-bg-hover disabled:opacity-50">
      {icon}<span>{busy ? "等待权限…" : label}</span>
    </button>
    <Dropdown trigger={["click"]} disabled={busy} placement="topLeft" menu={{ selectedKeys: [status.deviceId],
      items: available.length ? available.map((device, index) => ({ key: device.deviceId, label: device.label || `设备 ${index + 1}` })) : [{ key: "empty", label: "暂无设备，请先开启以授权", disabled: true }],
      onClick: ({ key }) => onSelect(key) }}>
      <button type="button" aria-label={`选择${label.includes("麦克风") ? "麦克风" : "摄像头"}设备`} disabled={busy}
        className="grid min-h-11 w-8 place-items-center border-l border-border-row text-text-muted hover:bg-bg-hover"><ChevronUp size={16} /></button>
    </Dropdown>
  </div>;
}
