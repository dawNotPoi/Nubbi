import type { MeetingType } from "@/api/meeting";
import { Button, Popconfirm, Skeleton, Tag } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { Clock3, MessageSquareText, Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import type { MeetingActions } from "./types";
import { MeetingInvitationButton } from "@/features/meeting/meeting-invitation";

const statusMap = {
  unreviewd: {
    label: "待审批",
    className: "border-amber-200 bg-amber-50 text-amber-700",
  },
  approved: {
    label: "已通过",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "已拒绝",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
} as const;

type MeetingCardProps = MeetingActions & {
  meeting: MeetingType;
  currentUserId?: string;
};

const getMeetingTimeRange = (meeting: MeetingType): string => {
  const start = dayjs(meeting.startTime || meeting.createdAt);
  const end = start.add(meeting.duration, "minute");
  return `${start.format("MM-DD HH:mm")} - ${end.format("MM-DD HH:mm")}`;
};

const MeetingStatusTag = ({ meeting }: { meeting: MeetingType }): ReactElement => {
  if (meeting.endedAt) {
    return (
      <Tag className="m-0 rounded-full border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[12px] text-blue-700">
        已结束
      </Tag>
    );
  }

  const key = meeting.status || "approved";
  const config = statusMap[key];
  return (
    <Tag className={clsx("m-0 rounded-full border px-2.5 py-0.5 text-[12px]", config.className)}>
      {config.label}
    </Tag>
  );
};

export const MeetingCardSkeleton = (): ReactElement => (
  <div className="rounded-panel border border-border-row bg-surface p-4 md:p-5">
    <Skeleton active paragraph={{ rows: 3 }} title={{ width: "48%" }} />
  </div>
);

export const MeetingCard = ({
  meeting,
  currentUserId,
  onVet,
  onJoin,
  onViewComments,
  onDelete,
}: MeetingCardProps): ReactElement => {
  const isHost = Boolean(currentUserId && meeting.hostId === currentUserId);

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

        <div className="grid w-full grid-cols-2 gap-2 [&_.ant-btn]:min-h-10 [&_.ant-btn]:rounded-control md:flex md:w-auto md:flex-wrap md:items-center md:[&_.ant-btn]:min-h-8">
          {isHost && meeting.status === "unreviewd" ? (
            <>
              <Button type="primary" onClick={() => void onVet(meeting._id, "approved")}>
                同意
              </Button>
              <Button onClick={() => void onVet(meeting._id, "rejected")}>拒绝</Button>
            </>
          ) : null}

          {!meeting.endedAt ? (
            <MeetingInvitationButton id={meeting._id} title={meeting.title} startTime={meeting.startTime} />
          ) : null}
          {!meeting.endedAt ? (
            <Button type="primary" onClick={() => onJoin(meeting._id)}>加入会议</Button>
          ) : null}

          {isHost && meeting.endedAt ? (
            <Button onClick={() => void onViewComments(meeting)}>查看评论</Button>
          ) : null}

          {isHost ? (
            <Popconfirm
              title="删除会议"
              description="删除后会议和评论记录都会被移除，确认继续吗？"
              okText="确认"
              cancelText="取消"
              onConfirm={() => void onDelete(meeting._id)}
            >
              <Button danger icon={<Trash2 size={14} />}>删除</Button>
            </Popconfirm>
          ) : null}
        </div>
      </div>
    </article>
  );
};
