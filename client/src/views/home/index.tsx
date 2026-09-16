import { Header } from "@/component/Header";
import RecentMeeting from "../../component/MeetingList/RecentMeeting";
import { useIsMobile } from "@/hooks/useIsMobile";
import MobileHome from "./MobileHome";
import RecentNoteList from "./RecentNoteList";

export default function Home() {
  const isMobile = useIsMobile();

  if (isMobile) return <MobileHome />;

  return (
    <div className="bg-surface text-text-primary">
      <Header className="bg-surface/95" />
      <main className="mx-auto max-w-[1040px] space-y-12 px-8 py-12 lg:px-10">
        <RecentNoteList />
        <RecentMeeting />
      </main>
    </div>
  );
}
