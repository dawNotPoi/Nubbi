import { Note } from "@/api/note";
import { queryClient } from "@/AppProvider";
import { patchNoteAcrossCaches } from "@/features/note/model/cache";
import {
  collectBlockedMoveTargetIds,
  normalizeNoteTitle,
} from "@/features/note/model/hierarchy";
import { noteKeys } from "@/features/note/model/keys";
import {
  deleteSingleNoteAtom,
  expandedNodesAtom,
  updateNotePropertiesAtom,
} from "@/store/atom/noteAtom";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { message } from "antd";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { FileText } from "lucide-react";
import { createContext, PropsWithChildren, useContext, useState } from "react";

export const TRASH_DROP_ID = "note-dnd:trash";
export const ROOT_HEADER_DROP_ID = "note-dnd:root-header";
export const ROOT_FOOTER_DROP_ID = "note-dnd:root-footer";

export const noteDragId = (noteId: string) => `note-dnd:drag:${noteId}`;
export const noteDropId = (noteId: string) => `note-dnd:note:${noteId}`;

export type NoteDragData = { type: "note"; note: Note };
export type NoteDropData =
  | { type: "note"; note: Note }
  | { type: "root" }
  | { type: "trash" };

type NoteDndState = {
  activeNote: Note | null;
  blockedIds: Set<string>;
};

const IDLE_STATE: NoteDndState = {
  activeNote: null,
  blockedIds: new Set<string>(),
};

const NoteDndContext = createContext<NoteDndState>(IDLE_STATE);

export const useNoteDndState = () => useContext(NoteDndContext);

function NoteDragPreview({ note }: { note: Note }) {
  return (
    <div className="flex max-w-56 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 text-[13px] text-neutral-700 shadow-md">
      <FileText className="size-4 shrink-0 text-neutral-400" />
      <span className="truncate">{normalizeNoteTitle(note.title)}</span>
    </div>
  );
}

export function RootHeaderDropZone({ children }: PropsWithChildren) {
  const { activeNote } = useNoteDndState();
  const { isOver, setNodeRef } = useDroppable({
    id: ROOT_HEADER_DROP_ID,
    data: { type: "root" } satisfies NoteDropData,
    disabled: !activeNote,
  });
  const canDropToRoot = Boolean(activeNote && activeNote.parentId != null);

  return (
    <div
      className={clsx(
        "rounded-md",
        isOver && canDropToRoot && "bg-blue-50 ring-1 ring-inset ring-blue-300",
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}

export function RootDropIndicator() {
  const { activeNote } = useNoteDndState();
  const { isOver, setNodeRef } = useDroppable({
    id: ROOT_FOOTER_DROP_ID,
    data: { type: "root" } satisfies NoteDropData,
    disabled: !activeNote,
  });

  if (!activeNote || activeNote.parentId == null) return null;

  return (
    <div
      className={clsx(
        "mt-1 rounded-md border border-dashed border-neutral-300 px-2 py-1.5 text-center text-[12px] text-neutral-400",
        isOver && "border-blue-400 bg-blue-50 text-blue-600",
      )}
      ref={setNodeRef}
    >
      拖到此处移至根级
    </div>
  );
}

export function TrashDropTarget({ children }: PropsWithChildren) {
  const { activeNote } = useNoteDndState();
  const { isOver, setNodeRef } = useDroppable({
    id: TRASH_DROP_ID,
    data: { type: "trash" } satisfies NoteDropData,
    disabled: !activeNote,
  });

  return (
    <div
      className={clsx(
        "rounded-md",
        isOver && "bg-red-50 text-red-600 ring-1 ring-inset ring-red-200",
      )}
      ref={setNodeRef}
    >
      {children}
    </div>
  );
}

export function NoteDndProvider({ children }: PropsWithChildren) {
  const { mutate: updateNoteProperties } = useAtomValue(
    updateNotePropertiesAtom,
  );
  const { mutate: deleteNote } = useAtomValue(deleteSingleNoteAtom);
  const setExpandedNodes = useSetAtom(expandedNodesAtom);
  const [state, setState] = useState<NoteDndState>(IDLE_STATE);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const resetState = () => {
    setState(IDLE_STATE);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const dragData = active.data.current as NoteDragData | undefined;
    if (dragData?.type !== "note") return;

    const cachedNotes = queryClient
      .getQueriesData<Note[]>({ queryKey: noteKeys.lists })
      .flatMap(([, notes]) => notes ?? []);
    setState({
      activeNote: dragData.note,
      blockedIds: collectBlockedMoveTargetIds([dragData.note], cachedNotes),
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const dragData = active.data.current as NoteDragData | undefined;
    const { blockedIds } = state;
    resetState();
    if (dragData?.type !== "note" || !over) return;

    const note = dragData.note;
    const currentParentId = note.parentId ?? null;

    if (over.id === TRASH_DROP_ID) {
      deleteNote(
        { noteId: note._id, parentId: currentParentId },
        {
          onSuccess: () => {
            message.success("已移入回收站");
          },
          onError: () => {
            message.error("删除失败，请稍后重试");
          },
        },
      );
      return;
    }

    const dropData = over.data.current as NoteDropData | undefined;
    if (!dropData) return;
    const targetParentId = dropData.type === "note" ? dropData.note._id : null;

    if (targetParentId === currentParentId) return;
    if (targetParentId && blockedIds.has(targetParentId)) {
      message.warning("不能移动到自身或其子级");
      return;
    }

    if (targetParentId) {
      patchNoteAcrossCaches(queryClient, targetParentId, { hasChildren: true });
      setExpandedNodes((prev) =>
        prev.includes(targetParentId) ? prev : [...prev, targetParentId],
      );
    }
    updateNoteProperties(
      {
        noteId: note._id,
        parentId: currentParentId,
        properties: { parentId: targetParentId },
      },
      {
        onError: (error) => {
          message.error(
            error instanceof Error ? error.message : "移动失败，请稍后重试",
          );
        },
      },
    );
  };

  return (
    <NoteDndContext.Provider value={state}>
      <DndContext
        collisionDetection={pointerWithin}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragCancel={resetState}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        {children}
        <DragOverlay dropAnimation={null}>
          {state.activeNote ? (
            <NoteDragPreview note={state.activeNote} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </NoteDndContext.Provider>
  );
}
