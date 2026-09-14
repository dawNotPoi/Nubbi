import { newNote } from "@/api/note";
import {
  SidebarSectionHeader,
  SidebarTreeState,
} from "@/component/SideBar/components";
import { createNoteAtom, rootNotesAtom } from "@/store/atom/noteAtom";
import { useSession } from "@/utils/auth";
import { routes } from "@/utils/routes";
import { useAtomValue } from "jotai";
import { ListTree, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NoteTree from "./NoteTree";

function NoteTitleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="4 3 16 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        fill="#4ade80"
      />
      <path d="M9 4v16" stroke="#047857" strokeWidth="2" />
      <path
        d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
        stroke="#047857"
        strokeWidth="2"
      />
      <path d="M13 8h2" stroke="#047857" strokeWidth="2" />
      <path d="M13 12h2" stroke="#047857" strokeWidth="2" />
    </svg>
  );
}

export default function NoteMenu() {
  const { data } = useSession();
  const owner = data?.user.id ?? "";
  const {
    data: rootNotes,
    isError,
    isLoading,
    refetch,
  } = useAtomValue(rootNotesAtom(owner));
  const { mutate: createNote } = useAtomValue(createNoteAtom);
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const hasRootNotesData = rootNotes !== undefined;

  const createNoteHandler = () => {
    if (!owner) return;

    const note = newNote();
    createNote(
      { owner, note },
      {
        onSuccess: () => {
          navigate(routes.note(note._id));
        },
      },
    );
  };

  return (
    <section>
      <SidebarSectionHeader
        actions={[
          {
            key: "open-note-library",
            label: "Open note library",
            icon: <ListTree className="size-3.5" />,
            onClick: () => {
              navigate(routes.noteLib);
            },
          },
          {
            key: "new-root-note",
            label: "New note",
            icon: <Plus className="size-3.5" />,
            onClick: createNoteHandler,
          },
        ]}
        onToggle={() => {
          setOpen((value) => !value);
        }}
        open={open}
        title={
          <span className="inline-flex min-w-0 items-center gap-2">
            <span className="inline-flex size-4 shrink-0 items-center justify-center">
              <NoteTitleIcon className="size-5" />
            </span>
            <span className="truncate">小记</span>
          </span>
        }
      />
      {open ? (
        !owner || (isLoading && !hasRootNotesData) ? (
          <SidebarTreeState depth={1} rows={4} type="loading" />
        ) : isError ? (
          <SidebarTreeState
            depth={1}
            message="Unable to load notes"
            onRetry={() => {
              refetch();
            }}
            type="error"
          />
        ) : rootNotes && rootNotes.length > 0 ? (
          <NoteTree owner={owner} notes={rootNotes} />
        ) : (
          <SidebarTreeState
            depth={1}
            message="Use + to create your first note"
            type="empty"
          />
        )
      ) : null}
    </section>
  );
}
