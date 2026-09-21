import { newNote } from "@/api/note";
import {
  SidebarSectionHeader,
  SidebarTreeState,
} from "@/component/SideBar/components";
import { useNoteTreeQuery } from "@/features/note/hooks/useNoteTreeQuery";
import {
  isAccountScopeCurrent,
  requireAccountScope,
} from "@/features/auth/model/account-scope";
import { createNoteAtom } from "@/store/atom/note/noteMutationAtom";
import { useSession } from "@/utils/auth";
import { routes } from "@/utils/routes";
import { useAtomValue } from "jotai";
import { ListTree, NotebookPen, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RootDropIndicator,
  RootHeaderDropZone,
  TrashDropTarget,
} from "../NoteDnd/DropZones";
import NoteTree from "./NoteTree";

export default function NoteMenu() {
  const { data } = useSession();
  const owner = data?.user.id ?? "";
  const {
    data: rootNotes,
    isError,
    isLoading,
    refetch,
  } = useNoteTreeQuery(owner, null, { enabled: Boolean(owner) });
  const { mutate: createNote } = useAtomValue(createNoteAtom);
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const hasRootNotesData = rootNotes !== undefined;
  const trashIcon = <Trash2 className="size-[14px]" />;

  const createNoteHandler = () => {
    if (!owner) return;

    const scope = requireAccountScope();
    const note = newNote();
    createNote(
      { note },
      {
        onSuccess: () => {
          if (!isAccountScopeCurrent(scope)) return;
          navigate(routes.note(note._id));
        },
      },
    );
  };

  return (
    <section>
      <RootHeaderDropZone>
        <SidebarSectionHeader
          actions={[
            {
              key: "open-note-library",
              label: "Open note library",
              icon: <ListTree className="size-[14px]" />,
              onClick: () => {
                navigate(routes.noteLib);
              },
            },
            {
              key: "open-note-trash",
              label: "回收站",
              icon: trashIcon,
              danger: true,
              render: (className) => (
                <TrashDropTarget className="flex size-6 shrink-0">
                  <button
                    aria-label="回收站"
                    className={className}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      navigate(routes.noteTrash);
                    }}
                    title="回收站"
                    type="button"
                  >
                    {trashIcon}
                  </button>
                </TrashDropTarget>
              ),
            },
            {
              key: "new-root-note",
              label: "New note",
              icon: <Plus className="size-[14px]" />,
              onClick: createNoteHandler,
            },
          ]}
          onToggle={() => {
            setOpen((value) => !value);
          }}
          open={open}
          title={
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="inline-grid size-5 shrink-0 place-items-center text-text-subtle">
                <NotebookPen className="size-4" strokeWidth={1.9} />
              </span>
              <span className="truncate">小记</span>
            </span>
          }
        />
      </RootHeaderDropZone>
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
          <>
            <NoteTree notes={rootNotes} ownerId={owner} />
            <RootDropIndicator />
          </>
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
