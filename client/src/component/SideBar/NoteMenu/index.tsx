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
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M4 16L14.5 5.5l4 4L8 20H4v-4Z"
        fill="#2563eb"
        stroke="#1e3a8a"
        strokeWidth="1.15"
      />
      <path
        d="M14.5 5.5l1-1a2.828 2.828 0 1 1 4 4l-1 1-4-4Z"
        fill="#fb923c"
        stroke="#9a3412"
        strokeWidth="1.15"
      />
      <path
        d="M4 16v4h4l-4-4Z"
        fill="#fff7e6"
        stroke="#1e3a8a"
        strokeWidth="1.15"
      />
      <path d="M13.5 6.5l4 4" stroke="#dbeafe" strokeWidth="1.15" />
      <path
        d="M17.8 20.817l-2.172 1.138a.392.392 0 0 1-.568-.41l.415-2.411l-1.757-1.707a.389.389 0 0 1 .217-.665l2.428-.352l1.086-2.193a.392.392 0 0 1 .702 0l1.086 2.193l2.428.352a.39.39 0 0 1 .217.665l-1.757 1.707l.414 2.41a.39.39 0 0 1-.567.411z"
        fill="#facc15"
        stroke="#b7791f"
        strokeWidth="0.95"
      />
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
