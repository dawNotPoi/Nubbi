import { newNote } from "@/api/note";
import { Header } from "@/component/Header";
import { CreateMeetingModal } from "@/component/MeetingList/create-meeting-modal";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetRow,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatNoteEditedTime } from "@/features/note/model/library";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import { MeetingAtom } from "@/store/atom/meetingAtom";
import { recentNoteAtom } from "@/store/atom/note/noteAtom";
import { createNoteAtom } from "@/store/atom/note/noteMutationAtom";
import { useSession } from "@/utils/auth";
import { routes } from "@/utils/routes";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { CalendarDays, ChevronRight, FileText, Plus, Video } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const headerActionClass =
  "grid size-11 shrink-0 place-items-center rounded-control text-[var(--brand)] transition-colors active:bg-bg-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring [&>svg]:size-5";

export default function MobileHome() {
  const navigate = useNavigate();
  const { data: session } = useSession();
  const owner = session?.user.id ?? "";
  const { data: recentNotes = [], isPending: notesPending } = useAtomValue(recentNoteAtom);
  const { data: meetings = [], isPending: meetingsPending } = useAtomValue(MeetingAtom);
  const createMutation = useAtomValue(createNoteAtom);
  const [createOpen, setCreateOpen] = useState(false);
  const [meetingCreateOpen, setMeetingCreateOpen] = useState(false);

  const upcomingMeetings = useMemo(() => {
    const now = dayjs();
    return meetings
      .filter((meeting) => {
        const start = dayjs(meeting.startTime);
        const end = start.add(meeting.duration, "minute");
        return start.isValid() && !meeting.endedAt && end.isAfter(now);
      })
      .sort((left, right) => dayjs(left.startTime).valueOf() - dayjs(right.startTime).valueOf())
      .slice(0, 4);
  }, [meetings]);

  const createNote = () => {
    if (!owner || createMutation.isPending) return;
    const note = newNote();
    setCreateOpen(false);
    createMutation.mutate(
      { note },
      { onSuccess: () => navigate(routes.note(note._id)) },
    );
  };

  return (
    <div className="min-h-full bg-surface text-text-primary">
      <Header className="border-b border-border-row bg-surface/98">
        <div className="flex h-full items-center gap-2">
          <h1 className="min-w-0 flex-1 truncate text-[20px] font-semibold leading-7">Nubbi</h1>
          <button
            aria-label="新建"
            className={headerActionClass}
            onClick={() => setCreateOpen(true)}
            type="button"
          >
            <Plus />
          </button>
        </div>
      </Header>

      <main className="space-y-7 px-4 pb-6 pt-4">
        <section>
          <div className="mb-2 flex min-h-9 items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
              <FileText className="size-[17px] text-[var(--entity-note)]" strokeWidth={2} />
              最近笔记
            </h2>
            <button
              className="flex min-h-9 items-center gap-1 rounded-control px-2 text-[13px] text-text-muted active:bg-bg-hover"
              onClick={() => navigate(routes.noteLib)}
              type="button"
            >
              查看全部 <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="overflow-hidden rounded-panel border border-border-row bg-surface">
            {notesPending ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex min-h-[64px] items-center gap-3 border-b border-border-row px-3 last:border-b-0">
                  <div className="size-8 animate-pulse rounded-control bg-[var(--entity-note-soft)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded-compact bg-bg-hover" />
                    <div className="h-3 w-1/3 animate-pulse rounded-compact bg-bg-hover" />
                  </div>
                </div>
              ))
            ) : recentNotes.length > 0 ? (
              recentNotes.slice(0, 5).map((note) => (
                <button
                  key={note._id}
                  className="flex min-h-[64px] w-full items-center gap-3 border-b border-border-row px-3 text-left transition-colors last:border-b-0 active:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
                  onClick={() => navigate(routes.note(note._id))}
                  type="button"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-control bg-[var(--entity-note-soft)] text-[var(--entity-note)]">
                    <FileText className="size-[17px]" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium leading-5 text-text-primary">
                      {normalizeNoteTitle(note.title)}
                    </span>
                    <span className="mt-1 block truncate text-[12px] leading-4 text-text-muted">
                      {formatNoteEditedTime(note)} · {note.status}
                    </span>
                  </span>
                  <ChevronRight className="size-[17px] shrink-0 text-text-subtle" />
                </button>
              ))
            ) : (
              <button
                className="flex min-h-[76px] w-full items-center justify-center gap-2 px-4 text-[14px] text-[var(--entity-note)] active:bg-bg-hover"
                onClick={createNote}
                type="button"
              >
                <Plus className="size-4" /> 创建第一篇笔记
              </button>
            )}
          </div>
        </section>

        <section>
          <div className="mb-2 flex min-h-9 items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
              <CalendarDays className="size-[17px] text-[var(--entity-meeting)]" strokeWidth={2} />
              近期会议
            </h2>
            <button
              className="flex min-h-9 items-center gap-1 rounded-control px-2 text-[13px] text-text-muted active:bg-bg-hover"
              onClick={() => navigate(routes.meetings)}
              type="button"
            >
              查看全部 <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="overflow-hidden rounded-panel border border-border-row bg-surface">
            {meetingsPending ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex min-h-[64px] items-center gap-3 border-b border-border-row px-3 last:border-b-0">
                  <div className="size-8 animate-pulse rounded-control bg-[var(--entity-meeting-soft)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded-compact bg-bg-hover" />
                    <div className="h-3 w-1/3 animate-pulse rounded-compact bg-bg-hover" />
                  </div>
                </div>
              ))
            ) : upcomingMeetings.length > 0 ? (
              upcomingMeetings.map((meeting) => (
                <button
                  key={meeting._id}
                  className="flex min-h-[66px] w-full items-center gap-3 border-b border-border-row px-3 text-left transition-colors last:border-b-0 active:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus-ring"
                  onClick={() => navigate(`/meeting/${meeting._id}`)}
                  type="button"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-control bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]">
                    <CalendarDays className="size-[17px]" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium leading-5 text-text-primary">
                      {meeting.title || "未命名会议"}
                    </span>
                    <span className="mt-1 block truncate text-[12px] leading-4 text-text-muted">
                      {dayjs(meeting.startTime).format("M月D日 HH:mm")} · {meeting.duration} 分钟
                    </span>
                  </span>
                  <ChevronRight className="size-[17px] shrink-0 text-text-subtle" />
                </button>
              ))
            ) : (
              <button
                className="flex min-h-[76px] w-full items-center justify-center gap-2 px-4 text-[14px] text-[var(--entity-meeting)] active:bg-bg-hover"
                onClick={() => setMeetingCreateOpen(true)}
                type="button"
              >
                <Video className="size-4" /> 创建会议
              </button>
            )}
          </div>
        </section>
      </main>

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent showClose>
          <SheetHeader>
            <SheetTitle>新建</SheetTitle>
            <SheetDescription>开始新的笔记或会议。</SheetDescription>
          </SheetHeader>
          <div className="space-y-0.5">
            <SheetRow onClick={createNote}>
              <span className="grid size-8 shrink-0 place-items-center rounded-control bg-[var(--entity-note-soft)] text-[var(--entity-note)]">
                <FileText className="size-[18px]" />
              </span>
              <span>
                <span className="block">新建笔记</span>
                <span className="block text-[12px] text-text-muted">从空白笔记开始</span>
              </span>
            </SheetRow>
            <SheetRow
              onClick={() => {
                setCreateOpen(false);
                setMeetingCreateOpen(true);
              }}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-control bg-[var(--entity-meeting-soft)] text-[var(--entity-meeting)]">
                <Video className="size-[18px]" />
              </span>
              <span>
                <span className="block">创建会议</span>
                <span className="block text-[12px] text-text-muted">安排会议并进入协作</span>
              </span>
            </SheetRow>
          </div>
        </SheetContent>
      </Sheet>

      <CreateMeetingModal
        onClose={() => setMeetingCreateOpen(false)}
        open={meetingCreateOpen}
      />
    </div>
  );
}
