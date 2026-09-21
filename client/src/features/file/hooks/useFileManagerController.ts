import {
  fetchFileStats,
  fileDirectoryQueryKey,
  fileStatsQueryKey,
  listFiles,
  type FileBreadcrumb,
  type FileCategory,
  type FileListItem,
} from "@/api/file";
import { useGlobalUpload } from "@/component/upload/hooks/GlobalUpload";
import {
  FILE_PAGE_SIZE,
  resolveSort,
  type FileSelectModifiers,
  type FileSortMode,
} from "@/features/file/model";
import {
  readFilePreferences,
  writeFilePreferences,
} from "@/features/file/preferences";
import { activeUploadCountAtom } from "@/store/atom/FileAtom";
import { isArchivePreviewBlocked } from "@/views/file-manage/components/filePreviewUtils";
import {
  buildFilePath,
  getFolderIdFromSplat,
  parseSplatToCrumbs,
  toRouteCrumbs,
} from "@/views/file-manage/routePath";
import { useQuery } from "@tanstack/react-query";
import { Modal, message } from "antd";
import { useAtomValue } from "jotai";
import { createElement, Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useFileAccessActions } from "./useFileAccessActions";
import { useFileManagerActions } from "./useFileManagerActions";
import { useAuth } from "@/hooks/useAuth";
import { requireOwnerId } from "@/features/auth/model/account-scope";

const EMPTY_ITEMS: FileListItem[] = [];

