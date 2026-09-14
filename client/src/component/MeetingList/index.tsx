import { Calendar } from "antd";

import MeetingSchedule from "./MeetingSchedule";

export default function MeetingList() {
  const onPanelChange = () => {};

  return (
    <div className="p-2 border shadow-md flex h-[400px]">
      <Calendar
        className="w-[50%]"
        fullscreen={false}
        onPanelChange={onPanelChange}
      />
      <div className="border-l-2 p-2 w-[50%] h-full">
        <MeetingSchedule />
      </div>
    </div>
  );
}
