import { getAllFolders, type FileBreadcrumb, type FileListItem, type FolderRecord } from "@/api/file";
import {
  buildFolderTree,
  collectDisabledFolderIds,
  type FolderTreeNode,
} from "@/features/file/folderTree";
import { Modal } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface FileMoveDialogProps {
  breadcrumbs: FileBreadcrumb[];
  open: boolean;
  targets: FileListItem[];
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => Promise<boolean>;
}

/**
 * 递归渲染文件夹目标，禁用源文件夹及其后代，避免产生循环层级。
 * @param props 节点、当前选择和选择回调。
 * @returns 可键盘操作的文件夹目标列表。
 */
function FolderTargets({ nodes, selected, onSelect }: {
  nodes: FolderTreeNode[];
  selected: string | null | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <ul className="m-0 list-none p-0">
      {nodes.map((node) => (
        <li key={String(node.key)}>
          <button
            className={`flex min-h-9 w-full items-center justify-between rounded-control px-3 text-left text-sm hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-45${selected === String(node.key) ? " bg-bg-selected" : ""}`}
            disabled={node.targetDisabled}
            onClick={() => onSelect(String(node.key))}
            type="button"
          >
            <span className="truncate">{String(node.title)}</span>
            {selected === String(node.key) ? <Check className="size-4 shrink-0" /> : null}
          </button>
          {node.children?.length ? (
            <div className="pl-4"><FolderTargets nodes={node.children} selected={selected} onSelect={onSelect} /></div>
          ) : null}
        </li>
      ))}
    </ul>
  );
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
    if (!success) throw new Error("移动失败");
  };

  return (
    <Modal
      cancelText="取消"
      okButtonProps={{ disabled: selectedTarget === undefined }}
      okText="确认移动"
      onCancel={onClose}
      onOk={confirm}
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
        <div className="grid min-h-48 place-items-center"><Spinner /></div>
      ) : error ? (
        <div className="grid min-h-48 place-items-center text-sm text-text-muted">{error}</div>
      ) : tree.length === 0 ? (
        <div className="py-10 text-center text-sm text-text-muted">暂无其他文件夹</div>
      ) : (
        <div className="max-h-[360px] overflow-y-auto border-t border-border-row pt-1 scrollbar-thin scrollbar-thumb-border">
          <FolderTargets nodes={tree} selected={selectedTarget} onSelect={setSelectedTarget} />
        </div>
      )}
    </Modal>
  );
}
