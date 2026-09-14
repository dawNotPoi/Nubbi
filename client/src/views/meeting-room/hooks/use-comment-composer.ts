import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MutableRefObject,
} from "react";
import {
  getMentionMatch,
  getMentionSuggestions,
  getMentionUsers,
  type MentionUser,
} from "../helpers/comment-panel";
import type { VideoRoomUser } from "../types";

type UseCommentComposerOptions = {
  currentUserName: string;
  currentUserAvatar: string;
  roomUsers: VideoRoomUser[];
  onSendComment: (content: string) => Promise<boolean>;
};

export type CommentComposerResult = {
  draft: string;
  sending: boolean;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  mentionSuggestions: MentionUser[];
  activeMentionIndex: number;
  showMentionSuggestions: boolean;
  updateDraft: (draft: string, cursorIndex: number) => void;
  updateCursor: (cursorIndex: number) => void;
  applyMention: (user: MentionUser) => void;
  handleKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  send: () => Promise<void>;
};

export const useCommentComposer = ({
  currentUserName,
  currentUserAvatar,
  roomUsers,
  onSendComment,
}: UseCommentComposerOptions): CommentComposerResult => {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionUsers = useMemo(
    () =>
      getMentionUsers(
        currentUserName,
        currentUserAvatar,
        roomUsers,
      ),
    [currentUserAvatar, currentUserName, roomUsers],
  );
  const mentionMatch = useMemo(
    () => getMentionMatch(draft, cursorIndex),
    [cursorIndex, draft],
  );
  const mentionSuggestions = useMemo(
    () => getMentionSuggestions(mentionUsers, mentionMatch),
    [mentionMatch, mentionUsers],
  );
  const showMentionSuggestions = Boolean(
    mentionMatch && mentionSuggestions.length,
  );

  const send = useCallback(async (): Promise<void> => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const sent = await onSendComment(content);
      if (sent) setDraft("");
    } finally {
      setSending(false);
    }
  }, [draft, onSendComment, sending]);

  const updateDraft = useCallback(
    (nextDraft: string, nextCursorIndex: number): void => {
      setDraft(nextDraft);
      setCursorIndex(nextCursorIndex);
    },
    [],
  );

  const updateCursor = useCallback((nextCursorIndex: number): void => {
    setCursorIndex(nextCursorIndex);
  }, []);

  const applyMention = useCallback(
    (user: MentionUser): void => {
      if (!mentionMatch) return;
      const nextDraft =
        `${draft.slice(0, mentionMatch.start)}@${user.name} ${draft.slice(mentionMatch.end)}`;
      setDraft(nextDraft);
      setActiveMentionIndex(0);
      window.requestAnimationFrame(() => {
        const nextCursor = mentionMatch.start + user.name.length + 2;
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(nextCursor, nextCursor);
        setCursorIndex(nextCursor);
      });
    },
    [draft, mentionMatch],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (showMentionSuggestions) {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveMentionIndex((previous) =>
            previous >= mentionSuggestions.length - 1 ? 0 : previous + 1,
          );
          return;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveMentionIndex((previous) =>
            previous <= 0 ? mentionSuggestions.length - 1 : previous - 1,
          );
          return;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          applyMention(mentionSuggestions[activeMentionIndex]);
          return;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          setCursorIndex(0);
          return;
        }
      }
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void send();
      }
    },
    [
      activeMentionIndex,
      applyMention,
      mentionSuggestions,
      send,
      showMentionSuggestions,
    ],
  );

  useEffect(() => {
    setActiveMentionIndex(0);
  }, [mentionMatch?.keyword]);

  return {
    draft,
    sending,
    textareaRef,
    mentionSuggestions,
    activeMentionIndex,
    showMentionSuggestions,
    updateDraft,
    updateCursor,
    applyMention,
    handleKeyDown,
    send,
  };
};
