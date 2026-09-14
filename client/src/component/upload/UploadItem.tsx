import { Button, Progress } from "antd";
import { useAtomValue } from "jotai";
import { uploadTaskAtomFamily } from "../../store/atom/FileAtom";
import { UploadStatus } from "../../utils/file";

const UploadItem = ({ id }: { id: string }) => {
  const task = useAtomValue(uploadTaskAtomFamily(id));
  const statusText: Record<UploadStatus, string> = {
    [UploadStatus.pending]: "排队中",
    [UploadStatus.uploading]: "上传中",
    [UploadStatus.success]: "已完成",
    [UploadStatus.fail]: "失败",
    [UploadStatus.paused]: "已暂停",
  };
  const percent = task?.progress ?? 0;
  const canResume =
    task &&
    [UploadStatus.pending, UploadStatus.paused, UploadStatus.fail].includes(task.status);
  const canPause = task && task.status === UploadStatus.uploading;
  return (
    <div className="upload-item py-2 space-y-2">
      <header className="flex items-center justify-between gap-2">
        <span className="truncate">{task?.name}</span>
        <span className="text-xs text-gray-500">{task ? statusText[task.status] : ""}</span>
      </header>
      <Progress percent={percent} />
      <footer className="flex gap-4">
        <Button disabled={!canResume} onClick={() => task?.instance.resume()}>
          开始
        </Button>
        <Button disabled={!canPause} onClick={() => task?.instance.pause()}>
          暂停
        </Button>
      </footer>
    </div>
  );
};
export default UploadItem;
