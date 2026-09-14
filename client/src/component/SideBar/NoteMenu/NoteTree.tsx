import { Note } from "@/api/note";
import {
  SidebarTreeAction,
  SidebarTreeItem,
  SidebarTreeState,
} from "@/component/SideBar/components";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import {
  deleteSingleNoteAtom,
  expandedNodesAtom,
  noteChildrenAtom,
} from "@/store/atom/noteAtom";
import { useAtom, useAtomValue } from "jotai";
import { Plus, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { WrittingModal } from "./WritingModal";

type NoteTreeProps = {
  notes: Note[];
  owner?: string;
  depth?: number;
};

type NoteTreeNodeProps = {
  note: Note;
  owner?: string;
  depth: number;
};

type NoteChildrenProps = {
  noteId: string;
  owner?: string;
  depth: number;
};

function NoteChildren({ noteId, owner, depth }: NoteChildrenProps) {
  const {
    data: children,
    isError,
    isLoading,
    refetch,
  } = useAtomValue(noteChildrenAtom(noteId));
  const hasChildrenData = children !== undefined;

  if (isLoading && !hasChildrenData) {
    return <SidebarTreeState depth={depth} rows={3} type="loading" />;
  }

  if (isError) {
    return (
      <SidebarTreeState
        depth={depth}
        message="Unable to load child notes"
        onRetry={() => {
          refetch();
        }}
        type="error"
      />
    );
  }

  if (!children || children.length === 0) {
    return (
      <SidebarTreeState
        depth={depth}
        message="No child notes"
        type="empty"
      />
    );
  }

  return <NoteTree depth={depth} owner={owner} notes={children} />;
}

function NoteTreeNode({ note, owner, depth }: NoteTreeNodeProps) {
  const { Id } = useParams();
  const [expandedNodes, setExpandedNodes] = useAtom(expandedNodesAtom);
  const { mutate: deleteNote } = useAtomValue(deleteSingleNoteAtom);
  const open = expandedNodes.includes(note._id);

  const setOpen = (nextOpen: boolean | ((prev: boolean) => boolean)) => {
    setExpandedNodes((prev) => {
      const currentOpen = prev.includes(note._id);
      const resolvedOpen =
        typeof nextOpen === "function" ? nextOpen(currentOpen) : nextOpen;

      if (resolvedOpen) {
        return currentOpen ? prev : [...prev, note._id];
      }

      return prev.filter((id) => id !== note._id);
    });
  };

  const actions: SidebarTreeAction[] = [
    {
      key: "new-child",
      label: "New child note",
      icon: <Plus className="size-3.5" />,
      render: (className) => (
        <WrittingModal
          owner={owner}
          parent={note}
          onTrigger={() => {
            setOpen(true);
          }}
          trigger={
            <button
              aria-label="New child note"
              className={className}
              title="New child note"
              type="button"
            >
              <Plus className="size-3.5" />
            </button>
          }
        />
      ),
    },
    {
      key: "delete",
      label: "Delete note",
      icon: <Trash2 className="size-3.5" />,
      danger: true,
      onClick: () => {
        deleteNote({
          owner,
          parentId: note.parentId,
          noteId: note._id,
        });
      },
    },
  ];

  return (
    <>
      <SidebarTreeItem
        actions={actions}
        active={note._id === Id}
        depth={depth}
        expanded={open}
        onToggle={() => {
          setOpen((value) => !value);
        }}
        title={normalizeNoteTitle(note.title)}
        to={`/note/${note._id}`}
      />
      {open ? (
        <NoteChildren depth={depth + 1} owner={owner} noteId={note._id} />
      ) : null}
    </>
  );
}

export default function NoteTree({ notes, owner, depth = 1 }: NoteTreeProps) {
  return (
    <div>
      {notes.map((note) => (
        <NoteTreeNode depth={depth} key={note._id} owner={owner} note={note} />
      ))}
    </div>
  );
}
