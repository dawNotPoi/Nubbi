import { queryClient } from "@/AppProvider";
import Image from "@/component/UI/Image";
import { AllMeetingAtom } from "@/store/atom/meetingAtom";
import {
  App,
  Button,
  Empty,
  List,
  Modal,
  Popconfirm,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import clsx from "clsx";
import dayjs from "dayjs";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  memo,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAtomValue } from "jotai";
import { useNavigate } from "react-router-dom";
import {
  deleteMeeting,
  getMeetingComments,
  vetMeeting,
  type MeetingComment,
  type MeetingType,
} from "../../api/meeting";

type MeetingmanageProps = PropsWithChildren<{
  variant?: "modal" | "page";
  className?: string;
}>;

const statusMap = {
  unreviewd: {
    label: "待审批",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: ShieldCheck,
  },
  approved: {
    label: "已通过",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "已拒绝",
    className: "bg-rose-50 text-rose-700 border-rose-200",
    icon: XCircle,
  },
} as const;

const getMeetingTimeRange = (item: MeetingType) => {
  const start = dayjs(item.startTime || item.createdAt);
  const end = start.add(item.duration, "minute");
  return `${start.format("MM-DD HH:mm")} - ${end.format("MM-DD HH:mm")}`;
};

const MeetingStatusTag = ({ meeting }: { meeting: MeetingType }) => {
  if (meeting.endedAt) {
    return (
      <Tag className="rounded-full border-blue-200 bg-blue-50 px-3 py-1 text-blue-700">
        已结束
      </Tag>
    );
  }

  const key = (meeting.status || "approved") as keyof typeof statusMap;
  const config = statusMap[key];

  return (
    <Tag className={clsx("rounded-full border px-3 py-1", config.className)}>
      {config.label}
    </Tag>
  );
};

const MeetingCardSkeleton = () => (
  <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
    <Skeleton active paragraph={{ rows: 3 }} title={{ width: "48%" }} />
  </div>
);

