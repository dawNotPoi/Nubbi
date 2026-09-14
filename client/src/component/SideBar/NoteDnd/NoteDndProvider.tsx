import { Note } from "@/api/note";
import { queryClient } from "@/AppProvider";
import { patchNoteAcrossCaches } from "@/features/note/model/cache";
import { collectBlockedMoveTargetIds } from "@/features/note/model/hierarchy";
import { useDeleteNote } from "@/features/note/hooks/useDeleteNote";
import { noteKeys } from "@/features/note/model/keys";
import {
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
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { message } from "antd";
import { useAtomValue, useSetAtom } from "jotai";
import { type PropsWithChildren, useState } from "react";
import { NoteDragPreview } from "./DropZones";
import {
  IDLE_NOTE_DND_STATE,
  NoteDndContext,
  TRASH_DROP_ID,
  type NoteDndState,
  type NoteDragData,
  type NoteDropData,
} from "./model";

export function NoteDndProvider({ children }: PropsWithChildren) {
  const { mutate: updateNoteProperties } = useAtomValue(
    updateNotePropertiesAtom,
  );
  const deleteNote = useDeleteNote();
  const setExpandedNodes = useSetAtom(expandedNodesAtom);
  const [state, setState] = useState<NoteDndState>(IDLE_NOTE_DND_STATE);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const resetState = () => {
    setState(IDLE_NOTE_DND_STATE);
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
