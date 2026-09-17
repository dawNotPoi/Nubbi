import type { MeetingType } from "@/api/meeting";
import { Button, Empty } from "antd";
import { CalendarDays, RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import { MeetingCard, MeetingCardSkeleton } from "./meeting-card";
import type { MeetingActions, MeetingStats } from "./types";

type MeetingManageContentProps = MeetingActions & {
  className?: string;
  meetings: MeetingType[];
  loading: boolean;
  currentUserId?: string;
  stats: MeetingStats;
  onRefresh: () => Promise<void>;
};

export const MeetingManageContent = ({
  className,
  meetings,
  loading,
  currentUserId,
  stats,
  onRefresh,
  onVet,
  onJoin,
  onViewComments,
  onDelete,
}: MeetingManageContentProps): ReactElement => (
  <div className={className}>
    <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
      <div className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-text-primary md:text-lg">
        <CalendarDays className="size-[18px] shrink-0 text-[var(--entity-meeting)] md:size-[19px]" />
        <span>会议管理</span>
      </div>
      <Button
        className="h-9 rounded-[7px]"
        icon={<RefreshCw size={14} />}
        onClick={() => void onRefresh()}
      >
        <span className="hidden sm:inline">刷新</span>
      </Button>
    </div>

    <div className="mb-5 grid grid-cols-3 gap-2 md:mb-6 md:gap-3">
      <div className="rounded-[9px] border border-border-row bg-bg-panel px-3 py-3 md:rounded-xl md:px-4 md:py-4">
        <div className="truncate text-[11px] text-text-muted md:text-sm">会议总数</div>
        <div className="mt-1 text-xl font-semibold text-text-primary md:text-2xl">{stats.total}</div>
      </div>
      <div className="rounded-[9px] border border-border-row bg-[var(--status-inbox-bg)] px-3 py-3 md:rounded-xl md:px-4 md:py-4">
        <div className="truncate text-[11px] text-[var(--status-inbox-text)] md:text-sm">待审批</div>
        <div className="mt-1 text-xl font-semibold text-[var(--status-inbox-text)] md:text-2xl">{stats.pending}</div>
      </div>
      <div className="rounded-[9px] border border-border-row bg-[var(--status-active-bg)] px-3 py-3 md:rounded-xl md:px-4 md:py-4">
        <div className="truncate text-[11px] text-[var(--status-active-text)] md:text-sm">已结束</div>
        <div className="mt-1 text-xl font-semibold text-[var(--status-active-text)] md:text-2xl">{stats.ended}</div>
      </div>
    </div>

    {loading ? (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <MeetingCardSkeleton key={`meeting-manage-skeleton-${index}`} />
        ))}
      </div>
    ) : meetings.length === 0 ? (
      <div className="flex min-h-[180px] items-center justify-center rounded-[10px] border border-border-row bg-bg-panel py-10 md:min-h-[240px] md:rounded-xl md:py-14">
        <Empty description="暂无会议记录" />
      </div>
    ) : (
      <div className="space-y-2.5 md:space-y-3">
        {meetings.map((meeting) => (
          <MeetingCard
            key={meeting._id}
            meeting={meeting}
            currentUserId={currentUserId}
            onVet={onVet}
            onJoin={onJoin}
            onViewComments={onViewComments}
            onDelete={onDelete}
          />
        ))}
      </div>
    )}
  </div>
);