const Meetingmanage = ({
  children,
  variant = "modal",
  className,
}: MeetingmanageProps) => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const {
    data = [],
    refetch: refetchMeetings,
    isFetching: loading,
  } = useAtomValue(AllMeetingAtom);
  const [open, setOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [commentMeetingTitle, setCommentMeetingTitle] = useState("");
  const [comments, setComments] = useState<MeetingComment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);

  const isPage = variant === "page";

  useEffect(() => {
    if (isPage) {
      void refetchMeetings();
      return;
    }

    if (!open) return;
    void refetchMeetings();
  }, [isPage, open, refetchMeetings]);

  const handlerVet = useCallback(
    async (id: string, status: "approved" | "rejected") => {
      const res = await vetMeeting(id, status);
      if (res.code == 1) {
        await queryClient.invalidateQueries({ queryKey: ["allMeeting"] });
        message.success("操作成功");
      } else {
        message.error(res.message);
      }
    },
    [message],
  );

  const handleDeleteMeeting = useCallback(
    async (id: string) => {
      const res = await deleteMeeting(id);
      if (res.code == 1) {
        await queryClient.invalidateQueries({ queryKey: ["allMeeting"] });
        await queryClient.invalidateQueries({ queryKey: ["meeting"] });
        message.success("会议已删除");
      } else {
        message.error(res.message);
      }
    },
    [message],
  );

  const handleViewComments = useCallback(
    async (meeting: MeetingType) => {
      setCommentLoading(true);
      setCommentMeetingTitle(meeting.title || "未命名会议");
      setCommentModalOpen(true);

      const res = await getMeetingComments(meeting._id);
      if (res.code == 1) {
        setComments(res.data || []);
      } else {
        setComments([]);
        message.error(res.message);
      }
      setCommentLoading(false);
    },
    [message],
  );

  const stats = useMemo(() => {
    const total = data.length;
    const pending = data.filter((item) => item.status === "unreviewd").length;
    const ended = data.filter((item) => item.endedAt).length;
    return { total, pending, ended };
  }, [data]);

  const renderActions = useCallback(
    (item: MeetingType) => {
      return (
        <div className="flex flex-wrap items-center gap-2">
          {item.status == "unreviewd" ? (
            <>
              <Button
                type="primary"
                onClick={() => void handlerVet(item._id, "approved")}
              >
                同意
              </Button>
              <Button onClick={() => void handlerVet(item._id, "rejected")}>
                拒绝
              </Button>
            </>
          ) : null}

          {!item.endedAt ? (
            <Button type="primary" onClick={() => navigate(`/meeting/${item._id}`)}>
              加入会议
            </Button>
          ) : null}

          {item.endedAt ? (
            <Button onClick={() => void handleViewComments(item)}>
              查看评论
            </Button>
          ) : null}

          <Popconfirm
            title="删除会议"
            description="删除后会议和评论记录都会被移除，确认继续吗？"
            okText="确认"
            cancelText="取消"
            onConfirm={() => void handleDeleteMeeting(item._id)}
          >
            <Button danger icon={<Trash2 size={14} />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      );
    },
    [handleDeleteMeeting, handleViewComments, handlerVet, navigate],
  );

  const commentEmptyText = useMemo(
    () => (commentLoading ? "评论加载中..." : "暂无评论"),
    [commentLoading],
  );

  const content = (
    <div
      className={clsx(
        isPage && "rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-zinc-900">
            <CalendarDays size={18} />
            <span>会议管理</span>
          </div>
        </div>
        <Button
          icon={<RefreshCw size={14} />}
          onClick={() => void refetchMeetings()}
        >
          刷新
        </Button>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-zinc-50 px-4 py-3">
          <div className="text-xs text-zinc-500">会议总数</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">
            {stats.total}
          </div>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3">
          <div className="text-xs text-amber-700">待审批</div>
          <div className="mt-1 text-2xl font-semibold text-amber-900">
            {stats.pending}
          </div>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3">
          <div className="text-xs text-blue-700">已结束</div>
          <div className="mt-1 text-2xl font-semibold text-blue-900">
            {stats.ended}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <MeetingCardSkeleton key={`meeting-manage-skeleton-${index}`} />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 py-14">
          <Empty description="暂无会议记录" />
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <div
              key={item._id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 transition-colors hover:border-sky-200 hover:bg-sky-50/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-900">
                      {item.title || "未命名会议"}
                    </h3>
                    <MeetingStatusTag meeting={item} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-500">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={14} />
                      {getMeetingTimeRange(item)}
                    </span>
                    {item.endedAt ? (
                      <span className="inline-flex items-center gap-1 text-blue-600">
                        <MessageSquareText size={14} />
                        已于 {dayjs(item.endedAt).format("MM-DD HH:mm")} 结束
                      </span>
                    ) : null}
                  </div>
                </div>
                {renderActions(item)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {isPage ? (
        content
      ) : (
        <>
          <Modal
            destroyOnClose
            open={open}
            onCancel={() => {
              setOpen(false);
            }}
            footer={null}
            width={920}
            title={null}
          >
            <div className="pt-2">{content}</div>
          </Modal>
          <div className="inline-block" onClick={() => setOpen(true)}>
            {children}
          </div>
        </>
      )}

      <Modal
        destroyOnClose
        open={commentModalOpen}
        onCancel={() => {
          setCommentModalOpen(false);
          setComments([]);
        }}
        footer={null}
        title={`${commentMeetingTitle} - 评论记录`}
      >
        <List
          loading={commentLoading}
          dataSource={comments}
          locale={{ emptyText: commentEmptyText }}
          style={{ maxHeight: "420px", overflow: "auto" }}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Image
                    src={item.avatar || ""}
                    alt={item.name}
                    className="size-8 rounded-full object-cover border border-[#ecebe8]"
                  />
                }
                title={
                  <Space size={8}>
                    <span>{item.name || "Guest"}</span>
                    <Typography.Text type="secondary">
                      {dayjs(item.createdAt).format("MM-DD HH:mm")}
                    </Typography.Text>
                  </Space>
                }
                description={item.content}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
};

export default memo(Meetingmanage);
