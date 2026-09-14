import {
  fileDirectoryQueryKey,
  listFiles,
  type FileBreadcrumb,
  type FileCategory,
  type FileListItem,
} from "@/api/file";
import { useGlobalUpload } from "@/component/upload/hooks/GlobalUpload";
import {
  FILE_PAGE_SIZE,
  type FileSortMode,
  resolveSort,
} from "@/features/file/model";
import { activeUploadCountAtom } from "@/store/atom/FileAtom";
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

const EMPTY_ITEMS: FileListItem[] = [];

export function useFileManagerController() {
  const params = useParams();
  const splat = params["*"] ?? "";
  const parentId = getFolderIdFromSplat(splat);
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearchState] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategoryState] = useState<FileCategory>("all");
  const [sortMode, setSortModeState] = useState<FileSortMode>("updated-desc");
  const [offset, setOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveTargets, setMoveTargets] = useState<FileListItem[]>([]);
  const [previewItem, setPreviewItem] = useState<FileListItem | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
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
    setEditingId(null);
  }, [parentId]);

  const query = useQuery({
    queryKey: [
      ...fileDirectoryQueryKey(parentId),
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
      previousQuery?.queryKey[1] === (parentId ?? "root") ? previous : undefined,
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
  const selectedItems = useMemo(() => {
    const selected = new Set(selectedIds);
    return items.filter((item) => selected.has(item._id));
  }, [items, selectedIds]);

  useEffect(() => {
    if (!data?.breadcrumbs) return;
    const canonicalPath = buildFilePath(toRouteCrumbs(data.breadcrumbs));
    if (location.pathname !== canonicalPath) navigate(canonicalPath, { replace: true });
  }, [data?.breadcrumbs, location.pathname, navigate]);

  const clearSelection = () => setSelectedIds([]);
  const resetQuery = () => {
    setSearchState("");
    setDebouncedQuery("");
    setCategoryState("all");
    setSortModeState("updated-desc");
    setOffset(0);
    clearSelection();
  };
  const actions = useFileManagerActions({
    items,
    messageApi,
    modalApi,
    moveTargets,
    offset,
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

  return {
    ...actions,
    ...access,
    activeUploads,
    breadcrumbs,
    category,
    clearSelection,
    contextHolders: createElement(Fragment, null, messageHolder, modalHolder),
    data,
    editingId,
    items,
    moveOpen,
    moveTargets,
    openItem,
    offset,
    parentId,
    previewItem,
    query,
    search,
    selectedIds,
    selectedItems,
    sortMode,
    uploadOpen,
    navigateBreadcrumb,
    setEditingId,
    setMoveOpen,
    setOffset: changePage,
    setPreviewItem,
    setUploadOpen,
    setCategory: (next: FileCategory) => updateQuery(() => setCategoryState(next)),
    setSearch: (next: string) => updateQuery(() => setSearchState(next)),
    setSortMode: (next: FileSortMode) => updateQuery(() => setSortModeState(next)),
    selectOnly: (id: string) => setSelectedIds([id]),
    toggle: (id: string, checked: boolean) =>
      setSelectedIds((current) => checked
        ? Array.from(new Set([...current, id]))
        : current.filter((item) => item !== id)),
    toggleAll: (checked: boolean) => setSelectedIds(checked ? items.map((item) => item._id) : []),
    upload: (files: File[]) => { createUploadTasks(files, parentId); setUploadOpen(true); },
  };
}
