import { useCallback, useEffect, useRef, useState } from "react";

export type MeetingPanelsResult = {
  isCommentOpen: boolean;
  isParticipantOpen: boolean;
  unreadCommentCount: number;
  closeComment: () => void;
  closeParticipants: () => void;
  toggleComment: () => void;
  toggleParticipants: () => void;
};

export const useMeetingPanels = (
  commentCount: number,
): MeetingPanelsResult => {
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const [isParticipantOpen, setIsParticipantOpen] = useState(false);
  const [unreadCommentCount, setUnreadCommentCount] = useState(0);
  const previousCommentCountRef = useRef(0);

  useEffect(() => {
    if (isCommentOpen) {
      setUnreadCommentCount(0);
      previousCommentCountRef.current = commentCount;
      return;
    }

    const nextUnreadCount = commentCount - previousCommentCountRef.current;
    if (nextUnreadCount > 0) {
      setUnreadCommentCount((previous) => previous + nextUnreadCount);
    }
    previousCommentCountRef.current = commentCount;
  }, [commentCount, isCommentOpen]);

  const closeComment = useCallback((): void => {
    setIsCommentOpen(false);
  }, []);

  const closeParticipants = useCallback((): void => {
    setIsParticipantOpen(false);
  }, []);

  const toggleComment = useCallback((): void => {
    setIsCommentOpen((previous) => {
      if (!previous) setIsParticipantOpen(false);
      return !previous;
    });
  }, []);

  const toggleParticipants = useCallback((): void => {
    setIsParticipantOpen((previous) => {
      if (!previous) setIsCommentOpen(false);
      return !previous;
    });
  }, []);

  return {
    isCommentOpen,
    isParticipantOpen,
    unreadCommentCount,
    closeComment,
    closeParticipants,
    toggleComment,
    toggleParticipants,
  };
};
