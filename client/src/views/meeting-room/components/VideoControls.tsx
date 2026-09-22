import { Input } from "@/components/ui/input";
import { Camera, CameraOff, MessageSquareText, Mic, MicOff, Monitor, Users } from "lucide-react";
import type { ReactElement, ReactNode } from "react";
import type { DeviceStatus, MediaDeviceKind, MediaDevices, MediaToggleKind } from "../types";
import type { MediaSnapshot } from "../media/media-state";
import { MediaDeviceControl } from "./media-device-control";
import type { MeetingChat } from "../hooks/use-meeting-chat";

type VideoControlsProps = {
  devices: MediaDevices; videoStatus: DeviceStatus; audioStatus: DeviceStatus; busy: MediaSnapshot["busy"];
  isScreenSharing: boolean; isCommentOpen: boolean; isParticipantOpen: boolean;
  participantCount: number; commentCount: number; endActionLabel: string; ending?: boolean;
  onToggleDevice: (kind: MediaToggleKind, enabled: boolean) => void;
  onSwitchDevice: (kind: MediaDeviceKind, deviceId: string) => void;
  onToggleScreenShare: () => void;
  chat: MeetingChat;
  onToggleComment: () => void; onToggleParticipants: () => void; onEndMeeting: () => void;
};
type ActionProps = { label: string; icon: ReactNode; active: boolean; count?: number; disabled?: boolean; onClick: () => void };

/** @param props 操作状态和回调。@returns 有明确按压状态的控制按钮。 */
function ControlAction({ label, icon, active, count, disabled, onClick }: ActionProps): ReactElement {
  return <button type="button" aria-pressed={active} disabled={disabled} onClick={onClick}
    className={`relative flex min-h-11 min-w-16 shrink-0 flex-col items-center justify-center gap-1 rounded-control border px-2 py-1 text-xs disabled:opacity-50 ${active ? "border-accent-border bg-accent-bg text-accent-text" : "border-border-button bg-surface text-text-primary hover:bg-bg-hover"}`}>
    {icon}<span>{label}{count ? ` (${count > 99 ? "99+" : count})` : ""}</span>
  </button>;
}

/** @param props 媒体状态及会议操作。@returns 桌面和手机共用的底部操作栏。 */
export default function VideoControls(props: VideoControlsProps): ReactElement {
  const { chat } = props;
  return <footer className="shrink-0 border-t border-border-row bg-surface px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2">
    <div className="flex min-w-0 items-center gap-2">
      <Input className="hidden max-w-48 lg:block" aria-label="快捷发送会议消息" placeholder={chat.needsResendConfirmation ? "请先核对聊天记录" : "输入消息，回车发送"} value={chat.draft}
        onChange={(event) => chat.updateDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) void chat.send(); }} />
      <div className="flex min-w-0 flex-1 flex-wrap gap-2 md:flex-nowrap md:justify-center md:overflow-x-auto">
        <MediaDeviceControl label={props.audioStatus.open ? "关闭麦克风" : "开启麦克风"} icon={props.audioStatus.open ? <Mic size={18} /> : <MicOff size={18} />}
          status={props.audioStatus} devices={props.devices.audio} busy={props.busy.audio} onToggle={() => props.onToggleDevice("audio", !props.audioStatus.open)} onSelect={(id) => props.onSwitchDevice("audioinput", id)} />
        <MediaDeviceControl label={props.videoStatus.open ? "关闭摄像头" : "开启摄像头"} icon={props.videoStatus.open ? <Camera size={18} /> : <CameraOff size={18} />}
          status={props.videoStatus} devices={props.devices.video} busy={props.busy.video} onToggle={() => props.onToggleDevice("video", !props.videoStatus.open)} onSelect={(id) => props.onSwitchDevice("videoinput", id)} />
        <ControlAction label={props.busy.screen ? "选择共享…" : props.isScreenSharing ? "停止共享" : "共享屏幕"} icon={<Monitor size={18} />} active={props.isScreenSharing} disabled={props.busy.screen} onClick={props.onToggleScreenShare} />
        <ControlAction label="成员" icon={<Users size={18} />} active={props.isParticipantOpen} count={props.participantCount} onClick={props.onToggleParticipants} />
        <ControlAction label="聊天" icon={<MessageSquareText size={18} />} active={props.isCommentOpen} count={props.commentCount} onClick={props.onToggleComment} />
      </div>
      <button type="button" disabled={props.ending} onClick={props.onEndMeeting} className="min-h-11 shrink-0 rounded-control px-2 text-sm text-[var(--danger-text)] hover:bg-[var(--danger-bg)] disabled:opacity-50">
        {props.ending ? "处理中…" : props.endActionLabel}
      </button>
    </div>
  </footer>;
}
