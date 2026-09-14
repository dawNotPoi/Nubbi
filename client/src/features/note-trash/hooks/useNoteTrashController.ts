import type { Note } from "@/api/note";
import { normalizeNoteTitle } from "@/features/note/model/hierarchy";
import {
  canRestoreTrashNotes,
  getTrashActionNotes,
  getTrashRows,
  type TrashSourceFilter,
} from "@/features/note-trash/model/trash";
import {
  purgeNoteAtom,
  restoreNoteAtom,
  trashNoteAtom,
} from "@/store/atom/noteTrashAtom";
import { Modal, message } from "antd";
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";

type TrashOperation = "restore" | "purge";

export function useNoteTrashController() {
  const trashQuery = useAtomValue(trashNoteAtom);
  const restoreMutation = useAtomValue(restoreNoteAtom);
  const purgeMutation = useAtomValue(purgeNoteAtom);
  const [messageApi, contextHolder] = message.useMessage();
  const [filterText, setFilterText] = useState("");
  const [sourceFilter, setSourceFilter] = useState<TrashSourceFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [operation, setOperation] = useState<TrashOperation | null>(null);
  const notes = useMemo(() => trashQuery.data ?? [], [trashQuery.data]);

  const rows = useMemo(
    () => getTrashRows({ filterText, notes, sourceFilter }),
    [filterText, notes, sourceFilter],
  );
  const visibleIds = useMemo(() => rows.map((row) => row.note._id), [rows]);
  const selectedNotes = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return notes.filter((note) => selectedSet.has(note._id));
  }, [notes, selectedIds]);
  const actionNotes = useMemo(
    () => getTrashActionNotes(notes, selectedIds),
    [notes, selectedIds],
  );
  const restoreBlocked = !canRestoreTrashNotes(actionNotes, notes);
  const visibleSelectedCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const partiallyVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;
  const busy = operation !== null;

  const toggleSelected = (checked: boolean, noteId: string) => {
    setSelectedIds((current) => checked
      ? Array.from(new Set([...current, noteId]))
      : current.filter((id) => id !== noteId));
  };

  const toggleAllVisible = (checked: boolean) => {
    const visibleSet = new Set(visibleIds);
    setSelectedIds((current) => checked
      ? Array.from(new Set([...current, ...visibleIds]))
      : current.filter((id) => !visibleSet.has(id)));
  };

  const runOperation = async (targets: Note[], nextOperation: TrashOperation) => {
    const deduplicated = getTrashActionNotes(notes, targets.map((note) => note._id));
    if (nextOperation === "restore" && !canRestoreTrashNotes(deduplicated, notes)) {
      messageApi.warning("请先选择并恢复仍在回收站中的父级页面");
      return;
    }

    setOperation(nextOperation);
    let successCount = 0;
    let failedCount = 0;
    for (const note of deduplicated) {
      try {
        const mutation = nextOperation === "restore" ? restoreMutation : purgeMutation;
        await mutation.mutateAsync({ noteId: note._id });
        successCount += 1;
      } catch {
        failedCount += 1;
      }
    }
    if (successCount > 0) {
      messageApi.success(nextOperation === "restore"
        ? `已恢复 ${successCount} 个顶层项目`
        : `已永久删除 ${successCount} 个顶层项目`);
    }
    if (failedCount > 0) messageApi.error(`${failedCount} 个项目处理失败，请重试`);
    setSelectedIds([]);
    await trashQuery.refetch();
    setOperation(null);
  };

  const restoreNotes = (targets: Note[]) => runOperation(targets, "restore");
  const confirmPurge = (targets: Note[]) => {
    const deduplicated = getTrashActionNotes(notes, targets.map((note) => note._id));
    const targetDescription = deduplicated.length === 1
      ? `「${normalizeNoteTitle(deduplicated[0].title)}」及其子页面`
      : `${deduplicated.length} 个顶层项目及其子页面`;
    Modal.confirm({
      title: "永久删除后无法恢复",
      content: `将彻底删除${targetDescription}。此操作不可撤销。`,
      okText: "永久删除",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => runOperation(deduplicated, "purge"),
    });
  };

  return {
    actionNotes, allVisibleSelected, busy, clearSelection: () => setSelectedIds([]),
    confirmPurge, contextHolder, filterText, isError: trashQuery.isError,
    isFetching: trashQuery.isFetching, isLoading: trashQuery.isLoading,
    notes, operation, partiallyVisibleSelected, refetch: trashQuery.refetch,
    restoreBlocked, restoreNotes, rows, selectedIds, selectedNotes,
    setFilterText, setSourceFilter, sourceFilter, toggleAllVisible,
    toggleSelected, visibleIds,
  };
}
