import RecentMeeting from "./RecentMeeting";
import RecentNoteList from "./RecentNoteList";

export default function Home() {
  return (
    <div>
      <main className="max-w-[1000px] mx-auto px-4">
        <header>
          <h2 className="font-bold h-[100px] flex items-center justify-center">
            Good morning
          </h2>
        </header>
        <RecentNoteList className="mt-10" />
        <RecentMeeting className="mt-10" />
      </main>
    </div>
  );
}
