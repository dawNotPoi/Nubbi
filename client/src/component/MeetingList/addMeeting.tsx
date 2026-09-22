import { useState, type ReactElement, type ReactNode } from "react";
import { CreateMeetingModal } from "./create-meeting-modal";

/**
 * 保留旧会议入口，并统一到包含校验、缓存刷新和邀请功能的创建流程。
 * @param props 触发创建会议的内容。
 * @returns 创建会议入口及共享业务弹窗。
 */
export default function AddMeeting({ children }: { children: ReactNode }): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div onClick={() => setOpen(true)}>{children}</div>
      <CreateMeetingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
