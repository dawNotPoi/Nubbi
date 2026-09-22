import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import type { StageParticipant } from "../types";

type RemoteAudioProps = { participants: StageParticipant[] };

/** @param props 所有成员流。@returns 独立音轨播放器及自动播放失败时的用户恢复入口。 */
export function RemoteAudio({ participants }: RemoteAudioProps): ReactElement {
  const players = useRef(new Map<string, HTMLAudioElement>());
  const [blocked, setBlocked] = useState(false);
  const playAll = useCallback((): void => {
    setBlocked(false);
    for (const player of players.current.values()) {
      const stream = player.srcObject;
      if (!(stream instanceof MediaStream) || !stream.getAudioTracks().length) continue;
      void player.play().catch(() => { if (players.current.has(player.dataset.peerId || "")) setBlocked(true); });
    }
  }, []);
  useEffect(() => {
    const active = new Set<string>();
    for (const participant of participants) {
      if (participant.isLocal || !participant.stream) continue;
      active.add(participant.id);
      let player = players.current.get(participant.id);
      if (!player) { player = new Audio(); player.dataset.peerId = participant.id; players.current.set(participant.id, player); }
      player.muted = !participant.isAudioEnabled;
      if (player.srcObject !== participant.stream) player.srcObject = participant.stream;
    }
    for (const [id, player] of players.current) {
      if (active.has(id)) continue;
      player.pause(); player.srcObject = null; players.current.delete(id);
    }
    playAll();
  }, [participants, playAll]);
  useEffect(() => {
    const ownedPlayers = players.current;
    return () => { ownedPlayers.forEach((player) => { player.pause(); player.srcObject = null; }); ownedPlayers.clear(); };
  }, []);
  return blocked ? <div role="status" className="flex flex-wrap items-center gap-2 bg-[var(--status-inbox-bg)] px-4 py-2 text-sm text-[var(--status-inbox-text)]">
    浏览器暂未允许播放会议声音。<Button variant="outline" className="min-h-11 md:min-h-8" onClick={playAll}>开启会议声音</Button>
  </div> : <></>;
}
