import { Header } from "@/component/Header";
import Meetingmanage from "@/component/MeetingList/Meetingmanage";
import RecentMeetings from "@/component/MeetingList/RecentMeeting";

export default function Meetings() {
  return (
    <>
      <Header />
      <div className="p-4 px-10">
        <section className="mx-auto max-w-screen-xl space-y-6">
          <RecentMeetings />
          <Meetingmanage variant="page" />
        </section>
      </div>
    </>
  );
}
