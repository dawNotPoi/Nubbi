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

/**
 * 会议管理内容区。
 * 展示统计卡片、刷新按钮；根据加载/空/有数据三种状态渲染列表或占位。
 * @param className 附加类名。
 * @param meetings 会议列表。
 * @param loading 列表是否加载中。
 * @param currentUserId 当前用户 ID。
 * @param stats 统计摘要数据。
 * @param onRefresh 刷新回调。
 * @param onVet 审批会议的回调。
 * @param onJoin 进入会议的回调。
 * @param onViewComments 查看历史评论的回调。
 * @param onDelete 删除会议的回调。
 * @returns 会议管理内容区。
 */
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
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-lg font-semibold text-text-primary">
        <CalendarDays className="text-text-muted" size={19} />
        <span>会议管理</span>
      </div>
      <Button icon={<RefreshCw size={14} />} onClick={() => void onRefresh()}>
        刷新
      </Button>
    </div>

    <div className="mb-6 grid gap-3 md:grid-cols-3">
      <div className="rounded-xl border border-border-row bg-bg-panel px-4 py-4">
        <div className="text-sm text-text-muted">会议总数</div>
        <div className="mt-1 text-2xl font-semibold text-text-primary">
          {stats.total}
        </div>
      </div>
      <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-4">
        <div className="text-sm text-amber-700">待审批</div>
        <div className="mt-1 text-2xl font-semibold text-amber-900">
          {stats.pending}
        </div>
      </div>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-4">
        <div className="text-sm text-emerald-700">已结束</div>
        <div className="mt-1 text-2xl font-semibold text-emerald-900">
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
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-border-row bg-bg-panel py-14">
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
