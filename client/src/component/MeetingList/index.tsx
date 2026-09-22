import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dayjs from "dayjs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactElement } from "react";
import MeetingSchedule from "./MeetingSchedule";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

/**
 * 展示会议月历，通过月份导航和日期选择浏览排期。
 * @returns 支持窄屏纵向排列的会议日历和当天排期。
 */
export default function MeetingList(): ReactElement {
  const [selectedDate, setSelectedDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const firstDay = month.startOf("month").startOf("week");

  return (
    <section className="grid gap-4 rounded-panel border border-border-row bg-surface p-3 md:grid-cols-2">
      <div className="min-w-0">
        <div className="mb-3 flex items-center gap-2">
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="上个月" onClick={() => setMonth((value) => value.subtract(1, "month"))}><ChevronLeft /></Button>
          <Input type="month" aria-label="选择月份" value={month.format("YYYY-MM")} onChange={(event) => {
            if (event.target.value) setMonth(dayjs(event.target.value + "-01"));
          }} />
          <Button variant="ghost" size="icon" className="min-h-11 min-w-11" aria-label="下个月" onClick={() => setMonth((value) => value.add(1, "month"))}><ChevronRight /></Button>
        </div>
        <div className="grid grid-cols-7 text-center text-sm">
          {WEEKDAYS.map((day) => <span key={day} className="py-2 text-text-muted">{day}</span>)}
          {Array.from({ length: 42 }, (_, index) => {
            const date = firstDay.add(index, "day");
            const key = date.format("YYYY-MM-DD");
            const selected = selectedDate === key;
            return <Button key={key} variant={selected ? "secondary" : "ghost"} className={`h-11 min-w-0 px-0 ${date.month() === month.month() ? "" : "text-text-subtle"}`}
              aria-label={date.format("YYYY年M月D日")} aria-pressed={selected} aria-current={date.isSame(dayjs(), "day") ? "date" : undefined}
              onClick={() => { setSelectedDate(key); setMonth(date.startOf("month")); }}>{date.date()}</Button>;
          })}
        </div>
        <Button variant="outline" className="mt-2 min-h-11" onClick={() => { setSelectedDate(dayjs().format("YYYY-MM-DD")); setMonth(dayjs().startOf("month")); }}>回到今天</Button>
      </div>
      <div className="min-w-0 border-t border-border-row pt-4 md:border-l md:border-t-0 md:pl-4 md:pt-0">
        <h2 className="mb-3 font-medium">{dayjs(selectedDate).format("M月D日")}会议</h2>
        <MeetingSchedule date={selectedDate} />
      </div>
    </section>
  );
}
