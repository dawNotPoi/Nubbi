import { Button, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { getAdminMeeting, MeetingType } from "../../api/meeting";

export default function MeetingSchedule() {
  const [meetings, setMeetings] = useState<MeetingType[]>([]);

  useEffect(() => {
    getAdminMeeting().then((res) => {
      if (res.code === 1) setMeetings(res.data);
    });
  }, []);

  const copyMeetingLink = async (id: string) => {
    const link = `http://localhost:3000/video/${id}`;
    await navigator.clipboard.writeText(link);
    message.success("已复制会议链接");
  };

  return (
    <div className="h-full flex flex-col">
      <ul className="overflow-auto">
        {meetings.map((item) => {
          const start = dayjs(item.startTime || item.createdAt);
          const end = start.add(item.duration, "minute");

          return (
            <li
              key={item._id}
              className="rounded-md p-2 cursor-pointer flex items-center hover:bg-gray-500/10"
            >
              <div className="flex-1">
                <h3>{item.title}</h3>
                <h4>{start.format("M月D日")}</h4>
                <span className="text-gray-400 text-sm">
                  {start.format("HH:mm")}-{end.format("HH:mm")}
                </span>
              </div>
              <div className="w-[100px] space-y-2">
                <Button
                  onClick={() => {
                    window.open(
                      `http://localhost:3000/video/${item._id}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                >
                  加入会议
                </Button>
                <Button onClick={() => copyMeetingLink(item._id)}>分享会议</Button>
              </div>
            </li>
          );
        })}
        {meetings.length === 0 && <h3>暂无会议</h3>}
      </ul>
    </div>
  );
}
