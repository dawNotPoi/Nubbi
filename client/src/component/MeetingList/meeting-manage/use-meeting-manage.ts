import {
  deleteMeeting,
  getMeetingComments,
  vetMeeting,
  type MeetingComment,
  type MeetingType,
} from "@/api/meeting";
import { queryClient } from "@/utils/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { AllMeetingAtom } from "@/store/atom/meetingAtom";
import {
  allMeetingQueryKey,
  recentMeetingQueryKey,
} from "@/store/atom/meetingAtom";
import {
  isAccountScopeCurrent,
  requireAccountScope,
} from "@/features/auth/model/account-scope";
import { toast as message } from "@/components/ui/toast";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MeetingDecision, MeetingStats } from "./types";

type MeetingManageState = {
  meetings: MeetingType[];
  loading: boolean;
  currentUserId?: string;
  stats: MeetingStats;
  refresh: () => Promise<void>;
  vet: (id: string, status: MeetingDecision) => Promise<void>;
  remove: (id: string) => Promise<void>;
  join: (id: string) => void;
  viewComments: (meeting: MeetingType) => Promise<void>;
  comments: MeetingComment[];
  commentLoading: boolean;
  commentModalOpen: boolean;
  commentMeetingTitle: string;
  closeComments: () => void;
};

/**
 * 会议管理页的状态与操作 Hook。
 * 仅在 active 为 true 时自动拉取数据，避免弹窗未打开时不必要的请求。
 * @param active 是否激活数据拉取（page 模式恒为 true，modal 模式按 open 状态切换）。
 * @returns 会议列表、统计、CRUD 操作及评论弹窗状态。
 */
export const useMeetingManage = (active: boolean): MeetingManageState => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data = [],
    refetch: refetchMeetings,
    isFetching: loading,
  } = useAtomValue(AllMeetingAtom);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentMeetingTitle, setCommentMeetingTitle] = useState("");
  const [comments, setComments] = useState<MeetingComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    await refetchMeetings();
  }, [refetchMeetings]);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  /** 审批会议（同意/拒绝），成功后刷新列表 */
  const vet = useCallback(
    async (id: string, status: MeetingDecision): Promise<void> => {
      const scope = requireAccountScope();
      try {
        const response = await vetMeeting(id, status);
        if (!isAccountScopeCurrent(scope)) return;
        if (response.code === 1) {
          await queryClient.invalidateQueries({
            queryKey: allMeetingQueryKey(scope.ownerId),
          });
          message.success("操作成功");
          return;
        }
        message.error(response.message);
      } catch {
        if (!isAccountScopeCurrent(scope)) return;
        message.error("操作失败，请稍后重试");
      }
    },
    [],
  );

  /**
   * 删除会议并刷新缓存，失败继续抛出以保留共享确认框。
   * @param id 待删除的会议 ID。
   * @returns 删除及缓存刷新完成的 Promise。
   */
  const remove = useCallback(
    async (id: string): Promise<void> => {
      const scope = requireAccountScope();
      try {
        const response = await deleteMeeting(id);
        if (!isAccountScopeCurrent(scope)) return;
        if (response.code === 1) {
          await queryClient.invalidateQueries({
            queryKey: allMeetingQueryKey(scope.ownerId),
          });
          await queryClient.invalidateQueries({
            queryKey: recentMeetingQueryKey(scope.ownerId),
          });
          message.success("会议已删除");
          return;
        }
        throw new Error(response.message || "会议删除失败，请稍后重试");
      } catch (error) {
        if (!isAccountScopeCurrent(scope)) return;
        message.error(error instanceof Error ? error.message : "会议删除失败，请稍后重试");
        throw error;
      }
    },
    [],
  );

  /** 跳转到会议房间页面 */
  const join = useCallback(
    (id: string): void => {
      navigate(`/meeting/${id}`);
    },
    [navigate],
  );

  /**
   * 打开评论弹窗并加载指定会议的评论列表。
   * @param meeting 要查看评论的会议。
   */
  const viewComments = useCallback(
    async (meeting: MeetingType): Promise<void> => {
      const scope = requireAccountScope();
      setCommentLoading(true);
      setCommentMeetingTitle(meeting.title || "未命名会议");
      setCommentModalOpen(true);

      try {
        const response = await getMeetingComments(meeting._id);
        if (!isAccountScopeCurrent(scope)) return;
        if (response.code === 1) {
          setComments(response.data || []);
          return;
        }
        setComments([]);
        message.error(response.message);
      } catch {
        if (!isAccountScopeCurrent(scope)) return;
        setComments([]);
        message.error("评论加载失败，请稍后重试");
      } finally {
        if (isAccountScopeCurrent(scope)) setCommentLoading(false);
      }
    },
    [],
  );

  /** 关闭评论弹窗并清空缓存 */
  const closeComments = useCallback((): void => {
    setCommentModalOpen(false);
    setComments([]);
  }, []);

  /** 基于当前数据计算待审批/已结束/总数 */
  const stats = useMemo<MeetingStats>(() => {
    const pending = data.filter(
      (meeting) => meeting.status === "unreviewd",
    ).length;
    const ended = data.filter((meeting) => meeting.endedAt).length;
    return { total: data.length, pending, ended };
  }, [data]);

  return {
    meetings: data,
    loading,
    currentUserId: user?.id,
    stats,
    refresh,
    vet,
    remove,
    join,
    viewComments,
    comments,
    commentLoading,
    commentModalOpen,
    commentMeetingTitle,
    closeComments,
  };
};
