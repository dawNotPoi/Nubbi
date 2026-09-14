import type { StageParticipant } from "../types";
import ParticipantTile from "./ParticipantTile";

type ParticipantSidebarProps = {
  participants: StageParticipant[];
  activeParticipantId?: string;
  onSelectParticipant: (participantId: string) => void;
};

export default function ParticipantSidebar({
  participants,
  activeParticipantId,
  onSelectParticipant,
}: ParticipantSidebarProps) {
  return (
    <aside className="w-[15%] py-10 bg-normal">
      <ul className="min-w-[200px] h-full max-w-[300px] flex gap-1 flex-col overflow-y-scroll justify-center scrollbar-none">
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