export function useFileManagerController() {
  const { user } = useAuth();
  const ownerId = requireOwnerId(user?.id);
  const params = useParams();
  const splat = params["*"] ?? "";
  const parentId = getFolderIdFromSplat(splat);
  const navigate = useNavigate();
  const location = useLocation();
  const [preferences] = useState(readFilePreferences);
  const [search, setSearchState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategoryState] = useState<FileCategory>(
    preferences?.category ?? "all",
  );
  const [sortMode, setSortModeState] = useState<FileSortMode>(
    preferences?.sortMode ?? "updated-desc",
  );
  const [offset, setOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargets, setMoveTargets] = useState<FileListItem[]>([]);
  const [previewItem, setPreviewItem] = useState<FileListItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draggingItems, setDraggingItems] = useState<FileListItem[] | null>(null);
  const [messageApi, messageHolder] = message.useMessage();
  const [modalApi, modalHolder] = Modal.useModal();
  const activeUploads = useAtomValue(activeUploadCountAtom);
  const { createUploadTasks } = useGlobalUpload();
  const sort = resolveSort(sortMode);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(search.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setOffset(0);
    setSelectedIds([]);
    setAnchorId(null);
    setEditingId(null);
  }, [parentId]);

  const query = useQuery({
    queryKey: [
      ...fileDirectoryQueryKey(ownerId, parentId),
      { limit: FILE_PAGE_SIZE, offset, query: debouncedQuery, category, ...sort },
    ],
    queryFn: () =>
      listFiles({
        parentId,
        limit: FILE_PAGE_SIZE,
        offset,
        query: debouncedQuery || undefined,
        category,
        ...sort,
      }),
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[3] === (parentId ?? "root") ? previous : undefined,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const statsQuery = useQuery({
    queryKey: fileStatsQueryKey(ownerId),
    queryFn: fetchFileStats,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const data = query.data?.data;
  const items = data?.items ?? EMPTY_ITEMS;
  const fallbackBreadcrumbs: FileBreadcrumb[] = [
    { _id: null, name: "全部文件" },
    ...parseSplatToCrumbs(splat).map((item) => ({ _id: item.id, name: item.name })),
  ];
  const breadcrumbs = data?.breadcrumbs?.length
    ? data.breadcrumbs
    : fallbackBreadcrumbs;
  const currentFolderName = breadcrumbs.at(-1)?.name ?? "全部文件";
  const selectedItems = useMemo(() => {
    const selected = new Set(selectedIds);
    return items.filter((item) => selected.has(item._id));
  }, [items, selectedIds]);
  const previewableItems = useMemo(
    () =>
      items.filter(
        (item): item is Extract<FileListItem, { kind: "file" }> =>
          item.kind === "file" && !isArchivePreviewBlocked(item),
      ),
    [items],
  );
  const previewIndex = previewItem
    ? previewableItems.findIndex((item) => item._id === previewItem._id)
    : -1;
  const previewPosition =
    previewIndex >= 0
      ? { index: previewIndex, total: previewableItems.length }
      : undefined;

  useEffect(() => {
    if (!data?.breadcrumbs) return;
    const canonicalPath = buildFilePath(toRouteCrumbs(data.breadcrumbs));
    if (location.pathname !== canonicalPath) navigate(canonicalPath, { replace: true });
  }, [data?.breadcrumbs, location.pathname, navigate]);

  const clearSelection = () => {
    setSelectedIds([]);
    setAnchorId(null);
  };
  const resetQuery = () => {
    setSearchState("");
    setDebouncedQuery("");
    setCategoryState("all");
    setSortModeState("updated-desc");
    setOffset(0);
    clearSelection();
    writeFilePreferences({ category: "all", sortMode: "updated-desc" });
  };
  const actions = useFileManagerActions({
    items,
    messageApi,
    modalApi,
    moveTargets,
    offset,
    ownerId,
    parentId,
    selectedItems,
    setEditingId,
    setMoveOpen,
    setMoveTargets,
    setOffset,
    setSelectedIds,
    resetForCreate: resetQuery,
  });
  const access = useFileAccessActions({ messageApi, setPreviewItem });

  const openItem = (item: FileListItem) => {
    if (item.kind === "file") return access.preview(item);
    navigate(buildFilePath([...toRouteCrumbs(breadcrumbs), { id: item._id, name: item.name }]));
  };
  const navigateBreadcrumb = (_item: FileBreadcrumb, index: number) =>
    navigate(buildFilePath(toRouteCrumbs(breadcrumbs.slice(0, index + 1))));
  const updateQuery = (update: () => void) => {
    update();
    setOffset(0);
    clearSelection();
    setEditingId(null);
  };
  const changePage = (nextOffset: number) => {
    setOffset(nextOffset);
    clearSelection();
    setEditingId(null);
  };

  /**
   * 处理行点击选择：Shift 连续选择、Ctrl/Cmd 切换选择、普通点击单选。
   * @param id 被点击的行 ID。
   * @param modifiers 事件携带的修饰键状态。
   * @returns 无返回值。
   */
  const select = (id: string, modifiers: FileSelectModifiers = {}) => {
    const index = items.findIndex((item) => item._id === id);
    if (index < 0) return;
    const anchorIndex = anchorId
      ? items.findIndex((item) => item._id === anchorId)
      : -1;

    if (modifiers.shiftKey && anchorIndex >= 0) {
      const start = Math.min(anchorIndex, index);
      const end = Math.max(anchorIndex, index);
      const range = items.slice(start, end + 1).map((item) => item._id);
      setSelectedIds((current) =>
        modifiers.toggleKey
          ? Array.from(new Set([...current, ...range]))
          : range,
      );
      return;
    }
    if (modifiers.toggleKey) {
      setSelectedIds((current) =>
        current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id],
      );
    } else {
      setSelectedIds([id]);
    }
    setAnchorId(id);
  };

  /**
   * 把文件上传到指定目录并打开上传面板。
   * @param files 待上传文件列表。
   * @param folderId 目标目录 ID，null 表示根目录。
   * @param folderName 目标目录名称，用于上传面板展示。
   * @returns 无返回值。
   */
  const uploadTo = (
    files: File[],
    folderId: string | null,
    folderName?: string,
  ) => {
    if (files.length === 0) return;
    createUploadTasks(files, folderId ?? undefined, folderName);
    setUploadOpen(true);
  };

  /**
   * 把当前拖拽的行移动到目标目录，拖拽状态在调用后清空。
   * @param targetFolderId 目标目录 ID，null 表示根目录。
   * @returns 移动完成的 Promise。
   */
  const dropItemsOnFolder = async (targetFolderId: string | null) => {
    const targets = draggingItems;
    setDraggingItems(null);
    if (!targets || targets.length === 0) return;
    if (targets.some((item) => item._id === targetFolderId)) return;
    await actions.moveItems(targets, targetFolderId);
  };

  const previewPrev = () => {
    if (previewIndex > 0) setPreviewItem(previewableItems[previewIndex - 1]);
  };
  const previewNext = () => {
    if (previewIndex >= 0 && previewIndex < previewableItems.length - 1) {
      setPreviewItem(previewableItems[previewIndex + 1]);
    }
  };

  return {
    ...actions,
    ...access,
    activeUploads,
    breadcrumbs,
    category,
    clearSelection,
    contextHolders: createElement(Fragment, null, messageHolder, modalHolder),
    currentFolderName,
    data,
    draggingItems,
    editingId,
    items,
    moveOpen,
    moveTargets,
    openItem,
    offset,
    parentId,
    previewItem,
    previewPosition,
    query,
    search,
    selectedIds,
    selectedItems,
    sortMode,
    stats: statsQuery.data,
    uploadOpen,
    navigateBreadcrumb,
    setEditingId,
    setMoveOpen,
    setOffset: changePage,
    setPreviewItem,
    setUploadOpen,
    setCategory: (next: FileCategory) => {
      writeFilePreferences({ category: next });
      updateQuery(() => setCategoryState(next));
    },
    setSearch: (next: string) => updateQuery(() => setSearchState(next)),
    setSortMode: (next: FileSortMode) => {
      writeFilePreferences({ sortMode: next });
      updateQuery(() => setSortModeState(next));
    },
    select,
    startItemDrag: (targets: FileListItem[]) => setDraggingItems(targets),
    endItemDrag: () => setDraggingItems(null),
    dropItemsOnFolder,
    uploadTo,
    previewPrev,
    previewNext,
    toggle: (id: string, checked: boolean) => {
      setAnchorId(id);
      setSelectedIds((current) =>
        checked
          ? Array.from(new Set([...current, id]))
          : current.filter((item) => item !== id),
      );
    },
    toggleAll: (checked: boolean) => {
      setAnchorId(null);
      setSelectedIds(checked ? items.map((item) => item._id) : []);
    },
    upload: (files: File[]) => uploadTo(files, parentId ?? null, currentFolderName),
  };
}
