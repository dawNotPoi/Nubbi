import {
  deleteFile,
  deleteTargetsBatch,
  fetchFileDownloadBlob,
  fetchFileShareDownloadUrl,
  getAllFolders,
  listFiles,
  moveFileItem,
  renameFile,
  type FolderRecord,
} from "@/api/file";
import { Header } from "@/component/Header";
import { useGlobalUpload } from "@/component/upload/hooks/GlobalUpload";
import UploadListWrapper from "@/component/upload/UploadListWrapper";
import {
  breadcrumbsAtom,
  createFloderMutationAtom,
  currentFolderIdAtom,
  listFilesAtom,
} from "@/store/atom/FileAtom";
import { UploadOutlined } from "@ant-design/icons";
import { Button, Empty, Modal, Spin, Tree, message } from "antd";
import type { DataNode } from "antd/es/tree";
import { useAtomValue, useSetAtom } from "jotai";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FileListTable from "./components/FileListTable";
import type { FileTableRow } from "./components/FileListTable/fileIcons";
import FilePreviewModal from "./components/FilePreviewModal";
import { isArchivePreviewBlocked } from "./components/filePreviewUtils";
import FolderBreadcrumbs from "./components/FolderBreadcrumbs";
import { buildFilePath, isSameCrumbs, type CrumbItem } from "./routePath";

type FolderTreeNode = DataNode & {
  key: string;
  title: string;
  children?: FolderTreeNode[];
  isTargetDisabled?: boolean;
  selectable?: boolean;
};

const DEFAULT_FOLDER_NAME = "未命名文件夹";

const getActionErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

const saveBlobAsFile = (blob: Blob, fileName: string) => {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

const buildDescendantSet = (folders: FolderRecord[], rootId: string) => {
  const childrenMap = new Map<string, string[]>();

  folders.forEach((folder) => {
    const parentKey = folder.parentId ? String(folder.parentId) : "";
    const currentChildren = childrenMap.get(parentKey) ?? [];
    currentChildren.push(String(folder._id));
    childrenMap.set(parentKey, currentChildren);
  });

  const descendants = new Set<string>();
  const queue = [rootId];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) ?? [];

    children.forEach((childId) => {
      if (descendants.has(childId)) return;
      descendants.add(childId);
      queue.push(childId);
    });
  }

  return descendants;
};

const buildFolderTree = (
  folders: FolderRecord[],
  disabledIds: Set<string>,
): FolderTreeNode[] => {
  const nodeMap = new Map<string, FolderTreeNode>();
  const roots: FolderTreeNode[] = [];

  folders.forEach((folder) => {
    const id = String(folder._id);

    nodeMap.set(id, {
      key: id,
      title: folder.name || DEFAULT_FOLDER_NAME,
      isTargetDisabled: disabledIds.has(id),
      selectable: !disabledIds.has(id),
      children: [],
    });
  });

  folders.forEach((folder) => {
    const currentNode = nodeMap.get(String(folder._id));
    if (!currentNode) return;

    const parentId = folder.parentId ? String(folder.parentId) : "";
    if (!parentId) {
      roots.push(currentNode);
      return;
    }

    const parentNode = nodeMap.get(parentId);
    if (!parentNode) {
      roots.push(currentNode);
      return;
    }

    parentNode.children = [...(parentNode.children ?? []), currentNode];
  });

  return roots;
};

