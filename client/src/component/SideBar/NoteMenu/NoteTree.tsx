import { Note } from "@/api/note";
import {
  SidebarTreeAction,
  SidebarTreeItem,
  SidebarTreeState,
} from "@/component/SideBar/components";
import { useDeleteNote } from "@/features/note/hooks/useDeleteNote";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import {
  expandedNodesAtom,
  noteChildrenAtom,
} from "@/store/atom/noteAtom";
import { useDraggable } from "@dnd-kit/core";
import clsx from "clsx";
import { useAtom, useAtomValue } from "jotai";
import { Plus, Trash2 } from "lucide-react";
import { useParams } from "react-router-dom";
import { type NoteDragData, noteDragId } from "../NoteDnd/model";
import { useNoteDropTarget } from "../NoteDnd/useNoteDropTarget";
import { WrittingModal } from "./WritingModal";

type NoteTreeProps = {
  notes: Note[];
  depth?: number;
};

type NoteTreeNodeProps = {
  note: Note;
  depth: number;
};

type NoteChildrenProps = {
  noteId: string;
  depth: number;
};

function NoteChildren({ noteId, depth }: NoteChildrenProps) {
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

  return <NoteTree depth={depth} notes={children} />;
}

function NoteTreeNode({ note, depth }: NoteTreeNodeProps) {
  const { Id } = useParams();
  const [expandedNodes, setExpandedNodes] = useAtom(expandedNodesAtom);
  const deleteNote = useDeleteNote();
  const open = expandedNodes.includes(note._id);

  const {
    isDragging,
    listeners,
    setNodeRef: setDragRef,
  } = useDraggable({
    id: noteDragId(note._id),
    data: { type: "note", note } satisfies NoteDragData,
  });

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

  const { dropClassName, setNodeRef: setDropRef } = useNoteDropTarget(note, {
    expanded: open,
    onExpand: () => {
      setOpen(true);
    },
  });

  const actions: SidebarTreeAction[] = [
    {
      key: "new-child",
      label: "New child note",
      icon: <Plus className="size-3.5" />,
      render: (className) => (
        <WrittingModal
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
          parentId: note.parentId,
          noteId: note._id,
        });
      },
    },
  ];

  return (
    <>
      <div
        className={clsx(isDragging && "opacity-40")}
        ref={(element) => {
          setDragRef(element);
          setDropRef(element);
        }}
        {...listeners}
      >
        <SidebarTreeItem
          actions={actions}
          active={note._id === Id}
          className={dropClassName}
          depth={depth}
          expanded={open}
          hasChildren={note.hasChildren}
          onToggle={() => {
            setOpen((value) => !value);
          }}
          title={normalizeNoteTitle(note.title)}
          to={`/note/${note._id}`}
        />
      </div>
      {open && note.hasChildren ? (
        <NoteChildren depth={depth + 1} noteId={note._id} />
      ) : null}
    </>
  );
}

export default function NoteTree({ notes, depth = 1 }: NoteTreeProps) {
  return (
    <div>
      {notes.map((note) => (
        <NoteTreeNode depth={depth} key={note._id} note={note} />
      ))}
    </div>
  );
}
