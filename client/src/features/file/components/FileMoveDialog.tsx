import { getAllFolders, type FileBreadcrumb, type FileListItem, type FolderRecord } from "@/api/file";
import {
  buildFolderTree,
  collectDisabledFolderIds,
  type FolderTreeNode,
} from "@/features/file/folderTree";
import { Empty, Modal, Spin, Tree } from "antd";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface FileMoveDialogProps {
  breadcrumbs: FileBreadcrumb[];
  open: boolean;
  targets: FileListItem[];
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => Promise<boolean>;
}

export function FileMoveDialog({
  breadcrumbs,
  open,
  targets,
  onClose,
  onConfirm,
}: FileMoveDialogProps) {
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<string | null>();
  const disabledIds = useMemo(
    () => collectDisabledFolderIds(folders, targets),
    [folders, targets],
  );
  const tree = useMemo(
    () => buildFolderTree(folders, disabledIds),
    [disabledIds, folders],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSelectedTarget(undefined);
    setError("");
    setLoading(true);
    void getAllFolders()
      .then((response) => {
        if (cancelled) return;
        if (response.code === 1) setFolders(response.data ?? []);
        else setError(response.message || "加载文件夹失败");
      })
      .catch(() => {
        if (!cancelled) setError("加载文件夹失败，请稍后重试");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  const confirm = async () => {
    if (selectedTarget === undefined || moving) return;
    setMoving(true);
    const success = await onConfirm(selectedTarget);
    setMoving(false);
    if (success) onClose();
  };

  return (
    <Modal
      cancelButtonProps={{ disabled: moving }}
      cancelText="取消"
      okButtonProps={{ disabled: selectedTarget === undefined }}
      okText="确认移动"
      onCancel={onClose}
      onOk={() => void confirm()}
      open={open}
      confirmLoading={moving}
      title={targets.length > 1 ? `移动 ${targets.length} 个项目` : "移动到"}
      width={620}
    >
      <div className="mb-3 rounded-control bg-bg-panel px-3 py-2 text-xs text-text-muted">
        当前路径：{breadcrumbs.map((item) => item.name).join(" / ")}
      </div>
      <button
        className={`mb-1 flex h-9 w-full items-center justify-between rounded-control px-3 text-left text-sm hover:bg-bg-hover${selectedTarget === null ? " bg-bg-selected" : ""}`}
        onClick={() => setSelectedTarget(null)}
        type="button"
      >
        <span>全部文件（根目录）</span>
        {selectedTarget === null ? <Check className="size-4" /> : null}
      </button>
      {loading ? (
        <div className="grid min-h-48 place-items-center"><Spin size="small" /></div>
      ) : error ? (
        <div className="grid min-h-48 place-items-center text-sm text-text-muted">{error}</div>
      ) : tree.length === 0 ? (
        <Empty className="py-10" description="暂无其他文件夹" />
      ) : (
        <div className="max-h-[360px] overflow-y-auto border-t border-border-row pt-1 scrollbar-thin scrollbar-thumb-border">
          <Tree
            blockNode
            onSelect={(keys, info) => {
              const node = info.node as FolderTreeNode;
              if (!node.targetDisabled) setSelectedTarget(String(keys[0] ?? node.key));
            }}
            selectedKeys={typeof selectedTarget === "string" ? [selectedTarget] : []}
            showIcon={false}
            titleRender={(rawNode) => {
              const node = rawNode as FolderTreeNode;
              const selected = selectedTarget === String(node.key);
              return (
                <span className="flex h-8 w-full items-center justify-between rounded-compact px-2 text-sm">
                  <span className="truncate">{String(node.title)}</span>
                  {selected ? <Check className="size-4" /> : null}
                </span>
              );
            }}
            treeData={tree}
          />
        </div>
      )}
    </Modal>
  );
}
