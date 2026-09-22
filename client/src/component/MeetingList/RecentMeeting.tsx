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

const RecentMeetingEmpty = ({ onCreate }: RecentMeetingEmptyProps): ReactElement => (
  <div className="flex min-h-[168px] items-center justify-center rounded-panel border border-border-row bg-bg-panel px-5 py-8 text-center md:min-h-[280px] md:px-6 md:py-12">
    <div className="flex flex-col items-center">
      <span className="grid size-12 place-items-center rounded-control bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]">
        <CalendarOff className="size-7 md:size-8" strokeWidth={1.6} />
      </span>
      <p className="mt-3 text-[14px] font-medium text-text-primary md:mt-4 md:text-base">未来一周没有会议</p>
      <p className="mt-1 text-[13px] text-text-muted md:text-sm">创建会议，开始记录与协作。</p>
      <Button
        className="mt-4 h-10 rounded-control md:mt-5 md:h-auto"
        icon={<Plus size={16} />}
        onClick={onCreate}
        variant="primary"
      >
        创建会议
      </Button>
    </div>
  </div>
);

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
        {showCreateAction ? (
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
