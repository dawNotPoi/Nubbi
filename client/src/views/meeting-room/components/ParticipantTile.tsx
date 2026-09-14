import { Pin, PinOff } from "lucide-react";
import type { ReactElement } from "react";
import type { StageParticipant } from "../types";
import { ParticipantMedia } from "./participant-media";

type ParticipantTileProps = {
  participant: StageParticipant;
  isPinned: boolean;
  onTogglePin: (participantId: string) => void;
};

/**
 * 用显式按钮固定成员，键盘与触摸操作和鼠标具有相同行为。
 * @param props 当前成员、固定状态及操作。
 * @returns 包含独立固定按钮的成员卡片；无摄像头成员也可固定。
 */
export default function ParticipantTile({ participant, isPinned, onTogglePin }: ParticipantTileProps): ReactElement {
  return <li className={`relative flex h-fit min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border bg-white ${isPinned ? "border-accent-border ring-2 ring-accent-border" : "border-border-row"}`}>
    <div className="aspect-video shrink-0"><ParticipantMedia participant={participant} /></div>
    <button type="button" aria-pressed={isPinned} aria-label={`${isPinned ? "取消固定" : "固定"} ${participant.name}`}
      onClick={() => onTogglePin(participant.id)}
      className="flex min-h-10 w-full shrink-0 items-center justify-center gap-2 text-sm text-text-primary hover:bg-bg-hover focus-visible:ring-2 focus-visible:ring-focus-ring">
      {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
      {isPinned ? "取消固定" : "固定此成员"}
    </button>
  </li>;
}
