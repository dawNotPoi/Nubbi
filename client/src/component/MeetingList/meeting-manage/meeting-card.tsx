import type { MeetingType } from "@/api/meeting";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import clsx from "clsx";
import dayjs from "dayjs";
import { Clock3, MessageSquareText, Trash2 } from "lucide-react";
import { useEffect, useRef, type ReactElement } from "react";
import type { MeetingActions } from "./types";
import { MeetingInvitationButton } from "@/features/meeting/meeting-invitation";

const statusMap = {
  unreviewd: {
    label: "待审批",
    className: "bg-[var(--status-inbox-bg)] text-[var(--status-inbox-text)]",
  },
  approved: {
    label: "已通过",
    className: "bg-[var(--status-active-bg)] text-[var(--status-active-text)]",
  },
  rejected: {
    label: "已拒绝",
    className: "bg-[var(--danger-bg)] text-[var(--danger-text)]",
  },
} as const;

type MeetingCardProps = MeetingActions & {
  meeting: MeetingType;
  currentUserId?: string;
};

/** @param meeting 会议时间信息。@returns 本地时区的起止时间。 */
const getMeetingTimeRange = (meeting: MeetingType): string => {
  const start = dayjs(meeting.startTime || meeting.createdAt);
  const end = start.add(meeting.duration, "minute");
  return `${start.format("MM-DD HH:mm")} - ${end.format("MM-DD HH:mm")}`;
};

/** @param props 会议状态。@returns 以语义色呈现的状态标记。 */
const MeetingStatusTag = ({ meeting }: { meeting: MeetingType }): ReactElement => {
  if (meeting.endedAt) {
    return (
      <span className="rounded-full bg-bg-selected px-2.5 py-0.5 text-[12px] text-text-muted">
        已结束
      </span>
    );
  }

  const key = meeting.status || "approved";
  const config = statusMap[key];
  return (
    <span className={clsx("rounded-full px-2.5 py-0.5 text-[12px]", config.className)}>
      {config.label}
    </span>
  );
};

/** @returns 会议卡片加载占位。 */
export const MeetingCardSkeleton = (): ReactElement => (
  <div className="rounded-panel border border-border-row bg-surface p-4 md:p-5">
    <Skeleton className="mb-4 h-5 w-1/2" />
    <Skeleton className="mb-2 h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
  </div>
);

/** @param props 会议信息、当前账号及会议操作。@returns 保留主持人权限和删除确认的会议卡片。 */
export const MeetingCard = ({
  meeting,
  currentUserId,
  onVet,
  onJoin,
  onViewComments,
  onDelete,
}: MeetingCardProps): ReactElement => {
  const isHost = Boolean(currentUserId && meeting.hostId === currentUserId);
  const confirmationRef = useRef<ReturnType<typeof confirmDialog> | null>(null);
  useEffect(() => () => confirmationRef.current?.destroy(), [currentUserId]);

  return (
    <article className="rounded-panel border border-border-row bg-surface p-4 transition-colors hover:bg-bg-hover md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex min-w-0 flex-wrap items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-text-primary md:text-base">
              {meeting.title || "未命名会议"}
            </h3>
            <MeetingStatusTag meeting={meeting} />
          </div>
          <div className="space-y-1.5 text-[13px] text-text-muted md:flex md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2 md:space-y-0 md:text-sm">
            <span className="flex items-center gap-1.5">
              <Clock3 className="size-[15px] shrink-0" />
              <span className="truncate">{getMeetingTimeRange(meeting)}</span>
            </span>
            {meeting.endedAt ? (
              <span className="flex items-center gap-1.5 text-text-muted">
                <MessageSquareText className="size-[15px] shrink-0" />
                <span className="truncate">已于 {dayjs(meeting.endedAt).format("MM-DD HH:mm")} 结束</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 [&_button]:min-h-11 md:flex md:w-auto md:flex-wrap md:items-center md:[&_button]:min-h-8">
          {isHost && meeting.status === "unreviewd" ? (
            <>
              <Button variant="primary" onClick={() => void onVet(meeting._id, "approved")}>
                同意
              </Button>
              <Button variant="outline" onClick={() => void onVet(meeting._id, "rejected")}>拒绝</Button>
            </>
          ) : null}

          {!meeting.endedAt ? (
            <MeetingInvitationButton id={meeting._id} title={meeting.title} startTime={meeting.startTime} />
          ) : null}
          {!meeting.endedAt ? (
            <Button variant="primary" onClick={() => onJoin(meeting._id)}>加入会议</Button>
          ) : null}

          {isHost && meeting.endedAt ? (
            <Button variant="outline" onClick={() => void onViewComments(meeting)}>查看评论</Button>
          ) : null}

          {isHost ? (
            <Button variant="destructive" icon={<Trash2 />} onClick={() => {
              confirmationRef.current?.destroy();
              confirmationRef.current = confirmDialog({
              title: "删除会议",
              content: "删除后会议和评论记录都会被移除，确认继续吗？",
              okText: "确认删除",
              cancelText: "取消",
              danger: true,
              onOk: () => onDelete(meeting._id),
              });
            }}>删除</Button>
          ) : null}
        </div>
      </div>
    </article>
  );
};
