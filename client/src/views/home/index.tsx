import { Header } from "@/component/Header";
import RecentMeeting from "../../component/MeetingList/RecentMeeting";
import RecentNoteList from "./RecentNoteList";

export default function Home() {
  return (
    <div>
      <Header />
      <main className="mx-auto max-w-[1000px] space-y-10 px-4 py-6 sm:px-6 md:py-12">
        <RecentNoteList />
        <RecentMeeting />
      </main>
    </div>
  );
}
