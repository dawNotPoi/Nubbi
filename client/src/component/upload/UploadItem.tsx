import { uploadTaskAtomFamily } from "@/store/atom/FileAtom";
import { UploadStatus } from "@/utils/file";
import { Button, Progress } from "antd";
import { useAtomValue } from "jotai";

const formatBytes = (value: number, suffix = "") => {
  if (value <= 0) return `--${suffix}`;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let amount = value;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index++;
  }
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${units[index]}${suffix}`;
};

const statusText: Record<UploadStatus, string> = {
  [UploadStatus.pending]: "排队中",
  [UploadStatus.hashing]: "正在校验",
  [UploadStatus.initializing]: "正在初始化",
  [UploadStatus.uploading]: "上传中",
  [UploadStatus.paused]: "已暂停",
  [UploadStatus.merging]: "正在合并",
  [UploadStatus.success]: "已完成",
  [UploadStatus.fail]: "上传失败",
  [UploadStatus.needsFile]: "等待重新选择",
  [UploadStatus.cancelled]: "已取消",
};

export default function UploadItem({
  id,
  onCancel,
  onRemove,
}: {
  id: string;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const task = useAtomValue(uploadTaskAtomFamily(id));
  if (!task) return null;

  const canPause = task.status === UploadStatus.uploading && task.instance;
  const canResume = task.status === UploadStatus.paused && task.instance;
  const canRetry = task.status === UploadStatus.fail && task.instance;
  const canCancel = ![
    UploadStatus.success,
    UploadStatus.cancelled,
    UploadStatus.merging,
  ].includes(task.status);
  const canRemove = [UploadStatus.success, UploadStatus.cancelled].includes(
    task.status,
  );
  const remainingSeconds =
    task.speed > 0
      ? Math.max(0, (task.size * (1 - task.progress / 100)) / task.speed)
      : 0;

  return (
    <article className="space-y-2 border-b border-border-row py-3 last:border-0">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-text-primary">{task.name}</p>
          <p className="text-xs text-text-subtle">
            {formatBytes(task.size)}
            {task.folderName ? ` · 上传到 ${task.folderName}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-xs text-text-muted">
          {statusText[task.status]}
        </span>
      </header>
      <Progress
        percent={task.progress}
        size="small"
        status={task.status === UploadStatus.fail ? "exception" : undefined}
      />
      {task.error && <p className="text-xs text-red-600">{task.error}</p>}
      {task.status === UploadStatus.needsFile && (
        <p className="text-xs text-text-muted">请点击上传并重新选择同一文件</p>
      )}
      <footer className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-xs text-text-subtle">
          {task.status === UploadStatus.uploading
            ? `${formatBytes(task.speed, "/s")}${
                remainingSeconds > 0
                  ? ` · 约 ${Math.ceil(remainingSeconds)} 秒`
                  : ""
              }`
            : ""}
        </span>
        <div className="flex shrink-0 gap-1">
          {canPause && (
            <Button size="small" type="text" onClick={() => task.instance?.pause()}>
              暂停
            </Button>
          )}
          {canResume && (
            <Button size="small" type="text" onClick={() => task.instance?.resume()}>
              继续
            </Button>
          )}
          {canRetry && (
            <Button size="small" type="text" onClick={() => task.instance?.retry()}>
              重试
            </Button>
          )}
          {canCancel && (
            <Button danger size="small" type="text" onClick={() => onCancel(id)}>
              取消
            </Button>
          )}
          {canRemove && (
            <Button size="small" type="text" onClick={() => onRemove(id)}>
              移除
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
}
