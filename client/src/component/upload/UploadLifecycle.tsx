import { getUploadTaskStatus } from "@/api/file";
import {
  type UploadTask,
  hasActiveUploadAtom,
  uploadTaskAtomFamily,
  uploadTasksAtom,
} from "@/store/atom/FileAtom";
import { UploadStatus } from "@/utils/file";
import { message } from "antd";
import { useAtomValue, useStore } from "jotai";
import { useEffect } from "react";
import {
  consumeLegacyUploadNames,
  getUploadSessions,
  removeUploadSession,
} from "@/features/upload/session";

const restoredTaskId = (uploadId: string) => `restored:${uploadId}`;

export default function UploadLifecycle() {
  const store = useStore();
  const hasActiveUpload = useAtomValue(hasActiveUploadAtom);

  useEffect(() => {
    if (!hasActiveUpload) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasActiveUpload]);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      const legacyNames = consumeLegacyUploadNames();
      if (legacyNames.length > 0) {
        void message.warning(
          `发现 ${legacyNames.length} 个旧版中断任务，请重新选择原文件续传`,
          8,
        );
      }

      const sessions = getUploadSessions();
      await Promise.all(
        sessions.map(async (session) => {
          let task: UploadTask;
          try {
            const response = await getUploadTaskStatus(session.uploadId);
            if (!active) return;
            if (response.data.status === "completed") {
              removeUploadSession(session.uploadId);
              return;
            }
            const completed = response.data.uploadedChunks.length;
            task = {
              id: restoredTaskId(session.uploadId),
              name: session.name,
              size: session.size,
              folderId: session.folderId,
              uploadId: session.uploadId,
              progress: Math.min(
                99,
                10 + Math.round((completed / session.totalChunks) * 89),
              ),
              speed: 0,
              status: UploadStatus.needsFile,
              error: response.data.error || undefined,
              instance: null,
            };
          } catch (error) {
            if (!active) return;
            task = {
              id: restoredTaskId(session.uploadId),
              name: session.name,
              size: session.size,
              folderId: session.folderId,
              uploadId: session.uploadId,
              progress: 0,
              speed: 0,
              status: UploadStatus.needsFile,
              error: error instanceof Error ? error.message : "任务状态获取失败",
              instance: null,
            };
          }
          store.set(uploadTaskAtomFamily(task.id), task);
          store.set(uploadTasksAtom, (ids) =>
            ids.includes(task.id) ? ids : [task.id, ...ids],
          );
        }),
      );
      if (active && sessions.length > 0) {
        void message.info("存在未完成上传，请在文件页重新选择原文件续传", 8);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, [store]);

  return null;
}
