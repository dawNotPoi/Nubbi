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
  }, [open]);
  return (
    <div
      ref={wrapperRef}
      className={clsx(
        "fixed rounded-xl flex flex-col top-4 right-[10%] w-[700px] bg-white shadow-md  h-[400px] p-4",
        open ? "block" : "hidden"
      )}
    >
      <header className="border-b-4 p-2">
        <div>
          <h4>Downloading</h4>
        </div>
      </header>
      {/* <GlobalFileUpload /> */}
      <div className="overflow-y-auto flex-1">
        {tasks?.map((id) => (
          <UploadItem key={id} id={id} />
        ))}
      </div>
      <div className="flex justify-center items-center p-2 ">
        <span className="text-xs text-gray-500/80">-仅展示本次上传任务-</span>
      </div>
    </div>
  );
}
