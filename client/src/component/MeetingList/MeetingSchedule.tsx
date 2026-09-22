import { Button } from "@/components/ui/button";
import { MeetingInvitationButton } from "@/features/meeting/meeting-invitation";
import { AllMeetingAtom } from "@/store/atom/meetingAtom";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 展示指定日期的会议排期，使用账号隔离的共享查询和当前站点邀请链接。
 * @param props 可选的本地日期，省略时展示全部会议。
 * @returns 可加入和分享的会议列表。
 */
export default function MeetingSchedule({ date }: { date?: string }): ReactElement {
  const { data = [], isPending, isError, refetch } = useAtomValue(AllMeetingAtom);
  const navigate = useNavigate();
  const meetings = data.filter((meeting) => !date || dayjs(meeting.startTime || meeting.createdAt).isSame(date, "day"));

  if (isPending) return <p role="status" className="text-sm text-text-muted">正在加载会议…</p>;
  if (isError) return <div role="alert" className="space-y-2 text-sm text-text-muted">会议加载失败<Button variant="outline" onClick={() => void refetch()}>重试</Button></div>;

  return (
    <ul className="max-h-[400px] space-y-2 overflow-auto">
      {meetings.map((item) => {
        const start = dayjs(item.startTime || item.createdAt);
        const end = start.add(item.duration, "minute");
        return (
          <li key={item._id} className="flex flex-col gap-3 rounded-control p-2 hover:bg-bg-hover">
            <div className="min-w-0">
              <h3 className="truncate font-medium">{item.title}</h3>
              <p className="text-sm text-text-muted">{start.format("M月D日 HH:mm")}–{end.format("HH:mm")}</p>
            </div>
            <div className="flex flex-wrap gap-2 [&_button]:min-h-11 md:[&_button]:min-h-8">
              <Button variant="primary" onClick={() => navigate(`/meeting/${item._id}`)}>加入会议</Button>
              <MeetingInvitationButton id={item._id} title={item.title} startTime={item.startTime} />
            </div>
          </li>
        );
      })}
      {meetings.length === 0 && <li className="py-6 text-center text-sm text-text-muted">暂无会议</li>}
    </ul>
  );
}
