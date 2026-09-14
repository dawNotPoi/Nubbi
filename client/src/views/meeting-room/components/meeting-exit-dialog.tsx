import { Modal } from "@/component/UI/Dialog";
import { Button } from "antd";
import { useState, type ReactElement } from "react";

type MeetingExitDialogProps = { open: boolean; isHost: boolean; busy: boolean; onCancel: () => void; onLeave: () => void; onEnd: () => Promise<void> };

/** @param props 退出、结束及等待状态。@returns 不使用弹窗自动关闭行为的退出确认。 */
export function MeetingExitDialog({ open, isHost, busy, onCancel, onLeave, onEnd }: MeetingExitDialogProps): ReactElement {
  const [confirmEnd, setConfirmEnd] = useState(false);
  return <Modal open={open} title={confirmEnd ? "确认结束所有人的会议？" : "离开会议"}
    maskClosable={!busy} showClose={!busy} onCancel={() => { if (!busy) { setConfirmEnd(false); onCancel(); } }}>
    <div className="space-y-4 py-4 text-sm text-text-primary">
      <p>{confirmEnd ? "所有参会者都将断开连接，该会议不能再次加入。" : "仅自己离开不会结束会议，其他成员可继续交流。"}</p>
      <div className="flex flex-wrap gap-2">
        <Button disabled={busy} onClick={onLeave}>仅我离开</Button>
        {isHost && (confirmEnd
          ? <Button danger loading={busy} onClick={() => void onEnd()}>确认结束所有人</Button>
          : <Button danger onClick={() => setConfirmEnd(true)}>结束所有人…</Button>)}
        <Button disabled={busy} onClick={() => { setConfirmEnd(false); onCancel(); }}>取消</Button>
      </div>
    </div>
  </Modal>;
}
