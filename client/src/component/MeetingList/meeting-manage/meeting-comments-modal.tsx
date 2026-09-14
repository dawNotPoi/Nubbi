import type { MeetingComment } from "@/api/meeting";
import Image from "@/component/UI/Image";
import { List, Modal, Space, Typography } from "antd";
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
    destroyOnClose
    open={open}
    onCancel={onClose}
    footer={null}
    title={`${title} - 评论记录`}
  >
    <List
      className="max-h-[420px] overflow-auto"
      loading={loading}
      dataSource={comments}
      locale={{ emptyText: loading ? "评论加载中..." : "暂无评论" }}
      renderItem={(comment) => (
        <List.Item>
          <List.Item.Meta
            avatar={
              <Image
                src={comment.avatar || ""}
                alt={comment.name}
                className="size-8 rounded-full border border-border-row object-cover"
              />
            }
            title={
              <Space size={8}>
                <span>{comment.name || "Guest"}</span>
                <Typography.Text type="secondary">
                  {dayjs(comment.createdAt).format("MM-DD HH:mm")}
                </Typography.Text>
              </Space>
            }
            description={comment.content}
          />
        </List.Item>
      )}
    />
  </Modal>
);
