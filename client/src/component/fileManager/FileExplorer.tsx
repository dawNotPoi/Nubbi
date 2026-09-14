import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  FolderAddOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Typography,
  Upload,
  message,
} from "antd";
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react";
import { deriveEntriesForDir } from "./derive";
import { joinPathParts, splitPathParts } from "./path";
import type { FileId, RemoteFileRecord } from "./types";
import { FileListItem, FolderListItem } from "./FileListItem";

export interface FileExplorerHandle {
  getSelectedIds: () => string[];
  clearSelection: () => void;
  navigateTo: (path: string | string[]) => void;
}

function FileExplorerImpl(
  props: {
    files: RemoteFileRecord[];
    loading?: boolean;
    onRefresh: () => void;
    onUploadFile: (file: File) => void;
    onOpenUploadList: () => void;
    onDeleteFiles: (ids: FileId[]) => Promise<void>;
    onRenameFile: (id: FileId, name: string) => Promise<void>;
  },
  ref: React.Ref<FileExplorerHandle>
) {
  const [messageApi, contextHolder] = message.useMessage();
  const [currentDirParts, setCurrentDirParts] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<FileId[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const filesById = useMemo(() => {
    const map = new Map<FileId, RemoteFileRecord>();
    for (const file of props.files) map.set(file._id, file);
    return map;
  }, [props.files]);

  const entries = useMemo(() => {
    return deriveEntriesForDir(props.files, currentDirParts);
  }, [props.files, currentDirParts]);

  const fileIdsInDir = useMemo(
    () => entries.files.map((f) => f.file._id),
    [entries.files]
  );
  const allSelected =
    fileIdsInDir.length > 0 && fileIdsInDir.every((id) => selectedSet.has(id));

  const renameTargetId = useRef<FileId | null>(null);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const clearSelection = () => setSelectedIds([]);
  const navigateTo = (path: string | string[]) => {
    const parts = Array.isArray(path) ? path : splitPathParts(path);
    setCurrentDirParts(parts);
    clearSelection();
  };

  useImperativeHandle(
    ref,
    () => ({
      getSelectedIds: () => selectedIds,
      clearSelection,
      navigateTo,
    }),
    [selectedIds]
  );

  const openRenameFor = (id: FileId) => {
    const file = filesById.get(id);
    if (!file) return;
    renameTargetId.current = id;
    const base = splitPathParts(file.name).at(-1) ?? file.name;
    setRenameValue(base);
    setRenameModalOpen(true);
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    await props.onDeleteFiles(selectedIds);
    clearSelection();
  };

  const createFolderByMovingSelected = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    if (selectedIds.length === 0) {
      messageApi.warning("请先选择要移动的文件（暂不支持创建空文件夹）");
      return;
    }

    const renameTasks = selectedIds.map(async (id) => {
      const file = filesById.get(id);
      if (!file) return;
      const base = splitPathParts(file.name).at(-1) ?? file.name;
      const nextName = joinPathParts([...currentDirParts, trimmed, base]);
      await props.onRenameFile(id, nextName);
    });

    await Promise.all(renameTasks);
    setNewFolderModalOpen(false);
    setNewFolderName("");
    clearSelection();
    navigateTo([...currentDirParts, trimmed]);
  };

  const confirmRename = async () => {
    const id = renameTargetId.current;
    if (!id) return;
    const file = filesById.get(id);
    if (!file) return;

    const next = renameValue.trim();
    if (!next) return;

    const dirParts = splitPathParts(file.name).slice(0, -1);
    const nextName = next.includes("/") || next.includes("\\")
      ? joinPathParts(splitPathParts(next))
      : joinPathParts([...dirParts, next]);

    await props.onRenameFile(id, nextName);
    setRenameModalOpen(false);
    renameTargetId.current = null;
    setRenameValue("");
  };

  return (
    <div className="space-y-3">
      {contextHolder}
      <Modal
        title="重命名"
        open={renameModalOpen}
        onOk={confirmRename}
        onCancel={() => setRenameModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
        <Typography.Paragraph type="secondary" className="mt-2 mb-0">
          仅修改文件名；如需移动目录可输入包含 “/” 的路径。
        </Typography.Paragraph>
      </Modal>

      <Modal
        title="新建文件夹（移动选中文件）"
        open={newFolderModalOpen}
        onOk={createFolderByMovingSelected}
        onCancel={() => setNewFolderModalOpen(false)}
        okText="确定"
        cancelText="取消"
      >
        <Input
          placeholder="文件夹名称"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
      </Modal>

      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              icon={<ArrowLeftOutlined />}
              disabled={currentDirParts.length === 0}
              onClick={() => navigateTo(currentDirParts.slice(0, -1))}
            />
            <Breadcrumb
              className="min-w-0"
              items={[
                {
                  title: (
                    <button
                      type="button"
                      className="truncate"
                      onClick={() => navigateTo([])}
                    >
                      文件
                    </button>
                  ),
                },
                ...currentDirParts.map((part, index) => ({
                  title: (
                    <button
                      type="button"
                      className="truncate"
                      onClick={() => navigateTo(currentDirParts.slice(0, index + 1))}
                    >
                      {part}
                    </button>
                  ),
                })),
              ]}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              icon={<ReloadOutlined />}
              onClick={props.onRefresh}
              loading={props.loading}
            >
              刷新
            </Button>
            <Button onClick={props.onOpenUploadList}>上传列表</Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Upload
            showUploadList={false}
            customRequest={(option) => {
              const file = option.file as File;
              props.onUploadFile(file);
              option.onSuccess?.({}, new XMLHttpRequest());
            }}
          >
            <Button type="primary" icon={<UploadOutlined />}>
              上传
            </Button>
          </Upload>

          <Popconfirm
            title="删除文件"
            description={`确认删除选中的 ${selectedIds.length} 个文件？`}
            onConfirm={deleteSelected}
            okText="确定"
            cancelText="取消"
            disabled={selectedIds.length === 0}
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              disabled={selectedIds.length === 0}
            >
              删除
            </Button>
          </Popconfirm>

          <Button
            icon={<EditOutlined />}
            disabled={selectedIds.length !== 1}
            onClick={() => openRenameFor(selectedIds[0]!)}
          >
            重命名
          </Button>

          <Button
            icon={<FolderAddOutlined />}
            onClick={() => setNewFolderModalOpen(true)}
          >
            新建文件夹
          </Button>

          <Typography.Text type="secondary" className="ml-auto">
            已选 {selectedIds.length} 项
          </Typography.Text>
        </div>
      </header>

      <section className="border rounded overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 bg-zinc-50 border-b">
          <Checkbox
            checked={allSelected}
            indeterminate={!allSelected && selectedIds.length > 0}
            onChange={(e) => setSelectedIds(e.target.checked ? fileIdsInDir : [])}
            disabled={fileIdsInDir.length === 0}
          />
          <Typography.Text type="secondary">选择本目录文件</Typography.Text>
        </div>

        <div className="divide-y">
          {entries.folders.map((folder) => (
            <FolderListItem
              key={folder.pathParts.join("/")}
              folder={folder}
              onOpen={() => navigateTo(folder.pathParts)}
            />
          ))}

          {entries.files.map((entry) => (
            <FileListItem
              key={entry.file._id}
              entry={entry}
              selected={selectedSet.has(entry.file._id)}
              onToggleSelect={() => {
                const id = entry.file._id;
                setSelectedIds((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                );
              }}
              onDownload={() => window.open(entry.file.path, "_blank")}
              onCopyLink={async () => {
                await window.navigator.clipboard.writeText(entry.file.path);
                messageApi.success("已复制链接");
              }}
              onRename={() => openRenameFor(entry.file._id)}
              onDelete={async () => props.onDeleteFiles([entry.file._id])}
            />
          ))}

          {!props.loading &&
            entries.folders.length === 0 &&
            entries.files.length === 0 && (
              <div className="px-3 py-8 text-center text-zinc-500">空文件夹</div>
            )}
        </div>
      </section>
    </div>
  );
}

export default forwardRef(FileExplorerImpl);
