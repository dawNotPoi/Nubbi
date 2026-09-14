import type { MeetingType } from "@/api/meeting";
import { Button, Popconfirm, Skeleton, Tag } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { Clock3, MessageSquareText, Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import type { MeetingActions } from "./types";

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

const MeetingStatusTag = ({
  meeting,
}: {
  meeting: MeetingType;
}): ReactElement => {
  if (meeting.endedAt) {
    return (
      <Tag className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
        已结束
      </Tag>
    );
  }

  const key = meeting.status || "approved";
  const config = statusMap[key];
  return (
    <Tag className={clsx("rounded-full border px-3 py-1", config.className)}>
      {config.label}
    </Tag>
  );
};

export const MeetingCardSkeleton = (): ReactElement => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
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
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 transition-colors hover:border-sky-200 hover:bg-sky-50/30 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-zinc-900">
              {meeting.title || "未命名会议"}
            </h3>
            <MeetingStatusTag meeting={meeting} />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={14} />
              {getMeetingTimeRange(meeting)}
            </span>
            {meeting.endedAt ? (
              <span className="inline-flex items-center gap-1 text-blue-600">
                <MessageSquareText size={14} />
                已于 {dayjs(meeting.endedAt).format("MM-DD HH:mm")} 结束
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isHost && meeting.status === "unreviewd" ? (
            <>
              <Button
                type="primary"
                onClick={() => void onVet(meeting._id, "approved")}
              >
                同意
              </Button>
              <Button onClick={() => void onVet(meeting._id, "rejected")}>
                拒绝
              </Button>
            </>
          ) : null}

          {!meeting.endedAt ? (
            <Button type="primary" onClick={() => onJoin(meeting._id)}>
              加入会议
            </Button>
          ) : null}

          {isHost && meeting.endedAt ? (
            <Button onClick={() => void onViewComments(meeting)}>
              查看评论
            </Button>
          ) : null}

          {isHost ? (
            <Popconfirm
              title="删除会议"
              description="删除后会议和评论记录都会被移除，确认继续吗？"
              okText="确认"
              cancelText="取消"
              onConfirm={() => void onDelete(meeting._id)}
            >
              <Button danger icon={<Trash2 size={14} />}>
                删除
              </Button>
            </Popconfirm>
          ) : null}
        </div>
      </div>
    </div>
  );
};
