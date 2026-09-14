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
    <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
        <CalendarDays size={18} />
        <span>会议管理</span>
      </div>
      <Button icon={<RefreshCw size={14} />} onClick={() => void onRefresh()}>
        刷新
      </Button>
    </div>

    <div className="mb-5 grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl bg-zinc-50 px-4 py-3">
        <div className="text-xs text-zinc-500">会议总数</div>
        <div className="mt-1 text-2xl font-semibold text-zinc-900">
          {stats.total}
        </div>
      </div>
      <div className="rounded-2xl bg-amber-50 px-4 py-3">
        <div className="text-xs text-amber-700">待审批</div>
        <div className="mt-1 text-2xl font-semibold text-amber-900">
          {stats.pending}
        </div>
      </div>
      <div className="rounded-2xl bg-blue-50 px-4 py-3">
        <div className="text-xs text-blue-700">已结束</div>
        <div className="mt-1 text-2xl font-semibold text-blue-900">
          {stats.ended}
        </div>
      </div>
    </div>

    {loading ? (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <MeetingCardSkeleton key={`meeting-manage-skeleton-${index}`} />
        ))}
      </div>
    ) : meetings.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-14">
        <Empty description="暂无会议记录" />
      </div>
    ) : (
      <div className="space-y-3">
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
