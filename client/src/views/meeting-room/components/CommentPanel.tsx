import { MessageSquareText, Sparkles, X } from "lucide-react";
import type { ReactElement } from "react";
import type { MeetingComment, VideoRoomUser } from "../types";
import CommentComposer from "./CommentComposer";
import CommentList from "./CommentList";

type CommentPanelProps = {
  meetingTitle?: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar?: string;
  roomUsers: VideoRoomUser[];
  comments: MeetingComment[];
  onClose?: () => void;
  onSendComment: (content: string) => Promise<boolean>;
};

export default function CommentPanel({
  meetingTitle = "",
  currentUserId,
  currentUserName,
  currentUserAvatar = "",
  roomUsers,
  comments,
  onClose,
  onSendComment,
}: CommentPanelProps): ReactElement {
  return (
    <aside className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 flex max-h-[76dvh] shrink-0 flex-col overflow-hidden rounded-t-3xl border border-border-row bg-bg-panel shadow-2xl md:static md:h-full md:max-h-none md:w-[360px] md:rounded-l-3xl md:rounded-tr-none md:border-y-0 md:border-r-0 md:shadow-none">
      <header className="flex items-center justify-between border-b border-border-row px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white text-text-muted shadow-sm">
            <MessageSquareText className="text-lg" />
          </div>
          <div>
            <div className="text-sm font-semibold text-text-primary">评论</div>
            <div className="text-xs text-text-muted">
              {meetingTitle || "未命名会议"}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="rounded-full bg-white px-3 py-1 text-xs text-text-muted shadow-sm">
            {comments.length} 条
          </div>
          <button
            aria-label="关闭评论"
            className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-bg-hover"
            onClick={onClose}
            type="button"
          >
            <X className="size-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-border-row bg-white/90 px-4 py-3 text-sm text-text-muted shadow-sm">
          <Sparkles className="shrink-0 text-text-muted" />
          <span>建议把结论、待办和问题都留在这里，方便会后回看。</span>
        </div>
        <div className="flex flex-col gap-4">
          <CommentList
            comments={comments}
            currentUserId={currentUserId}
          />
        </div>
      </div>

      <CommentComposer
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        roomUsers={roomUsers}
        onSendComment={onSendComment}
      />
    </aside>
  );
}
