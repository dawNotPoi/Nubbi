import { Eye, EyeOff, Grid2X2, Monitor, Pin, PinOff } from "lucide-react";
import type { MutableRefObject, ReactElement } from "react";
import type { MeetingStage } from "../hooks/use-meeting-stage";
import ParticipantTile from "./ParticipantTile";
import { ParticipantMedia } from "./participant-media";

type MainVideoStageProps = {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  stage: MeetingStage;
};

/**
 * 画面布局只控制视频与头像呈现，不更改轨道，也不干预音频播放。
 * @param props 当前布局、成员固定状态和本地画面引用。
 * @returns 自适应宫格或单人演示，以及可发现的布局和预览操作。
 */
export default function MainVideoStage({ videoRef, stage }: MainVideoStageProps): ReactElement {
  const activeParticipant = stage.visibleParticipants.find((member) => member.id === stage.activeParticipantId);
  const gridColumns = stage.visibleParticipants.length <= 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3";
  const buttonClass = "flex min-h-10 items-center gap-1 rounded-control border px-3 py-1 text-xs focus-visible:ring-2 focus-visible:ring-focus-ring";

  return <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden bg-bg-panel p-2 sm:p-4">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
      <div role="group" aria-label="画面布局" className="flex gap-1">
        <button type="button" aria-pressed={stage.layout === "grid"} onClick={() => stage.setLayout("grid")}
          className={`${buttonClass} ${stage.layout === "grid" ? "border-accent-border bg-accent-bg text-accent-text" : "border-border-button text-text-primary"}`}>
          <Grid2X2 size={14} />宫格
        </button>
        <button type="button" aria-pressed={stage.layout === "presentation"} onClick={() => stage.setLayout("presentation")}
          className={`${buttonClass} ${stage.layout === "presentation" ? "border-accent-border bg-accent-bg text-accent-text" : "border-border-button text-text-primary"}`}>
          <Monitor size={14} />演示
        </button>
      </div>
      <button type="button" aria-pressed={stage.isSelfHidden} onClick={stage.toggleSelfPreview}
        className={`${buttonClass} border-border-button text-text-muted`}>
        {stage.isSelfHidden ? <Eye size={14} /> : <EyeOff size={14} />}
        {stage.isSelfHidden ? "显示自己" : "隐藏自己"}
      </button>
    </div>
    <p role="status" className="shrink-0 text-xs text-text-muted">
      {stage.pinnedParticipantId ? `已固定 ${activeParticipant?.name || "成员"}，共享不会切换你的画面。` :
        stage.followingScreenShare ? "正在优先展示共享画面；共享结束后恢复原布局。" :
        stage.isSelfHidden ? "仅隐藏自己的预览，其他人仍可接收你已开启的音视频。" : "可在宫格或成员列表中固定画面。"}
    </p>
    {!stage.visibleParticipants.length ? <div className="grid min-h-0 flex-1 place-items-center text-sm text-text-muted">等待其他成员加入</div> :
      stage.layout === "grid" ? <ul className={`grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto p-1 ${gridColumns}`}>
        {stage.visibleParticipants.map((participant) => <ParticipantTile key={participant.id}
          participant={participant} isPinned={participant.id === stage.pinnedParticipantId} onTogglePin={stage.togglePin} />)}
      </ul> : activeParticipant && <div className="relative min-h-0 flex-1">
        <ParticipantMedia participant={activeParticipant} localVideoRef={videoRef} />
        <button type="button" aria-pressed={activeParticipant.id === stage.pinnedParticipantId}
          onClick={() => stage.togglePin(activeParticipant.id)}
          className="absolute right-2 top-2 flex min-h-10 items-center gap-1 rounded-control border border-border-button bg-white px-3 text-xs text-text-primary">
          {activeParticipant.id === stage.pinnedParticipantId ? <PinOff size={14} /> : <Pin size={14} />}
          {activeParticipant.id === stage.pinnedParticipantId ? "取消固定" : "固定此成员"}
        </button>
      </div>}
  </section>;
}
