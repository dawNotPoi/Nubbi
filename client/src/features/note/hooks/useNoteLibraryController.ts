import type { Note } from "@/api/note";
import { collectBlockedMoveTargetIds } from "@/features/note/model/hierarchy";
import {
  filterAndSortLibraryNotes,
  getRecentTargetNotes,
  type NoteLibrarySortMode,
} from "@/features/note/model/library";
import { allNotesAtom, recentNoteAtom } from "@/store/atom/noteAtom";
import { useSession } from "@/utils/auth";
import { message } from "antd";
import { useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { useNoteLibraryActions } from "./useNoteLibraryActions";

export const useNoteLibraryController = () => {
  const { data: session } = useSession();
  const owner = session?.user.id ?? "";
  const {
    data: allNotes = [],
    isError,
    isLoading,
    refetch,
  } = useAtomValue(allNotesAtom(owner));
  const { data: recentNotes = [] } = useAtomValue(recentNoteAtom);
  const [filterText, setFilterText] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sortMode, setSortMode] =
    useState<NoteLibrarySortMode>("updated-desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveCandidates, setMoveCandidates] = useState<Note[]>([]);
  const [messageApi, contextHolder] = message.useMessage();

  const filteredNotes = useMemo(
    () => filterAndSortLibraryNotes(allNotes, filterText, sortMode),
    [allNotes, filterText, sortMode],
  );

  const selectedNotes = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return allNotes.filter((note) => selectedSet.has(note._id));
  }, [allNotes, selectedIds]);

  const moveTargets = useMemo(
    () => getRecentTargetNotes(recentNotes, allNotes),
    [allNotes, recentNotes],
  );

  const blockedMoveTargetIds = useMemo(
    () => collectBlockedMoveTargetIds(moveCandidates, allNotes),
    [allNotes, moveCandidates],
  );

  const visibleIds = useMemo(
    () => filteredNotes.map((note) => note._id),
    [filteredNotes],
  );
  const visibleSelectedCount = visibleIds.filter((id) =>
    selectedIds.includes(id),
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;
  const partiallyVisibleSelected =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleIds.length;
  const emptyDescription = filterText.trim() ? "没有匹配的页面" : "暂无页面";
  const actions = useNoteLibraryActions({
    blockedMoveTargetIds,
    messageApi,
    moveCandidates,
    owner,
    refetch,
    setMoveCandidates,
    setMoveOpen,
    setSelectedIds,
  });

  const toggleSelected = (checked: boolean, noteId: string) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(noteId) ? current : [...current, noteId];
      }

      return current.filter((id) => id !== noteId);
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const visibleSet = new Set(visibleIds);
      if (!checked) return current.filter((id) => !visibleSet.has(id));
      return Array.from(new Set([...current, ...visibleIds]));
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  return {
    ...actions,
    allVisibleSelected,
    blockedMoveTargetIds,
    clearSelection,
    contextHolder,
    emptyDescription,
    filterText,
    filteredNotes,
    isError,
    isLoading,
    moveOpen,
    moveTargets,
    owner,
    partiallyVisibleSelected,
    refetch,
    searchOpen,
    selectedIds,
    selectedNotes,
    setFilterText,
    setSearchOpen,
    setSortMode,
    sortMode,
    toggleAllVisible,
    toggleSelected,
    visibleIds,
  };
};
