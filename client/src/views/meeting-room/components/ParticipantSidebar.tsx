import type { StageParticipant } from "../types";
import ParticipantTile from "./ParticipantTile";
import clsx from "clsx";
import { X } from "lucide-react";

type ParticipantSidebarProps = {
  participants: StageParticipant[];
  activeParticipantId?: string;
  open?: boolean;
  onClose?: () => void;
  onSelectParticipant: (participantId: string) => void;
};

export default function ParticipantSidebar({
  participants,
  activeParticipantId,
  open = false,
  onClose,
  onSelectParticipant,
}: ParticipantSidebarProps) {
  return (
    <aside
      className={clsx(
        "shrink-0 flex-col overflow-hidden bg-bg-panel",
        open
          ? "fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-30 flex max-h-[58dvh] rounded-2xl border border-border-row shadow-2xl"
          : "hidden",
        "md:relative md:inset-auto md:z-auto md:flex md:h-full md:max-h-none md:w-[220px] md:rounded-none md:border-0 md:border-l md:shadow-none",
      )}
    >
      <header className="flex h-12 items-center justify-between border-b border-border-row px-4 md:hidden">
        <span className="text-sm font-medium">参会成员 · {participants.length}</span>
        <button
          aria-label="关闭成员列表"
          className="grid size-9 place-items-center rounded-lg hover:bg-bg-hover"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
      </header>
      <ul className="flex h-full w-full flex-col gap-2 overflow-y-auto p-3 scrollbar-none md:justify-center md:p-2">
        {participants.map((participant) => (
          <ParticipantTile
            key={participant.id}
            id={participant.id}
            name={participant.name}
            stream={participant.stream}
            avatarSrc={participant.avatarSrc}
            isVideoEnabled={participant.isVideoEnabled}
            isAudioEnabled={participant.isAudioEnabled}
            isActive={participant.id === activeParticipantId}
            onSelect={onSelectParticipant}
          />
        ))}
      </ul>
    </aside>
  );
}
