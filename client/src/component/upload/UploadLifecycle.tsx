import { getUploadTaskStatus } from "@/api/file";
import { getUploadProgress } from "@/features/upload/progress";
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
  getLegacyUploadSessions,
  getUploadSessions,
  migrateLegacyUploadSession,
  removeLegacyUploadSession,
  removeUploadSession,
} from "@/features/upload/session";
import {
  authLifecycleRegistry,
} from "@/features/auth/model/auth-lifecycle";
import {
  isAccountScopeCurrent,
  type AccountScope,
} from "@/features/auth/model/account-scope";
import type { UploadSession } from "@/features/upload/model";
import type { UploadTaskStatusData } from "@/api/fileUpload";

// 恢复到本地上传会话时，用 restored: 前缀标记，避免与真实任务 id 冲突
const restoredTaskId = (ownerId: string, uploadId: string): string =>
  `restored:${ownerId}:${uploadId}`;

/**
 * 把已由认证接口确认归属的上传会话转换为只等待用户重选文件的任务。
 * @param scope 当前账号作用域。
 * @param session 已确认 ownerId 的本地会话。
 * @param status 服务端授权查询返回的任务状态。
 * @returns 可安全展示文件名的恢复任务。
 */
const createRestoredTask = (
  scope: AccountScope,
  session: UploadSession,
  status: UploadTaskStatusData,
): UploadTask => {
  const completed = status.uploadedChunks.length;
  return {
    ownerId: scope.ownerId,
    generation: scope.generation,
    id: restoredTaskId(scope.ownerId, session.uploadId),
    name: session.name,
    size: session.size,
    folderId: session.folderId,
    folderName: session.folderName,
    uploadId: session.uploadId,
    progress: getUploadProgress(session.size, completed, session.totalChunks),
    speed: 0,
    status: UploadStatus.needsFile,
    error: status.error || undefined,
    instance: null,
  };
};

/**
 * 上传任务的生命周期管理器（无 UI，常驻应用根节点）。
 * - 启动时从 localStorage 恢复上次中断的上传任务，查询服务端已传分块，
 *   重建为 needsFile 状态的条目供用户续传；已完成的会话会被清理。
 * - 存在活跃上传时监听 beforeunload，拦截页面关闭/刷新，防止上传丢失。
 * @returns 不渲染可见内容。
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

  useEffect(() => {
    let restoreVersion = 0;

    /** @param scope 新认证账号作用域。@returns 已完成服务端归属探针的 Promise。 */
    const restore = async (scope: AccountScope): Promise<void> => {
      const version = ++restoreVersion;
      const legacyNames = consumeLegacyUploadNames();
      if (legacyNames.length > 0) {
        void message.warning(
          `发现 ${legacyNames.length} 个旧版中断任务，请重新选择原文件续传`,
          8,
        );
      }

      const ownedSessions = getUploadSessions(scope.ownerId);
      const legacySessions = getLegacyUploadSessions();
      let restoredCount = 0;
      await Promise.all(
        [...ownedSessions, ...legacySessions].map(async (candidate) => {
          try {
            const response = await getUploadTaskStatus(candidate.uploadId);
            if (
              version !== restoreVersion ||
              !isAccountScopeCurrent(scope)
            ) {
              return;
            }
            if (response.data.status === "completed") {
              if ("ownerId" in candidate) {
                removeUploadSession(scope.ownerId, candidate.uploadId);
              } else {
                removeLegacyUploadSession(candidate.uploadId);
              }
              return;
            }
            const session =
              "ownerId" in candidate && typeof candidate.ownerId === "string"
                ? { ...candidate, ownerId: candidate.ownerId }
                : migrateLegacyUploadSession(scope.ownerId, candidate.uploadId);
            if (!session) return;
            const task = createRestoredTask(scope, session, response.data);
            store.set(uploadTaskAtomFamily(task.id), task);
            store.set(uploadTasksAtom, (ids) =>
              ids.includes(task.id) ? ids : [task.id, ...ids],
            );
            restoredCount += 1;
          } catch {
            // 403/404、网络错误与 5xx 都保留本地记录；未确认归属时绝不显示文件名。
          }
        }),
      );
      if (
        version === restoreVersion &&
        isAccountScopeCurrent(scope) &&
        restoredCount > 0
      ) {
        void message.info("存在未完成上传，请在文件页重新选择原文件续传", 8);
      }
    };

    return authLifecycleRegistry.register({
      id: "upload-tasks",
      cancel: () => {
        restoreVersion += 1;
        store.get(uploadTasksAtom).forEach((id) => {
          store.get(uploadTaskAtomFamily(id))?.instance?.dispose();
        });
      },
      clear: () => {
        const ids = store.get(uploadTasksAtom);
        store.set(uploadTasksAtom, []);
        ids.forEach((id) => uploadTaskAtomFamily.remove(id));
      },
      restore,
    });
  }, [store]);

  return null;
}
