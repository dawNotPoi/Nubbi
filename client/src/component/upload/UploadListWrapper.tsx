import {
  finishedUploadCountAtom,
  uploadTasksAtom,
} from "@/store/atom/FileAtom";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useUploadTaskActions } from "./hooks/useUploadTaskActions";
import UploadItem from "./UploadItem";

export default function UploadListWrapper({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const tasks = useAtomValue(uploadTasksAtom);
  const finishedCount = useAtomValue(finishedUploadCountAtom);
  const { cancelTask, clearFinished, removeTask } = useUploadTaskActions();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () => document.removeEventListener("mousedown", handleClickOutside, true);
  }, [onClose, open]);

  return (
    <aside
      ref={wrapperRef}
      aria-label="上传任务"
      className={clsx(
        "fixed inset-x-0 bottom-0 z-50 flex h-[min(70dvh,520px)] w-full flex-col rounded-t-sheet bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl md:inset-x-auto md:bottom-auto md:right-[10%] md:top-4 md:h-[400px] md:w-[700px] md:rounded-panel md:pb-4 md:shadow-md",
        open ? "flex" : "hidden",
      )}
    >
      <header className="flex items-center justify-between border-b border-border-row pb-3">
        <div>
          <h4 className="font-medium text-text-primary">上传任务</h4>
          <p className="text-xs text-text-subtle">共 {tasks.length} 项</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs text-text-muted disabled:opacity-40"
            disabled={finishedCount === 0}
            onClick={clearFinished}
          >
            清除已完成
          </button>
          <button
            type="button"
            aria-label="关闭上传任务"
            className="grid size-8 place-items-center rounded-full text-text-muted hover:bg-bg-icon-hover"
            onClick={onClose}
          >
            <X className="size-4" />
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border">
        {tasks.length > 0 ? (
          tasks.map((id) => (
            <UploadItem
              key={id}
              id={id}
              onCancel={(taskId) => void cancelTask(taskId)}
              onRemove={removeTask}
            />
          ))
        ) : (
          <div className="py-10 text-center text-sm text-text-subtle">
            暂无上传任务
          </div>
        )}
      </div>
    </aside>
  );
}
