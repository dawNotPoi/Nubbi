import { Header } from "@/component/Header";
import Meetingmanage from "@/component/MeetingList/Meetingmanage";
import RecentMeetings from "@/component/MeetingList/RecentMeeting";

export default function Meetings() {
  return (
    <>
      <Header />
      <div className="px-4 py-5 sm:px-6 md:px-10">
        <section className="mx-auto max-w-screen-xl space-y-6">
          <RecentMeetings />
          <Meetingmanage variant="page" />
        </section>
      </div>
    </>
  );
}
