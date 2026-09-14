import type { Note } from "@/api/note";
import { collectBlockedMoveTargetIds } from "@/features/note/model/hierarchy";
import {
  getNoteAncestorIds,
  getNoteCascadeIds,
  getNoteLibraryRows,
  getRecentTargetNotes,
  type NoteLibrarySortMode,
} from "@/features/note/model/library";
import {
  allNotesAtom,
  libraryExpandedNodesAtom,
  recentNoteAtom,
} from "@/store/atom/noteAtom";
import { useSession } from "@/utils/auth";
import { message } from "antd";
import { useAtom, useAtomValue } from "jotai";
import { useMemo, useState } from "react";
import { useMarkdownNoteImport } from "./useMarkdownNoteImport";
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
  const [expandedLibraryNodeIds, setExpandedLibraryNodeIds] = useAtom(
    libraryExpandedNodesAtom,
  );
  const [messageApi, contextHolder] = message.useMessage();

  const { rows: libraryRows, viewMode } = useMemo(
    () =>
      getNoteLibraryRows({
        expandedIds: expandedLibraryNodeIds,
        filterText,
        notes: allNotes,
        sortMode,
      }),
    [allNotes, expandedLibraryNodeIds, filterText, sortMode],
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
    () => libraryRows.map((row) => row.note._id),
    [libraryRows],
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
    allNotes,
    blockedMoveTargetIds,
    messageApi,
    moveCandidates,
    owner,
    refetch,
    setMoveCandidates,
    setMoveOpen,
    setSelectedIds,
  });
  const markdownImport = useMarkdownNoteImport({
    messageApi,
    owner,
    refetch,
  });

  const toggleSelected = (checked: boolean, noteId: string) => {
    const cascadeIds = getNoteCascadeIds([noteId], allNotes);
    const cascadeSet = new Set(cascadeIds);

    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...cascadeIds]));
      }

      return current.filter((id) => !cascadeSet.has(id));
    });
  };

  const toggleAllVisible = (checked: boolean) => {
    const visibleCascadeIds = getNoteCascadeIds(visibleIds, allNotes);
    const visibleSet = new Set(visibleCascadeIds);

    setSelectedIds((current) => {
      if (!checked) return current.filter((id) => !visibleSet.has(id));
      return Array.from(new Set([...current, ...visibleCascadeIds]));
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const toggleLibraryNodeExpanded = (noteId: string) => {
    setExpandedLibraryNodeIds((current) => {
      if (current.includes(noteId)) {
        return current.filter((id) => id !== noteId);
      }

      return [...current, noteId];
    });
  };

  const revealInTree = (noteId: string) => {
    const ancestorIds = getNoteAncestorIds(noteId, allNotes);
    setExpandedLibraryNodeIds((current) =>
      Array.from(new Set([...current, ...ancestorIds])),
    );
    setFilterText("");
    setSearchOpen(false);
  };

  return {
    ...actions,
    ...markdownImport,
    allVisibleSelected,
    blockedMoveTargetIds,
    clearSelection,
    contextHolder,
    emptyDescription,
    filterText,
    libraryRows,
    allNotes,
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
    toggleLibraryNodeExpanded,
    toggleSelected,
    revealInTree,
    visibleIds,
    viewMode,
  };
};
