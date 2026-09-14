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

// 恢复到本地上传会话时，用 restored: 前缀标记，避免与真实任务 id 冲突
const restoredTaskId = (uploadId: string) => `restored:${uploadId}`;

/**
 * 上传任务的生命周期管理器（无 UI，常驻应用根节点）。
 * - 启动时从 localStorage 恢复上次中断的上传任务，查询服务端已传分块，
 *   重建为 needsFile 状态的条目供用户续传；已完成的会话会被清理。
 * - 存在活跃上传时监听 beforeunload，拦截页面关闭/刷新，防止上传丢失。
 */
export default function UploadLifecycle() {
  const store = useStore();
  const hasActiveUpload = useAtomValue(hasActiveUploadAtom);

  // 有活跃上传时，拦截页面关闭/刷新，防止上传中断丢失
  useEffect(() => {
    if (!hasActiveUpload) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasActiveUpload]);

  // 启动时恢复上次未完成的上传：从 localStorage 读取会话，向服务端查询已传分块
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
              // 服务端已有分块作为保底进度，10% 起步、封顶 99%，剩余部分需重新选文件补齐
              progress: Math.min(
                99,
                10 + Math.round((completed / session.totalChunks) * 89),
              ),
              speed: 0,
              // 服务端只存了分块，没有完整文件，必须由用户重新选择原文件才能续传
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
