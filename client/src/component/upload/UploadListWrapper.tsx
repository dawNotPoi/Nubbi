import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { uploadTasksAtom } from "../../store/atom/FileAtom";
import UploadItem from "./UploadItem";

export default function UploadListWrapper({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // 此处管理上传列表
  const tasks = useAtomValue(uploadTasksAtom);
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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [onClose, open]);
  return (
    <div
      ref={wrapperRef}
      className={clsx(
        "fixed inset-x-0 bottom-0 z-50 flex h-[min(70dvh,520px)] w-full flex-col rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl md:inset-x-auto md:bottom-auto md:right-[10%] md:top-4 md:h-[400px] md:w-[700px] md:rounded-xl md:pb-4 md:shadow-md",
        open ? "block" : "hidden"
      )}
    >
      <header className="border-b-4 p-2">
        <div>
          <h4>上传队列</h4>
        </div>
      </header>
      {/* <GlobalFileUpload /> */}
      <div className="overflow-y-auto flex-1">
        {tasks?.length ? (
          tasks.map((id) => <UploadItem key={id} id={id} />)
        ) : (
          <div className="text-center text-gray-400 py-10 text-sm">暂无上传任务</div>
        )}
      </div>
      <div className="flex justify-center items-center p-2 ">
        <span className="text-xs text-gray-500/80">-仅展示本次上传任务-</span>
      </div>
    </div>
  );
}
