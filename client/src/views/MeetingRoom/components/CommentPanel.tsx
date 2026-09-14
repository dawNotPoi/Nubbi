import Image from "@/component/UI/Image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LuMessageSquareText,
  LuSendHorizontal,
  LuSparkles,
} from "react-icons/lu";
import type { MeetingComment, VideoRoomUser } from "../types";

type CommentPanelProps = {
  meetingTitle?: string;
  currentUserName: string;
  currentUserAvatar?: string;
  roomUsers: VideoRoomUser[];
  comments: MeetingComment[];
  onSendComment: (content: string) => Promise<boolean>;
};

const mentionPattern = /@([^\s@]+)/g;

const formatCommentTime = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

const renderCommentContent = (content: string, isSelf: boolean) => {
  const parts = content.split(mentionPattern);

  return parts.map((part, index) => {
    const isMention = index % 2 === 1;

    if (!isMention) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <span
        key={`${part}-${index}`}
        className={
          isSelf
            ? "mx-0.5 rounded-md bg-white/15 px-1.5 py-0.5 font-medium text-[#dbeafe]"
            : "mx-0.5 rounded-md bg-[#e8f0fe] px-1.5 py-0.5 font-medium text-[#315efb]"
        }
      >
        @{part}
      </span>
    );
  });
};