const FileManager = () => {
  const [open, setOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [folderTreeList, setFolderTreeList] = useState<FolderRecord[]>([]);
  const [movingRecord, setMovingRecord] = useState<FileTableRow | null>(null);
  const [selectedMoveTargetId, setSelectedMoveTargetId] = useState<string>();
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [previewRecord, setPreviewRecord] = useState<FileTableRow | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<FileTableRow[]>([]);
  const navigate = useNavigate();
  const folderId = useAtomValue(currentFolderIdAtom);
  const crumbs = useAtomValue(breadcrumbsAtom);
  const setCrumbs = useSetAtom(breadcrumbsAtom);
  const { data: files, refetch, isFetching } = useAtomValue(listFilesAtom);
  const { mutate: createFolderMutation, isPending: creatingFolder } =
    useAtomValue(createFloderMutationAtom);

  const { createUploadTask } = useGlobalUpload();
  const [messageApi, contextHolder] = message.useMessage();

  const closeMoveModal = () => {
    setMoveOpen(false);
    setMovingRecord(null);
    setSelectedMoveTargetId(undefined);
    setExpandedKeys([]);
  };

  const handleCreateFolder = () => {
    createFolderMutation(
      { parentId: folderId },
      {
        onError: (error) => {
          messageApi.error(getActionErrorMessage(error, "新建文件夹失败"));
        },
        onSuccess: (response) => {
          if (response.code !== 1) {
            messageApi.error(response.message || "新建文件夹失败");
          }
        },
      },
    );
  };

  const handleOpenFolder = (folder: { _id?: string; name?: string }) => {
    if (!folder?._id) return;

    const nextCrumbs = [
      ...crumbs,
      {
        id: String(folder._id),
        name: folder.name ?? DEFAULT_FOLDER_NAME,
      },
    ];

    setCrumbs(nextCrumbs);
    navigate(buildFilePath(nextCrumbs));
  };

  const handleDownload = async (record: FileTableRow) => {
    if (record.kind !== "file") return;

    try {
      const { blob } = await fetchFileDownloadBlob(record._id);
      saveBlobAsFile(blob, record.name || "download");
    } catch (error) {
      messageApi.error(getActionErrorMessage(error, "文件下载失败"));
    }
  };

  const handlePreview = (record: FileTableRow) => {
    if (record.kind !== "file") return;

    if (isArchivePreviewBlocked(record)) {
      messageApi.warning("压缩包暂不支持在线解压预览");
      return;
    }

    setPreviewRecord(record);
  };

  const handleShare = async (record: FileTableRow) => {
    if (record.kind !== "file") return;

    try {
      const { url } = await fetchFileShareDownloadUrl(record._id);
      await navigator.clipboard.writeText(url);
      messageApi.success("已复制公开下载链接，7 天内有效");
    } catch (error) {
      messageApi.error(getActionErrorMessage(error, "分享链接生成失败"));
    }
  };

  const handleRename = async (record: FileTableRow, nextName: string) => {
    const trimmedName = nextName.trim();

    if (!trimmedName) {
      messageApi.warning("请输入名称");
      return false;
    }

    if (trimmedName === record.name) {
      return true;
    }

    try {
      const res = await renameFile(record._id, trimmedName, record.kind);
      if (res.code === 1) {
        messageApi.success("重命名成功");
        await refetch();
        return true;
      }

      messageApi.error(res.message);
      return false;
    } catch {
      messageApi.error("重命名失败，请稍后重试");
      return false;
    }
  };

  const handleDelete = (record: FileTableRow) => {
    const isFolder = record.kind === "folder";

    Modal.confirm({
      title: isFolder ? "删除文件夹" : "删除文件",
      content: isFolder
        ? "将递归删除该文件夹下的所有子文件夹和文件，删除后不可恢复，确认继续吗？"
        : "删除后不可恢复，确认继续吗？",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await deleteFile(record._id, record.kind);
          if (res.code === 1) {
            messageApi.success("删除成功");
            await refetch();
            return;
          }

          messageApi.error(res.message || "删除失败");
        } catch {
          messageApi.error("删除失败，请稍后重试");
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedRows.length === 0) return;

    const selectedFolderCount = selectedRows.filter(
      (item) => item.kind === "folder",
    ).length;
    const selectedFileCount = selectedRows.length - selectedFolderCount;

    Modal.confirm({
      title: `删除选中的 ${selectedRows.length} 项`,
      content:
        selectedFolderCount > 0
          ? `其中包含 ${selectedFolderCount} 个文件夹和 ${selectedFileCount} 个文件，文件夹会递归删除其下所有内容，删除后不可恢复，确认继续吗？`
          : "删除后不可恢复，确认继续吗？",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          const res = await deleteTargetsBatch(
            selectedRows.map((record) => ({
              id: record._id,
              kind: record.kind,
            })),
          );

          if (res.code === 1) {
            const {
              deletedFileCount,
              deletedFolderCount,
              missingFileIds,
              missingFolderIds,
            } = res.data;
            const deletedSummary = [
              deletedFolderCount > 0 ? `${deletedFolderCount} 个文件夹` : "",
              deletedFileCount > 0 ? `${deletedFileCount} 个文件` : "",
            ]
              .filter(Boolean)
              .join("、");
            const missingCount =
              missingFileIds.length + missingFolderIds.length;

            if (missingCount === 0) {
              messageApi.success(`已删除 ${deletedSummary}`);
            } else {
              messageApi.warning(
                `已删除 ${deletedSummary}，${missingCount} 项不存在或无权操作`,
              );
            }

            setSelectedRowKeys([]);
            setSelectedRows([]);
            await refetch();
            return;
          }

          messageApi.error(res.message || "批量删除失败");
        } catch {
          messageApi.error("批量删除失败，请稍后重试");
        }
      },
    });
  };

  const handleOpenMove = async (record: FileTableRow) => {
    setMovingRecord(record);
    setSelectedMoveTargetId(undefined);
    setExpandedKeys([]);
    setMoveOpen(true);
    setFoldersLoading(true);

    try {
      const res = await getAllFolders();
      if (res.code === 1) {
        const nextFolders = res.data || [];
        setFolderTreeList(nextFolders);
        setExpandedKeys([]);
      } else {
        setFolderTreeList([]);
        messageApi.error(res.message);
      }
    } catch {
      setFolderTreeList([]);
      messageApi.error("加载文件夹树失败，请稍后重试");
    } finally {
      setFoldersLoading(false);
    }
  };

  const disabledFolderIds = useMemo(() => {
    if (!movingRecord || movingRecord.kind !== "folder")
      return new Set<string>();

    const currentId = String(movingRecord._id);
    const descendants = buildDescendantSet(folderTreeList, currentId);
    descendants.add(currentId);
    return descendants;
  }, [folderTreeList, movingRecord]);

  const folderTreeData = useMemo(
    () => buildFolderTree(folderTreeList, disabledFolderIds),
    [disabledFolderIds, folderTreeList],
  );

  const handleMoveToFolder = async (targetFolderId: string) => {
    if (!movingRecord || moving) return;

    setMoving(true);
    try {
      const res = await moveFileItem(
        movingRecord._id,
        targetFolderId,
        movingRecord.kind,
      );

      if (res.code === 1) {
        messageApi.success("移动成功");
        closeMoveModal();
        await refetch();
      } else {
        messageApi.error(res.message);
      }
    } catch {
      messageApi.error("移动失败，请稍后重试");
    } finally {
      setMoving(false);
    }
  };

  const selectedMoveTarget = useMemo(
    () =>
      folderTreeList.find(
        (folder) => String(folder._id) === selectedMoveTargetId,
      ),
    [folderTreeList, selectedMoveTargetId],
  );

  useEffect(() => {
    const unresolved = crumbs.some((item) => item.name === item.id);
    if (!unresolved || crumbs.length === 0) return;

    let cancelled = false;

    const resolveCrumbNames = async () => {
      let parentId: string | undefined;
      const resolved: CrumbItem[] = [];

      for (const crumb of crumbs) {
        try {
          const res = await listFiles(parentId);
          const folder = res.data.folders.find(
            (item) => String(item._id) === crumb.id,
          );
          resolved.push({
            id: crumb.id,
            name: folder?.name ?? crumb.name,
          });
        } catch {
          resolved.push(crumb);
        }

        parentId = crumb.id;
      }

      if (cancelled || isSameCrumbs(crumbs, resolved)) return;
      setCrumbs(resolved);
    };

    resolveCrumbNames();

    return () => {
      cancelled = true;
    };
  }, [crumbs, setCrumbs]);

  return (
    <div className="p-2">
      <Header />
      {contextHolder}
      <Modal
        title={
          <div className="flex items-center gap-2 text-[22px] font-semibold text-[#1f1f1f]">
            <Folder className="size-5 text-[#6b7280]" />
            <span>移动到</span>
          </div>
        }
        open={moveOpen}
        onCancel={() => {
          if (moving) return;
          closeMoveModal();
        }}
        width={760}
        closeIcon={<X className="size-5 text-[#6b7280]" />}
        footer={
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              onClick={() => {
                if (moving) return;
                closeMoveModal();
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              loading={moving}
              disabled={!selectedMoveTargetId}
              onClick={() =>
                selectedMoveTargetId &&
                void handleMoveToFolder(selectedMoveTargetId)
              }
              className="border-[#3f3f5a] bg-[#3f3f5a] shadow-none"
            >
              确认移动
            </Button>
          </div>
        }
      >
        <div className="mb-4 rounded-2xl border border-[#e5e7eb] bg-[#fbfbfa] px-4 py-3 text-sm text-[#6b7280]">
          当前路径：
          <span className="ml-1 text-[#1f1f1f]">
            {crumbs.length > 0
              ? crumbs.map((item) => item.name).join(" / ")
              : "根目录"}
          </span>
          {selectedMoveTarget ? (
            <>
              <span className="mx-2 text-[#9ca3af]">→</span>
              <span className="text-[#1f1f1f]">
                {selectedMoveTarget.name || DEFAULT_FOLDER_NAME}
              </span>
            </>
          ) : null}
        </div>

        {foldersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spin />
          </div>
        ) : folderTreeData.length === 0 ? (
          <Empty description="暂无可移动目标文件夹" />
        ) : (
          <div className="rounded-2xl border border-[#ebecef] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Tree
              className="[&_.ant-tree-indent-unit]:w-5 [&_.ant-tree-node-content-wrapper]:!flex [&_.ant-tree-node-content-wrapper]:!items-center [&_.ant-tree-node-content-wrapper]:!p-0 [&_.ant-tree-node-content-wrapper:hover]:!bg-transparent [&_.ant-tree-switcher]:flex [&_.ant-tree-switcher]:items-center [&_.ant-tree-switcher]:justify-center [&_.ant-tree-switcher]:text-[#9ca3af] [&_.ant-tree-switcher]:transition-colors [&_.ant-tree-switcher:hover]:text-[#6b7280] [&_.ant-tree-treenode]:py-0.5 [&_.ant-tree-treenode-disabled_.ant-tree-switcher]:pointer-events-auto [&_.ant-tree-treenode-disabled_.ant-tree-switcher]:cursor-pointer [&_.ant-tree-treenode-disabled_.ant-tree-switcher]:opacity-100 [&_.ant-tree-node-selected]:!bg-transparent"
              blockNode
              showIcon={false}
              selectedKeys={selectedMoveTargetId ? [selectedMoveTargetId] : []}
              expandedKeys={expandedKeys}
              treeData={folderTreeData}
              switcherIcon={({ expanded, isLeaf }) =>
                isLeaf ? (
                  <span className="inline-block size-4" />
                ) : expanded ? (
                  <ChevronDown className="size-4 text-current" />
                ) : (
                  <ChevronRight className="size-4 text-current" />
                )
              }
              onExpand={(keys) => setExpandedKeys(keys.map(String))}
              onSelect={(keys, info) => {
                if (moving || (info.node as FolderTreeNode).isTargetDisabled) {
                  return;
                }
                setSelectedMoveTargetId(String(keys[0] ?? info.node.key));
              }}
              titleRender={(node) => {
                const currentId = String(node.key);
                const isSelected = selectedMoveTargetId === currentId;
                const isDisabled = Boolean(
                  (node as FolderTreeNode).isTargetDisabled,
                );

                return (
                  <div
                    className={[
                      "flex w-full items-center justify-between rounded-xl border border-transparent px-3 py-2 text-left transition-all",
                      isSelected
                        ? "border-[#e5e7eb] bg-[#f3f4f6]"
                        : "hover:border-[#f1f3f5] hover:bg-[#fafafa]",
                      isDisabled || moving
                        ? "cursor-not-allowed opacity-45"
                        : "cursor-pointer",
                    ].join(" ")}
                  >
                    <div className="flex min-w-0 items-center gap-2 text-sm text-[#1f1f1f]">
                      <Folder className="size-4 shrink-0 text-[#60a5fa]" />
                      <span className="truncate">{String(node.title)}</span>
                    </div>
                    {isSelected ? (
                      <Check className="size-4 shrink-0 text-[#1f1f1f]" />
                    ) : null}
                  </div>
                );
              }}
            />
          </div>
        )}
      </Modal>
      <FilePreviewModal
        open={Boolean(previewRecord)}
        record={previewRecord}
        onClose={() => setPreviewRecord(null)}
        onDownload={handleDownload}
      />

      <header className="flex gap-2 pb-4">
        <Button onClick={() => setOpen(true)}>传输</Button>
        <Button loading={creatingFolder} onClick={handleCreateFolder}>
          新建文件夹
        </Button>
        <UploadButton
          onFileSelect={(file) => {
            createUploadTask(file, folderId);
            setOpen(true);
          }}
        />
      </header>

      <div>
        <nav className="flex border-t">
          <FolderBreadcrumbs />
          <div className="flex-1" />
          <div className="mr-10 flex items-center gap-3 py-4">
            <BatchActionBar
              selectedCount={selectedRows.length}
              onDelete={handleBulkDelete}
            />
            <button
              type="button"
              title="刷新"
              className="inline-flex size-7 items-center justify-center rounded-md text-[#6b7280] transition-colors hover:bg-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RotateCw
                className={[
                  "size-4",
                  isFetching ? "animate-spin" : "",
                ].join(" ")}
              />
            </button>
          </div>
        </nav>
        <main>
          <FileListTable
            list={files?.data}
            onOpenFolder={handleOpenFolder}
            isLoading={isFetching && !files?.data}
            selectedRowKeys={selectedRowKeys}
            onSelectedRowKeysChange={(keys, rows) => {
              setSelectedRowKeys(keys);
              setSelectedRows(rows);
            }}
            onPreview={handlePreview}
            onDownload={handleDownload}
            onShare={handleShare}
            onMove={handleOpenMove}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </main>
      </div>
      <UploadListWrapper open={open} onClose={() => setOpen(false)} />
    </div>
  );
};

const UploadButton = ({
  onFileSelect,
}: {
  onFileSelect: (file: File) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlerClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="inline-block">
      <Button type="primary" icon={<UploadOutlined />} onClick={handlerClick}>
        上传
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) =>
          event.target.files?.[0] && onFileSelect(event.target.files[0])
        }
      />
    </div>
  );
};

const BatchActionBar = ({
  selectedCount,
  onDelete,
}: {
  selectedCount: number;
  onDelete: () => void;
}) => {
  if (selectedCount <= 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-[#fafafa] px-3 py-1.5">
      <span className="text-xs text-[#6b7280]">已选 {selectedCount} 项</span>
      <Button
        danger
        size="small"
        type="text"
        icon={<Trash2 className="size-4" />}
        onClick={onDelete}
      >
        删除
      </Button>
    </div>
  );
};

export default FileManager;
