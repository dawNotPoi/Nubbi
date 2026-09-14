import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { MeetingComment } from "../types";

/** 聊天记录滚动控制，不管理草稿或网络请求。 */
type CommentScroll = {
  scrollRef: RefObject<HTMLDivElement | null>;
  unreadCount: number;
  onScroll: () => void;
  showLatest: () => void;
};

const BOTTOM_THRESHOLD_PX = 48;

/**
 * 查看历史时保持位置，只有正在跟随末尾时才自动展示新消息。
 * @param comments 按时间排序并按 ID 去重后的消息。
 * @returns 滚动容器引用、新消息计数与手动回到底部操作。
 */
export function useCommentScroll(comments: MeetingComment[]): CommentScroll {
  const scrollRef = useRef<HTMLDivElement>(null);
  const followingLatest = useRef(true);
  const previousIds = useRef<string[]>([]);
  const previousHeight = useRef(0);
  const [unreadCount, setUnreadCount] = useState(0);

  /** @returns 无；用户显式查看最新记录后重新启用跟随。 */
  const showLatest = useCallback((): void => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    followingLatest.current = true;
    setUnreadCount(0);
  }, []);

  /** @returns 无；滚动到底部才清除未读提示，向上查看历史不抢位置。 */
  const onScroll = useCallback((): void => {
    const container = scrollRef.current;
    if (!container) return;
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
    followingLatest.current = distance <= BOTTOM_THRESHOLD_PX;
    if (followingLatest.current) setUnreadCount(0);
  }, []);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const previousLastId = previousIds.current.at(-1);
    const previousLastIndex = comments.findIndex((comment) => comment._id === previousLastId);
    const knownIds = new Set(previousIds.current);
    const appendedComments = previousLastIndex < 0 ? [] : comments.slice(previousLastIndex + 1)
      .filter((comment) => !knownIds.has(comment._id));

    if (followingLatest.current) {
      showLatest();
    } else if (appendedComments.length) {
      setUnreadCount((count) => count + appendedComments.length);
    } else if (previousLastId && previousLastIndex >= 0 && comments.length > previousIds.current.length) {
      // 历史快照只在前方补入消息时，补偿高度差，保持原来的阅读位置。
      container.scrollTop += container.scrollHeight - previousHeight.current;
    }
    previousIds.current = comments.map((comment) => comment._id);
    previousHeight.current = container.scrollHeight;
  }, [comments, showLatest]);

  return { scrollRef, unreadCount, onScroll, showLatest };
}
