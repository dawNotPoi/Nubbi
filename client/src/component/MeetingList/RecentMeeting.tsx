import { MeetingAtom } from "@/store/atom/meetingAtom";
import { Button } from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { CalendarDays, CalendarOff, Plus } from "lucide-react";
import { useMemo, useState, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { CreateMeetingModal } from "./create-meeting-modal";
import { MeetingInvitationButton } from "@/features/meeting/meeting-invitation";

type RecentMeetingsProps = {
  className?: string;
  showCreateAction?: boolean;
};

type RecentMeetingEmptyProps = {
  onCreate: () => void;
};

const weekDayLabels = [
  "星期日",
  "星期一",
  "星期二",
  "星期三",
  "星期四",
  "星期五",
  "星期六",
] as const;

/**
 * 把 dayjs 的星期序号转换为中文星期名称。
 * @param weekDay 星期序号，星期日为 0。
 * @returns 中文星期名称。
 */
const getWeekDayLabel = (weekDay: number): string =>
  weekDayLabels[weekDay] || "";

/**
 * 渲染近期会议的空状态，并保留直接创建会议的入口。
 * @param onCreate 打开创建会议弹窗的回调。
 * @returns 近期会议空状态。
 */
const RecentMeetingEmpty = ({
  onCreate,
}: RecentMeetingEmptyProps): ReactElement => (
  <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-border-row bg-bg-panel px-6 py-12 text-center">
    <div className="flex flex-col items-center">
      <CalendarOff className="text-text-subtle" size={48} strokeWidth={1.5} />
      <p className="mt-4 font-medium text-text-primary">未来一周没有会议</p>
      <p className="mt-1 text-sm text-text-muted">创建会议，开始记录与协作。</p>
      <Button
        className="mt-5"
        icon={<Plus size={16} />}
        onClick={onCreate}
        type="primary"
      >
        创建会议
      </Button>
    </div>
  </div>
);

/**
 * 展示未来一周内尚未结束的会议。
 * @param className 附加样式类名。
 * @param showCreateAction 是否在区块标题处显示创建会议按钮。
 * @returns 近期会议区块。
 */
const RecentMeetings = ({
  className,
  showCreateAction = true,
}: RecentMeetingsProps): ReactElement => {
  const { data: meetings } = useAtomValue(MeetingAtom);
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const upcomingWeekMeetings = useMemo(() => {
    const now = dayjs();
    const windowStart = now.startOf("day");
    const windowEnd = windowStart.add(7, "day").endOf("day");

    return (meetings || [])
      .filter((meeting) => {
        const start = dayjs(meeting.startTime);
        const end = start.add(meeting.duration, "minute");

        return (
          start.isValid() &&
          !meeting.endedAt &&
          end.isAfter(now) &&
          !start.isBefore(windowStart) &&
          !start.isAfter(windowEnd)
        );
      })
      .sort(
        (left, right) =>
          dayjs(left.startTime).valueOf() - dayjs(right.startTime).valueOf(),
      );
  }, [meetings]);

  return (
    <section className={clsx("min-w-0", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
          <CalendarDays className="text-text-muted" size={19} />
          近期会议
        </h2>
        {showCreateAction ? (
          <Button
            icon={<Plus size={15} />}
            onClick={() => setCreateOpen(true)}
          >
            创建会议
          </Button>
        ) : null}
      </div>

      {upcomingWeekMeetings.length > 0 ? (
        <div className="max-h-[400px] overflow-y-auto rounded-xl border border-border-row bg-white scrollbar-thin scrollbar-thumb-border">
          {upcomingWeekMeetings.map((meeting) => (
            <article
              className="grid gap-3 border-b border-border-row px-4 py-4 last:border-b-0 hover:bg-bg-hover sm:grid-cols-[116px_minmax(0,1fr)_auto] sm:items-center"
              key={meeting._id}
            >
              <div className="text-sm text-text-muted">
                {getWeekDayLabel(dayjs(meeting.startTime).day())}
                <span className="ml-2">
                  {dayjs(meeting.startTime).format("MM-DD")}
                </span>
              </div>
              <div className="min-w-0 border-l-2 border-accent-border pl-4">
                <p className="truncate font-medium text-text-primary">
                  {meeting.title || "未命名会议"}
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  {dayjs(meeting.startTime).format("HH:mm")} – {dayjs(meeting.startTime)
                    .add(meeting.duration, "minute")
                    .format("HH:mm")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2"><MeetingInvitationButton id={meeting._id} title={meeting.title} startTime={meeting.startTime} />
              <Button onClick={() => navigate(`/meeting/${meeting._id}`)}>
                进入会议
              </Button></div>
            </article>
          ))}
        </div>
      ) : (
        <RecentMeetingEmpty onCreate={() => setCreateOpen(true)} />
      )}

      <CreateMeetingModal
        onClose={() => setCreateOpen(false)}
        open={createOpen}
      />
    </section>
  );
};

export default RecentMeetings;
