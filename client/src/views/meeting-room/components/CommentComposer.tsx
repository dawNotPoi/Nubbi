import Image from "@/component/UI/Image";
import { SendHorizontal } from "lucide-react";
import type { ReactElement } from "react";
import {
  getCommentAudienceLabel,
  getCommentPlaceholder,
} from "../helpers/comment-panel";
import { useCommentComposer } from "../hooks/use-comment-composer";
import type { VideoRoomUser } from "../types";

type CommentComposerProps = {
  currentUserName: string;
  currentUserAvatar: string;
  roomUsers: VideoRoomUser[];
  onSendComment: (content: string) => Promise<boolean>;
};

export default function CommentComposer({
  currentUserName,
  currentUserAvatar,
  roomUsers,
  onSendComment,
}: CommentComposerProps): ReactElement {
  const composer = useCommentComposer({
    currentUserName,
    currentUserAvatar,
    roomUsers,
    onSendComment,
  });
  const audienceLabel = getCommentAudienceLabel(roomUsers.length);
  const placeholder = getCommentPlaceholder(roomUsers);

  return (
    <footer className="border-t border-border-row bg-bg-panel px-4 py-3 sm:px-5 sm:py-4">
      <div className="mb-3 text-xs font-medium text-text-muted">
        {audienceLabel}
      </div>
      <div className="relative rounded-2xl border border-border-toolbar bg-white p-3 shadow-sm transition-shadow focus-within:shadow-md">
        {composer.showMentionSuggestions && (
          <div className="absolute bottom-[calc(100%+12px)] left-0 right-0 z-10 overflow-hidden rounded-2xl border border-border-row bg-white shadow-xl">
            <div className="border-b border-bg-selected px-3 py-2 text-xs text-text-muted">
              选择要提及的成员
            </div>
            <ul className="max-h-52 overflow-y-auto py-1">
              {composer.mentionSuggestions.map((user, index) => {
                const active = index === composer.activeMentionIndex;
                return (
                  <li
                    key={`${user.userId}-${user.peerId}`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      composer.applyMention(user);
                    }}
                    className={`mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition ${active ? "bg-bg-selected" : "hover:bg-bg-hover"}`}
                  >
                    <Image
                      src={user.image || ""}
                      alt={user.name}
                      className="size-8 rounded-full border border-border-row object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">
                        {user.name}
                      </div>
                      <div className="truncate text-xs text-text-subtle">
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
          ref={composer.textareaRef}
          value={composer.draft}
          onChange={(event) =>
            composer.updateDraft(
              event.target.value,
              event.target.selectionStart,
            )
          }
          onClick={(event) =>
            composer.updateCursor(event.currentTarget.selectionStart)
          }
          onKeyUp={(event) =>
            composer.updateCursor(event.currentTarget.selectionStart)
          }
          onKeyDown={composer.handleKeyDown}
          rows={4}
          placeholder={placeholder}
          className="w-full resize-none border-none bg-transparent text-sm leading-6 text-text-primary outline-none placeholder:text-text-subtle"
        />
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-text-subtle">
            Enter 发送，Shift + Enter 换行
          </div>
          <button
            type="button"
            disabled={composer.sending}
            onClick={() => void composer.send()}
            className="inline-flex items-center gap-2 rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-text-subtle"
          >
            <SendHorizontal className="text-sm" />
            {composer.sending ? "发送中" : "发送"}
          </button>
        </div>
      </div>
    </footer>
  );
}
