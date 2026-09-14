import {
  deleteMeeting,
  getMeetingComments,
  vetMeeting,
  type MeetingComment,
  type MeetingType,
} from "@/api/meeting";
import { queryClient } from "@/AppProvider";
import { useAuth } from "@/hooks/useAuth";
import { AllMeetingAtom } from "@/store/atom/meetingAtom";
import { App } from "antd";
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

export const useMeetingManage = (active: boolean): MeetingManageState => {
  const { message } = App.useApp();
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

  const vet = useCallback(
    async (id: string, status: MeetingDecision): Promise<void> => {
      try {
        const response = await vetMeeting(id, status);
        if (response.code === 1) {
          await queryClient.invalidateQueries({ queryKey: ["allMeeting"] });
          message.success("操作成功");
          return;
        }
        message.error(response.message);
      } catch {
        message.error("操作失败，请稍后重试");
      }
    },
    [message],
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        const response = await deleteMeeting(id);
        if (response.code === 1) {
          await queryClient.invalidateQueries({ queryKey: ["allMeeting"] });
          await queryClient.invalidateQueries({ queryKey: ["meeting"] });
          message.success("会议已删除");
          return;
        }
        message.error(response.message);
      } catch {
        message.error("会议删除失败，请稍后重试");
      }
    },
    [message],
  );

  const join = useCallback(
    (id: string): void => {
      navigate(`/meeting/${id}`);
    },
    [navigate],
  );

  const viewComments = useCallback(
    async (meeting: MeetingType): Promise<void> => {
      setCommentLoading(true);
      setCommentMeetingTitle(meeting.title || "未命名会议");
      setCommentModalOpen(true);

      try {
        const response = await getMeetingComments(meeting._id);
        if (response.code === 1) {
          setComments(response.data || []);
          return;
        }
        setComments([]);
        message.error(response.message);
      } catch {
        setComments([]);
        message.error("评论加载失败，请稍后重试");
      } finally {
        setCommentLoading(false);
      }
    },
    [message],
  );

  const closeComments = useCallback((): void => {
    setCommentModalOpen(false);
    setComments([]);
  }, []);

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
