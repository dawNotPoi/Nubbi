import Image from "@/component/UI/Image";
import type { ReactElement } from "react";
import { formatCommentTime } from "../helpers/comment-panel";
import type { MeetingComment } from "../types";

type CommentListProps = {
  comments: MeetingComment[];
  currentUserId: string;
};

const mentionPattern = /@([^\s@]+)/g;

const renderCommentContent = (
  content: string,
  isSelf: boolean,
): ReactElement[] => {
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
            ? "mx-0.5 rounded-md bg-white/15 px-1.5 py-0.5 font-medium text-blue-100"
            : "mx-0.5 rounded-md bg-accent-bg px-1.5 py-0.5 font-medium text-accent-text"
        }
      >
        @{part}
      </span>
    );
  });
};

export default function CommentList({
  comments,
  currentUserId,
}: CommentListProps): ReactElement {
  if (comments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-toolbar bg-white/70 px-4 py-6 text-center text-sm text-text-subtle">
        暂无评论，开始记录本次会议内容吧。
      </div>
    );
  }

  return (
    <>
      {comments.map((comment) => {
        const isSelf = comment.userId === currentUserId;
        return (
          <article
            key={comment._id}
            className={`flex gap-3 ${isSelf ? "justify-end" : "justify-start"}`}
          >
            {!isSelf && (
              <Image
                src={comment.avatar || ""}
                alt={comment.name}
                className="mt-1 size-8 rounded-full border border-border-row object-cover"
              />
            )}
            <div
              className={`flex max-w-[78%] flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="font-medium text-text-primary">
                  {comment.name}
                </span>
                <span>{formatCommentTime(comment.createdAt)}</span>
              </div>
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${isSelf ? "bg-text-primary text-white" : "border border-border-row bg-white text-text-primary"}`}
              >
                {renderCommentContent(comment.content, isSelf)}
              </div>
            </div>
            {isSelf && (
              <Image
                src={comment.avatar || ""}
                alt={comment.name}
                className="mt-1 size-8 rounded-full border border-border-row object-cover"
              />
            )}
          </article>
        );
      })}
    </>
  );
}
