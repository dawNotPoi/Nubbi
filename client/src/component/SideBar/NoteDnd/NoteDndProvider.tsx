import { type Note } from "@/api/note";
import { collectBlockedMoveTargetIds } from "@/features/note/model/hierarchy";
import { useDeleteNote } from "@/features/note/hooks/useDeleteNote";
import {
  isAccountScopeCurrent,
  requireAccountScope,
  requireOwnerId,
} from "@/features/auth/model/account-scope";
import { useAuth } from "@/hooks/useAuth";
import { noteKeys } from "@/features/note/model/keys";
import { expandedNodesAtom } from "@/store/atom/note/noteAtom";
import { updateNotePropertiesAtom } from "@/store/atom/note/noteMutationAtom";
import {
  CollisionDetection,
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
import { useQueryClient } from "@tanstack/react-query";
import { toast as message } from "@/components/ui/toast";
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

const detectDropTarget: CollisionDetection = (args) => {
  const collisions = pointerWithin(args);
  const trashCollision = collisions.find(({ id }) => id === TRASH_DROP_ID);
  return trashCollision ? [trashCollision] : collisions;
};

/**
 * 侧边栏笔记拖拽的全局 Provider：为笔记树和回收站提供统一的 DnD 上下文。
 * - 包裹 dnd-kit 的 DndContext，用 pointerWithin 做碰撞检测，拖动距离超 8px 触发；
 * - 拖拽开始时从缓存收集禁用移动的目标（不能移到自身或其子级）；
 * - 拖拽结束时处理三种结果：移入回收站、移动到目标父级（含展开目标节点）、取消。
 */
export function NoteDndProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const ownerId = requireOwnerId(user?.id);
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

    const loadedNotes = queryClient
      .getQueriesData<Note[]>({ queryKey: noteKeys.treeRoot(ownerId) })
      .flatMap(([, notes]) => notes ?? []);
    setState({
      activeNote: dragData.note,
      blockedIds: collectBlockedMoveTargetIds([dragData.note], loadedNotes),
    });
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const dragData = active.data.current as NoteDragData | undefined;
    const { blockedIds } = state;
    resetState();
    if (dragData?.type !== "note" || !over) return;

    const scope = requireAccountScope();
    const note = dragData.note;
    const currentParentId = note.parentId ?? null;

    if (over.id === TRASH_DROP_ID) {
      deleteNote(
        { noteId: note._id, parentId: currentParentId },
        {
          onSuccess: () => {
            if (!isAccountScopeCurrent(scope)) return;
            message.success("已移入回收站");
          },
          onError: () => {
            if (!isAccountScopeCurrent(scope)) return;
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
          if (!isAccountScopeCurrent(scope)) return;
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
        collisionDetection={detectDropTarget}
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
