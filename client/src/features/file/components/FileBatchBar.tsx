interface FileBatchBarProps {
  count: number;
  onCancel: () => void;
  onDelete: () => void;
  onMove: () => void;
}

export function FileBatchBar({
  count,
  onCancel,
  onDelete,
  onMove,
}: FileBatchBarProps) {
  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto text-xs">
      <span className="mr-1 shrink-0 text-text-muted">已选 {count} 项</span>
      <button className="file-text-action" onClick={onMove} type="button">
        移动
      </button>
      <button
        className="file-text-action text-red-600"
        onClick={onDelete}
        type="button"
      >
        删除
      </button>
      <button className="file-text-action" onClick={onCancel} type="button">
        取消
      </button>
    </div>
  );
}
