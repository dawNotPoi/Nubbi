import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ChevronUp } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import type { DeviceStatus } from "../types";

type Props = { label: string; icon: ReactNode; status: DeviceStatus; devices: MediaDeviceInfo[];
  busy: boolean; onToggle: () => void; onSelect: (id: string) => void };

/** @param props 设备开关、选择及申请状态。@returns 键盘可操作且不被控制栏裁剪的设备菜单。 */
export function MediaDeviceControl({ label, icon, status, devices, busy, onToggle, onSelect }: Props): ReactElement {
  const available = devices.filter((device) => device.deviceId);
  return <div className="flex shrink-0 items-stretch rounded-control border border-border-button bg-surface">
    <Button variant="ghost" aria-pressed={status.open} disabled={busy} onClick={onToggle}
      className="h-auto min-h-11 min-w-16 flex-col gap-1 rounded-r-none px-2 py-1 text-xs">
      {icon}<span>{busy ? "等待权限…" : label}</span>
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" aria-label={`选择${label.includes("麦克风") ? "麦克风" : "摄像头"}设备`} disabled={busy}
        className="h-auto min-h-11 w-11 rounded-l-none border-l border-border-row px-2" />}>
        <ChevronUp />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {available.length ? (
          <DropdownMenuRadioGroup value={status.deviceId} onValueChange={onSelect}>
            {available.map((device, index) => <DropdownMenuRadioItem key={device.deviceId} value={device.deviceId}>{device.label || `设备 ${index + 1}`}</DropdownMenuRadioItem>)}
          </DropdownMenuRadioGroup>
        ) : <DropdownMenuItem disabled>暂无设备，请先开启以授权</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}
