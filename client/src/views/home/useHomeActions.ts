import { newNote } from "@/api/note";
import { useGlobalUpload } from "@/component/upload/hooks/GlobalUpload";
import { isAccountScopeCurrent, requireAccountScope } from "@/features/auth/model/account-scope";
import { useAuth } from "@/hooks/useAuth";
import { createNoteAtom } from "@/store/atom/note/noteMutationAtom";
import { routes } from "@/utils/routes";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * 复用现有业务动作，为首页工具栏管理创建和上传浮层。
 * @returns 工具栏状态和真实业务回调。
 */
export function useHomeActions() {
  const { user } = useAuth();
  const mutation = useAtomValue(createNoteAtom);
  const { createUploadTasks } = useGlobalUpload();
  const navigate = useNavigate();
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  /** 创建期间禁用重复操作，切换账号后不导航到旧账号的笔记。 */
  const createNote = (): void => {
    if (!user?.id || mutation.isPending) return;
    const scope = requireAccountScope();
    const note = newNote();
    mutation.mutate({ note }, {
      onSuccess: () => {
        if (isAccountScopeCurrent(scope)) navigate(routes.note(note._id));
      },
    });
  };

  /**
   * 首页上传落到根目录，进度与取消行为交给现有全局任务。
   * @param files 用户选择的文件。
   * @returns 无返回值。
   */
  const uploadFiles = (files: File[]): void => {
    createUploadTasks(files);
    setUploadOpen(true);
  };

  return { createNote, creating: mutation.isPending, meetingOpen, setMeetingOpen, uploadOpen, setUploadOpen, uploadFiles };
}
