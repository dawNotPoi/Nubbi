import type { MeetingComment } from "@/api/meeting";
import Image from "@/component/UI/Image";
import { Modal } from "@/component/UI/Dialog";
import { Skeleton } from "antd";
import dayjs from "dayjs";
import type { ReactElement } from "react";

type MeetingCommentsModalProps = {
  open: boolean;
  title: string;
  comments: MeetingComment[];
  loading: boolean;
  onClose: () => void;
};

export const MeetingCommentsModal = ({
  open,
  title,
  comments,
  loading,
  onClose,
}: MeetingCommentsModalProps): ReactElement => (
  <Modal
    open={open}
    onCancel={onClose}
    showClose
    title={`${title} - 评论记录`}
    className="md:!mt-[10vh] md:!w-[min(90vw,480px)]"
  >
    <div className="max-h-[420px] overflow-auto">
      {loading ? (
        <div className="space-y-4 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`comment-skeleton-${i}`} className="flex gap-3">
              <Skeleton.Avatar active size={32} shape="circle" />
              <div className="flex-1">
                <Skeleton active paragraph={{ rows: 1 }} title={{ width: "30%" }} />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-10 text-center text-text-muted">暂无评论</div>
      ) : (
        <div className="divide-y divide-border-row">
          {comments.map((comment, index) => (
            <div key={comment.createdAt || index} className="flex gap-3 py-3">
              <Image
                src={comment.avatar || ""}
                alt={comment.name}
                className="size-8 shrink-0 rounded-full border border-border-row object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-text-primary">
                    {comment.name || "Guest"}
                  </span>
                  <span className="text-text-muted">
                    {dayjs(comment.createdAt).format("MM-DD HH:mm")}
                  </span>
                </div>
                <p className="mt-1 text-sm text-text-primary">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </Modal>
);
