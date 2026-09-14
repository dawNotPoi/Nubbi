import { useCallback, useEffect, useRef, useState } from "react";
import type { CommentSendOutcome } from "../types";

/** 当前会议的共享草稿与发送操作；独立于聊天面板的挂载周期。 */
export type MeetingChat = {
  draft: string;
  sending: boolean;
  feedback: CommentSendOutcome | null;
  needsResendConfirmation: boolean;
  updateDraft: (draft: string) => void;
  send: () => Promise<void>;
  confirmResend: () => Promise<void>;
};

const MAX_COMMENT_LENGTH = 2000;

/**
 * 两个输入入口共用草稿和同步发送锁；只在房间页面卸载时释放。
 * @param sendComment 不带自动重试的服务端写入操作。
 * @returns 可交给快捷输入与完整聊天面板的共享状态。
 */
export function useMeetingChat(sendComment: (content: string) => Promise<CommentSendOutcome>): MeetingChat {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<CommentSendOutcome | null>(null);
  const draftRef = useRef("");
  const draftRevision = useRef(0);
  const sendingRef = useRef(false);
  const uncertainContent = useRef<string | null>(null);
  const lifecycleVersion = useRef(0);

  useEffect(() => () => { lifecycleVersion.current++; }, []);

  /** @param nextDraft 输入框最新内容。@returns 无；编辑版本防止旧请求清除新草稿。 */
  const updateDraft = useCallback((nextDraft: string): void => {
    draftRef.current = nextDraft;
    draftRevision.current++;
    setDraft(nextDraft);
  }, []);

  /** @returns 发送结束；未确认的相同内容必须走显式确认入口，不自动重试。 */
  const send = useCallback(async (): Promise<void> => {
    const content = draftRef.current.trim();
    if (!content || sendingRef.current || uncertainContent.current === content) return;
    if (content.length > MAX_COMMENT_LENGTH) {
      setFeedback({ status: "failed", message: "消息不能超过 2000 字，请缩短后再发送。" });
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setFeedback(null);
    const sentRevision = draftRevision.current;
    const version = lifecycleVersion.current;
    let outcome: CommentSendOutcome;
    try {
      outcome = await sendComment(content);
    } catch {
      // 无法确定异常发生在服务端写入前还是写入后，不将它误报为确定未发送。
      outcome = { status: "uncertain", message: "发送结果未确认。草稿已保留，请先核对聊天记录。" };
    }
    if (version !== lifecycleVersion.current) return;

    uncertainContent.current = outcome.status === "uncertain" ? content : null;
    if (outcome.status === "sent" && draftRevision.current === sentRevision) updateDraft("");
    setFeedback(outcome);
    sendingRef.current = false;
    setSending(false);
  }, [sendComment, updateDraft]);

  /** @returns 用户核对记录后的单次重发结束；点击同一按钮不能绕过在途锁。 */
  const confirmResend = useCallback(async (): Promise<void> => {
    if (sendingRef.current || uncertainContent.current !== draftRef.current.trim()) return;
    uncertainContent.current = null;
    await send();
  }, [send]);

  return {
    draft,
    sending,
    feedback,
    needsResendConfirmation: uncertainContent.current !== null && uncertainContent.current === draft.trim(),
    updateDraft,
    send,
    confirmResend,
  };
}
