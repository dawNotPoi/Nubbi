import { Modal } from "@/component/UI/Dialog";
import { Button, Input, message } from "antd";
import { useState, type ReactElement } from "react";
import { buildMeetingInvitation, type MeetingInvitation } from "./invitation";

/** @param props 公开会议信息。@returns 邀请入口及始终可手动复制的邀请文本。 */
export function MeetingInvitationButton(props: MeetingInvitation & { initiallyOpen?: boolean; hideTrigger?: boolean }): ReactElement {
  const [open, setOpen] = useState(props.initiallyOpen ?? false);
  const [copying, setCopying] = useState(false);
  const invitation = buildMeetingInvitation(props, window.location.origin);
  /** 复制失败时保留文本，允许手动选择复制。 */
  const copy = async (): Promise<void> => {
    setCopying(true);
    try { await navigator.clipboard.writeText(invitation); message.success("邀请已复制"); }
    catch { message.warning("无法自动复制，请选中下方邀请文字手动复制。"); }
    finally { setCopying(false); }
  };
  return <>
    {!props.hideTrigger && <Button onClick={() => setOpen(true)}>邀请参会</Button>}
    <Modal open={open} onCancel={() => setOpen(false)} title="邀请参会" showClose className="md:w-[480px]">
      <div className="space-y-3 py-4">
        <Input.TextArea aria-label="会议邀请内容" readOnly value={invitation} autoSize={{ minRows: 5, maxRows: 9 }} onFocus={(event) => event.target.select()} />
        <Button type="primary" loading={copying} onClick={() => void copy()}>复制邀请</Button>
      </div>
    </Modal>
  </>;
}
