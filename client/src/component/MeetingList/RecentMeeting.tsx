import { MeetingAtom } from "@/store/atom/meetingAtom";
import { Button } from "@/components/ui/button";
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

const getWeekDayLabel = (weekDay: number): string => weekDayLabels[weekDay] || "";

/**
 * 会议为空时只保留一个创建入口，避免空状态比真实笔记更醒目。
 * @param props 打开创建会议弹窗的回调。
 * @returns 紧凑的会议空状态。
 */
const RecentMeetingEmpty = ({ onCreate }: RecentMeetingEmptyProps): ReactElement => (
  <div className="flex min-h-28 flex-wrap items-center gap-3 rounded-panel border border-border-row bg-bg-panel px-4 py-4 md:px-5">
    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]">
      <CalendarOff className="size-[18px]" strokeWidth={1.8} />
    </span>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-text-primary">未来一周没有会议</p>
      <p className="mt-1 text-xs text-text-muted">需要协作时，可以创建一场会议。</p>
    </div>
    <Button icon={<Plus />} onClick={onCreate} variant="outline">
      创建会议
    </Button>
  </div>
);

/**
 * 展示未来一周的会议，并按有无会议选择唯一的创建入口。
 * @param props 外层样式和是否展示创建操作。
 * @returns 近期会议列表或紧凑空状态。
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
      <div className="mb-3 flex items-center justify-between gap-3 md:mb-4">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary md:text-base">
          <CalendarDays className="size-[18px] text-[var(--entity-meeting)] md:size-[19px]" />
          近期会议
        </h2>
        {showCreateAction && upcomingWeekMeetings.length > 0 ? (
          <Button variant="primary"
            className="h-9 rounded-control"
            icon={<Plus size={15} />}
            onClick={() => setCreateOpen(true)}
          >
            创建会议
          </Button>
        ) : null}
      </div>

      {upcomingWeekMeetings.length > 0 ? (
        <div className="overflow-hidden rounded-panel border border-border-row bg-surface md:max-h-[400px] md:overflow-y-auto">
          {upcomingWeekMeetings.map((meeting) => (
            <article
              className="grid gap-2.5 border-b border-border-row px-3 py-3.5 last:border-b-0 hover:bg-bg-hover md:grid-cols-[116px_minmax(0,1fr)_auto] md:items-center md:gap-3 md:px-4 md:py-4"
              key={meeting._id}
            >
              <div className="text-[12px] text-text-muted md:text-sm">
                {getWeekDayLabel(dayjs(meeting.startTime).day())}
                <span className="ml-2">{dayjs(meeting.startTime).format("MM-DD")}</span>
              </div>
              <div className="min-w-0 border-l-2 border-[var(--entity-meeting)] pl-3 md:pl-4">
                <p className="truncate text-[15px] font-medium text-text-primary md:text-base">
                  {meeting.title || "未命名会议"}
                </p>
                <p className="mt-1 text-[13px] text-text-muted md:text-sm">
                  {dayjs(meeting.startTime).format("HH:mm")} – {dayjs(meeting.startTime)
                    .add(meeting.duration, "minute")
                    .format("HH:mm")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 [&_button]:min-h-11 md:flex md:flex-wrap md:[&_button]:min-h-8">
                <MeetingInvitationButton id={meeting._id} title={meeting.title} startTime={meeting.startTime} />
                <Button variant="primary" onClick={() => navigate(`/meeting/${meeting._id}`)}>进入会议</Button>
              </div>
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
