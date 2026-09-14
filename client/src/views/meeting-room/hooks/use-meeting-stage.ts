import { useCallback, useEffect, useState } from "react";
import type { StageParticipant } from "../types";

/** 宫格展示所有可见成员，演示布局放大当前选择。 */
export type MeetingLayout = "grid" | "presentation";

/** 仅作用于当前浏览器的画面偏好，不修改成员媒体状态。 */
export type MeetingStage = {
  layout: MeetingLayout;
  visibleParticipants: StageParticipant[];
  activeParticipantId?: string;
  pinnedParticipantId?: string;
  isSelfHidden: boolean;
  followingScreenShare: boolean;
  setLayout: (layout: MeetingLayout) => void;
  togglePin: (participantId: string) => void;
  toggleSelfPreview: () => void;
};

/**
 * 固定优先于共享；自动跟随共享不覆盖用户原来的布局和选择。
 * @param participants 完整成员列表，包括本地成员和无摄像头成员。
 * @returns 当前画面派生状态及明确的用户操作。
 */
export function useMeetingStage(participants: StageParticipant[]): MeetingStage {
  const [preferredLayout, setPreferredLayout] = useState<MeetingLayout>("presentation");
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>();
  const [pinnedParticipantId, setPinnedParticipantId] = useState<string>();
  const [isSelfHidden, setSelfHidden] = useState(false);
  const [dismissedSharingIds, setDismissedSharingIds] = useState<string[]>([]);
  const visibleParticipants = participants.filter((member) => !isSelfHidden || !member.isLocal);
  const pinnedParticipant = visibleParticipants.find((member) => member.id === pinnedParticipantId);
  const sharingParticipant = visibleParticipants.find((member) => member.isScreenSharing && !dismissedSharingIds.includes(member.id));
  const selectedParticipant = visibleParticipants.find((member) => member.id === selectedParticipantId);
  const fallbackParticipant = visibleParticipants.find((member) => member.isVideoEnabled) || visibleParticipants[0];
  const activeParticipant = pinnedParticipant || sharingParticipant || selectedParticipant || fallbackParticipant;
  const followingScreenShare = !pinnedParticipant && Boolean(sharingParticipant);

  useEffect(() => {
    const memberIds = new Set(participants.map((member) => member.id));
    if (pinnedParticipantId && !memberIds.has(pinnedParticipantId)) setPinnedParticipantId(undefined);
    if (selectedParticipantId && !memberIds.has(selectedParticipantId)) setSelectedParticipantId(undefined);
    // 停止后再次共享属于新的共享周期，允许重新自动展示。
    setDismissedSharingIds((previous) => {
      const next = previous.filter((id) => participants.some((member) => member.id === id && member.isScreenSharing));
      return next.length === previous.length ? previous : next;
    });
  }, [participants, pinnedParticipantId, selectedParticipantId]);

  /** @param layout 用户主动选择的布局。@returns 无；宫格选择覆盖当前共享的自动跳转。 */
  const setLayout = useCallback((layout: MeetingLayout): void => {
    setPreferredLayout(layout);
    if (layout === "grid") {
      setPinnedParticipantId(undefined);
      setDismissedSharingIds(participants.filter((member) => member.isScreenSharing).map((member) => member.id));
    } else {
      setDismissedSharingIds([]);
    }
  }, [participants]);

  /** @param participantId 用户要固定或取消固定的成员。@returns 无；无摄像头时也能固定头像。 */
  const togglePin = useCallback((participantId: string): void => {
    const participant = participants.find((member) => member.id === participantId);
    if (!participant) return;
    if (pinnedParticipantId === participantId) {
      setPinnedParticipantId(undefined);
      return;
    }
    if (participant.isLocal) setSelfHidden(false);
    setSelectedParticipantId(participantId);
    setPinnedParticipantId(participantId);
  }, [participants, pinnedParticipantId]);

  /** @returns 无；隐藏预览不暂停本地轨道或关闭设备。 */
  const toggleSelfPreview = useCallback((): void => {
    if (!isSelfHidden && participants.some((member) => member.isLocal && member.id === pinnedParticipantId)) {
      setPinnedParticipantId(undefined);
    }
    setSelfHidden((hidden) => !hidden);
  }, [isSelfHidden, participants, pinnedParticipantId]);

  return {
    layout: pinnedParticipant || followingScreenShare ? "presentation" : preferredLayout,
    visibleParticipants,
    activeParticipantId: activeParticipant?.id,
    pinnedParticipantId: pinnedParticipant?.id,
    isSelfHidden,
    followingScreenShare,
    setLayout,
    togglePin,
    toggleSelfPreview,
  };
}
