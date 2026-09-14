import type { FileStats } from "@/api/file";
import { formatFileSize } from "@/features/file/model";

interface FileQuotaProps {
  stats: FileStats | undefined;
}

/** 文件页存储用量条：展示已用（含上传中预留）与配额 */
export function FileQuota({ stats }: FileQuotaProps) {
  if (!stats || stats.quotaBytes <= 0) return null;
  const usedBytes = Math.max(0, stats.usedBytes + stats.reservedBytes);
  const percent = Math.min(
    100,
    Math.round((usedBytes / stats.quotaBytes) * 100),
  );
  const fillClass =
    percent >= 100
      ? "bg-red-500"
      : percent >= 90
        ? "bg-amber-500"
        : "bg-accent-border";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
      <span className="tabular-nums">
        已用 {formatFileSize(usedBytes)} / {formatFileSize(stats.quotaBytes)}
      </span>
      {stats.reservedBytes > 0 ? (
        <span className="text-text-subtle tabular-nums">
          含上传中 {formatFileSize(stats.reservedBytes)}
        </span>
      ) : null}
      <span
        aria-hidden
        className="h-1 w-[120px] overflow-hidden rounded-full bg-bg-selected"
      >
        <span
          className={`block h-full rounded-full ${fillClass}`}
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
}