export default function CommentPanel({
  meetingTitle = "",
  currentUserName,
  currentUserAvatar,
  roomUsers,
  comments,
  onSendComment,
}: CommentPanelProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const mentionUsers = useMemo(() => {
    const mergedUsers = [
      {
        peerId: "local-user",
        userId: "local-user",
        roomId: "",
        name: currentUserName,
        image: currentUserAvatar || "",
        email: "",
        isVideoEnabled: false,
        isAudioEnabled: false,
      },
      ...roomUsers,
    ];

    const userMap = new Map<string, VideoRoomUser>();
    mergedUsers.forEach((user) => {
      const key = user.userId || user.peerId || user.name;
      if (!userMap.has(key)) {
        userMap.set(key, user);
      }
    });

    return Array.from(userMap.values());
  }, [currentUserAvatar, currentUserName, roomUsers]);

  const mentionMatch = useMemo(() => {
    const beforeCursor = draft.slice(0, cursorIndex);
    const match = beforeCursor.match(/(^|\s)@([^\s@]*)$/);

    if (!match) return null;

    return {
      keyword: match[2] || "",
      start: beforeCursor.length - match[2].length - 1,
      end: beforeCursor.length,
    };
  }, [cursorIndex, draft]);

  const mentionSuggestions = useMemo(() => {
    if (!mentionMatch) return [];

    const keyword = mentionMatch.keyword.trim().toLowerCase();
    return mentionUsers.filter((user) => {
      if (!keyword) return true;

      return (
        user.name.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword)
      );
    });
  }, [mentionMatch, mentionUsers]);

  const showMentionSuggestions = Boolean(
    mentionMatch && mentionSuggestions.length,
  );

  const audienceLabel = useMemo(() => {
    const total = roomUsers.length + 1;
    return `发送至 会议中的所有人 · ${total} 人`;
  }, [roomUsers.length]);

  const placeholder = useMemo(() => {
    const latestUser = roomUsers[0]?.name;
    if (latestUser) {
      return `输入评论，可 @${latestUser} 或记录会议结论…`;
    }

    return "输入评论，像 Notion 一样沉淀会议记录…";
  }, [roomUsers]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;

    setSending(true);
    const sent = await onSendComment(content);
    setSending(false);

    if (sent) {
      setDraft("");
    }
  };

  const applyMention = (user: VideoRoomUser) => {
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
  };

  useEffect(() => {
    setActiveMentionIndex(0);
  }, [mentionMatch?.keyword]);

  return (
    <aside className="flex h-full w-[360px] shrink-0 flex-col overflow-hidden rounded-l-3xl border-l border-[#e9e9e7] bg-[#fbfbfa]">
      <header className="flex items-center justify-between border-b border-[#ecebe8] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white text-[#6b6b6a] shadow-sm">
            <LuMessageSquareText className="text-lg" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#2f3437]">评论</div>
            <div className="text-xs text-[#8b8b89]">
              {meetingTitle || "未命名会议"}
            </div>
          </div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs text-[#787774] shadow-sm">
          {comments.length} 条
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-[#ecebe8] bg-white/90 px-4 py-3 text-sm text-[#5f5e5b] shadow-sm">
          <LuSparkles className="shrink-0 text-[#7c7c78]" />
          <span>建议把结论、待办和问题都留在这里，方便会后回看。</span>
        </div>

        <div className="flex flex-col gap-4">
          {comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e4e2de] bg-white/70 px-4 py-6 text-center text-sm text-[#9b9a97]">
              暂无评论，开始记录本次会议内容吧。
            </div>
          ) : (
            comments.map((comment) => {
              const isSelf =
                comment.name === currentUserName &&
                comment.avatar === currentUserAvatar;

              return (
                <article
                  key={comment._id}
                  className={`flex gap-3 ${isSelf ? "justify-end" : "justify-start"}`}
                >
                  {!isSelf && (
                    <Image
                      src={comment.avatar || ""}
                      alt={comment.name}
                      className="mt-1 size-8 rounded-full border border-[#ecebe8] object-cover"
                    />
                  )}

                  <div
                    className={`flex max-w-[78%] flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 text-xs text-[#8b8b89]">
                      <span className="font-medium text-[#5b5b57]">
                        {comment.name}
                      </span>
                      <span>{formatCommentTime(comment.createdAt)}</span>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${isSelf ? "bg-[#2f3437] text-white" : "border border-[#ecebe8] bg-white text-[#37352f]"}`}
                    >
                      {renderCommentContent(comment.content, isSelf)}
                    </div>
                  </div>

                  {isSelf && (
                    <Image
                      src={comment.avatar || ""}
                      alt={comment.name}
                      className="mt-1 size-8 rounded-full border border-[#ecebe8] object-cover"
                    />
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      <footer className="border-t border-[#ecebe8] bg-[#fbfbfa] px-5 py-4">
        <div className="mb-3 text-xs font-medium text-[#787774]">
          {audienceLabel}
        </div>
        <div className="relative rounded-2xl border border-[#e7e6e4] bg-white p-3 shadow-sm transition-shadow focus-within:shadow-md">
          {showMentionSuggestions && (
            <div className="absolute bottom-[calc(100%+12px)] left-0 right-0 z-10 overflow-hidden rounded-2xl border border-[#ecebe8] bg-white shadow-xl">
              <div className="border-b border-[#f1f1ef] px-3 py-2 text-xs text-[#8b8b89]">
                选择要提及的成员
              </div>
              <ul className="max-h-52 overflow-y-auto py-1">
                {mentionSuggestions.map((user, index) => {
                  const active = index === activeMentionIndex;

                  return (
                    <li
                      key={`${user.userId}-${user.peerId}`}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyMention(user);
                      }}
                      className={`mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition ${active ? "bg-[#f5f5f4]" : "hover:bg-[#f8f8f7]"}`}
                    >
                      <Image
                        src={user.image || ""}
                        alt={user.name}
                        className="size-8 rounded-full border border-[#ecebe8] object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[#37352f]">
                          {user.name}
                        </div>
                        <div className="truncate text-xs text-[#9b9a97]">
                          @{user.name}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setCursorIndex(event.target.selectionStart);
            }}
            onClick={(event) => setCursorIndex(event.currentTarget.selectionStart)}
            onKeyUp={(event) => setCursorIndex(event.currentTarget.selectionStart)}
            onKeyDown={(event) => {
              if (showMentionSuggestions) {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setActiveMentionIndex((prev) =>
                    prev >= mentionSuggestions.length - 1 ? 0 : prev + 1,
                  );
                  return;
                }

                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setActiveMentionIndex((prev) =>
                    prev <= 0 ? mentionSuggestions.length - 1 : prev - 1,
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
                void handleSend();
              }
            }}
            rows={4}
            placeholder={placeholder}
            className="w-full resize-none border-none bg-transparent text-sm leading-6 text-[#37352f] outline-none placeholder:text-[#9b9a97]"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-[#9b9a97]">
              Enter 发送，Shift + Enter 换行
            </div>
            <button
              type="button"
              disabled={sending}
              onClick={() => void handleSend()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#2f3437] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1f2326] disabled:cursor-not-allowed disabled:bg-[#9b9a97]"
            >
              <LuSendHorizontal className="text-sm" />
              {sending ? "发送中" : "发送"}
            </button>
          </div>
        </div>
      </footer>
    </aside>
  );
}
