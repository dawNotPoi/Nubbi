import { Modal } from "@/component/UI/Dialog";
import { useAuth } from "@/hooks/useAuth";
import { createMeetingAtom } from "@/store/atom/meetingAtom";
import { DatePicker, Input, message, Select } from "antd";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { useEffect, useState, type ReactElement } from "react";

type CreateMeetingModalProps = {
  open: boolean;
  onClose: () => void;
};

type MeetingFormData = {
  title: string;
  startTime: number;
  duration: number;
  password: string;
};

/**
 * 渲染可复用的创建会议弹窗，并在打开时重置默认表单值。
 * @param open 弹窗是否打开。
 * @param onClose 关闭弹窗的回调。
 * @returns 创建会议弹窗。
 */
export const CreateMeetingModal = ({
  open,
  onClose,
}: CreateMeetingModalProps): ReactElement => {
  const { user } = useAuth();
  const defaultTitle = `${user?.name || "我"}的会议`;
  const createMeetingMutation = useAtomValue(createMeetingAtom);
  const [formData, setFormData] = useState<MeetingFormData>({
    title: defaultTitle,
    startTime: dayjs().valueOf(),
    duration: 30,
    password: "",
  });

  useEffect(() => {
    if (!open) return;

    setFormData({
      title: defaultTitle,
      startTime: dayjs().valueOf(),
      duration: 30,
      password: "",
    });
  }, [defaultTitle, open]);

  /**
   * 提交会议并根据服务端结果反馈，同时由 mutation 刷新会议列表缓存。
   * @returns 无返回值。
   */
  const handleCreate = (): void => {
    createMeetingMutation.mutate(formData, {
      onError: () => message.error("网络异常"),
      onSuccess: (response) => {
        if (response.code === 1) {
          message.success("创建会议成功");
          onClose();
          return;
        }

        message.error(response.message || "创建会议失败");
      },
    });
  };

  return (
    <Modal
      className="md:!mt-[50vh] md:!w-[440px] md:!-translate-y-1/2 md:!rounded-xl"
      onCancel={onClose}
      onOk={handleCreate}
      okText="创建会议"
      open={open}
      showClose
      title="创建会议"
    >
      <form className="space-y-4 pb-2 pt-4">
        <label className="grid gap-2 text-sm text-text-muted" htmlFor="meeting-title">
          会议标题
          <Input
            id="meeting-title"
            onChange={(event) =>
              setFormData((value) => ({ ...value, title: event.target.value }))
            }
            placeholder="请输入会议标题"
            value={formData.title}
          />
        </label>

        <label className="grid gap-2 text-sm text-text-muted" htmlFor="meeting-start-time">
          开始时间
          <DatePicker
            className="w-full"
            id="meeting-start-time"
            onChange={(value) => {
              if (!value) return;
              setFormData((current) => ({
                ...current,
                startTime: value.valueOf(),
              }));
            }}
            showTime
            value={dayjs(formData.startTime)}
          />
        </label>

        <label className="grid gap-2 text-sm text-text-muted" htmlFor="meeting-duration">
          会议时长
          <Select
            id="meeting-duration"
            onChange={(duration) =>
              setFormData((value) => ({ ...value, duration }))
            }
            options={[
              { label: "30 分钟", value: 30 },
              { label: "45 分钟", value: 45 },
              { label: "1 小时", value: 60 },
              { label: "2 小时", value: 120 },
            ]}
            value={formData.duration}
          />
        </label>

        <label className="grid gap-2 text-sm text-text-muted" htmlFor="meeting-password">
          入会密码（可选）
          <Input.Password
            id="meeting-password"
            onChange={(event) =>
              setFormData((value) => ({
                ...value,
                password: event.target.value,
              }))
            }
            placeholder="留空表示无需密码"
            value={formData.password}
          />
        </label>
      </form>
    </Modal>
  );
};
