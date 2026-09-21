import { Modal } from "@/component/UI/Dialog";
import {
  isAccountScopeCurrent,
  requireAccountScope,
} from "@/features/auth/model/account-scope";
import { useAuth } from "@/hooks/useAuth";
import { createMeetingAtom } from "@/store/atom/meetingAtom";
import { Button, DatePicker, Input, message, Select } from "antd";
import dayjs from "dayjs";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState, type ReactElement } from "react";
import type { MeetingType } from "@/api/meeting";
import { MeetingInvitationButton } from "@/features/meeting/meeting-invitation";

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
  const [createdMeeting, setCreatedMeeting] = useState<MeetingType | null>(null);
  const [creating, setCreating] = useState(false);
  const submittingRef = useRef(false);
  const [formData, setFormData] = useState<MeetingFormData>({
    title: defaultTitle,
    startTime: dayjs().valueOf(),
    duration: 30,
    password: "",
  });

  useEffect(() => {
    if (!open) return;
    setCreatedMeeting(null);

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
  const handleCreate = async (): Promise<void> => {
    if (submittingRef.current) return;
    if (!formData.title.trim()) { message.warning("请输入会议标题"); return; }
    const scope = requireAccountScope();
    submittingRef.current = true; setCreating(true);
    try {
      const response = await createMeetingMutation.mutateAsync({ ...formData, title: formData.title.trim() });
      if (!isAccountScopeCurrent(scope)) return;
      if (response.code !== 1) { message.error(response.message || "创建会议失败"); return; }
      setCreatedMeeting(response.data); message.success("创建会议成功，可以邀请参会了"); onClose();
    } catch {
      if (!isAccountScopeCurrent(scope)) return;
      message.error("创建结果未确认，表单已保留。请先检查会议列表，避免重复创建。");
    } finally {
      if (isAccountScopeCurrent(scope)) {
        submittingRef.current = false;
        setCreating(false);
      }
    }
  };

  return (
    <><Modal
      className="md:!mt-[50vh] md:!w-[440px] md:!-translate-y-1/2 md:!rounded-panel"
      onCancel={() => { if (!creating) onClose(); }}
      maskClosable={!creating}
      open={open}
      showClose={!creating}
      title="创建会议"
    >
      <form className="space-y-4 pb-2 pt-4" onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}>
        <fieldset disabled={creating} className="space-y-4">
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
        </fieldset>
        <div className="flex justify-end gap-2"><Button disabled={creating} onClick={onClose}>取消</Button><Button type="primary" htmlType="submit" loading={creating}>创建会议</Button></div>
      </form>
    </Modal>
    {createdMeeting && <MeetingInvitationButton key={createdMeeting._id} initiallyOpen hideTrigger id={createdMeeting._id} title={createdMeeting.title} startTime={createdMeeting.startTime} />}
    </>
  );
};
