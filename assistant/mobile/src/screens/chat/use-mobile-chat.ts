import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  resolveApproval,
  stopGeneration,
  streamMessage,
} from "../../api";
import type {
  ApprovalRequest,
  Conversation,
  ConversationSummary,
  Message,
  MessagePart,
} from "../../types";
import { applyEvent } from "./event-reducer";

/**
 * 生成过程中的临时消息：尚未落库，ID 用本地时间戳区分，发送完成后被服务端数据替换。
 * @param role 消息角色（用户或助手）。
 * @param parts 消息内容块列表。
 * @returns 带临时 ID 的消息对象。
 */
const temporaryMessage = (role: Message["role"], parts: MessagePart[]): Message => ({
  id: `temp-${Date.now()}-${role}`,
  role,
  parts,
  createdAt: new Date().toISOString(),
});

export type MobileChatState = {
  conversations: ConversationSummary[];
  current: Conversation | null;
  messages: Message[];
  loading: boolean;
  generating: boolean;
  error: string;
  approval: ApprovalRequest | null;
  selectConversation: (id?: string) => Promise<void>;
  send: (content: string) => Promise<void>;
  stop: () => Promise<void>;
  decideApproval: (approved: boolean) => Promise<void>;
  remove: (conversation: ConversationSummary) => void;
};

/**
 * 移动端聊天页的聚合状态：会话列表、当前对话、消息流与生成控制。
 * @param baseUrl Assistant API 基础地址。
 * @returns 聊天所需的状态与操作（选择会话、发送、停止、审批、删除）。
 */
export const useMobileChat = (baseUrl: string): MobileChatState => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [current, setCurrent] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  // 保存当前请求的 AbortController，供“停止生成”与卸载时中断网络请求。
  const abortRef = useRef<AbortController | null>(null);

  /**
   * 重新拉取会话列表并更新状态。
   * @returns 拉取到的最新会话列表。
   */
  const refresh = useCallback(async (): Promise<ConversationSummary[]> => {
    const result = await listConversations(baseUrl);
    setConversations(result);
    return result;
  }, [baseUrl]);

  /**
   * 选择并加载指定对话；不传 ID 时清空当前对话与消息。
   * @param id 对话的唯一 ID，可空。
   * @returns 加载完成后的 Promise。
   */
  const selectConversation = useCallback(async (id?: string): Promise<void> => {
    setError("");
    if (!id) {
      setCurrent(null);
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const conversation = await getConversation(baseUrl, id);
      setCurrent(conversation);
      setMessages(conversation.messages);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加载对话失败");
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  // 首次进入：拉取会话列表并自动打开最近一个对话；卸载时中止进行中的请求。
  useEffect(() => {
    let active = true;
    void refresh()
      .then(async (items) => {
        if (active && items[0]) await selectConversation(items[0].id);
      })
      .catch((caught: unknown) => active && setError(
        caught instanceof Error ? caught.message : "连接 Assistant API 失败",
      ))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [refresh, selectConversation]);

  /**
   * 发送一条消息：必要时先建对话，随后流式接收助手回复。
   * @param content 用户输入的文本内容。
   * @returns 发送流程完成后的 Promise。
   */
  const send = async (content: string): Promise<void> => {
    if (!content || generating) return;
    setError("");
    setGenerating(true);
    let conversation = current;
    try {
      // 没有当前对话时先创建；随后先渲染临时消息，再开始流式接收。
      if (!conversation) {
        conversation = await createConversation(baseUrl);
        setCurrent(conversation);
      }
      const userMessage = temporaryMessage("user", [{ type: "text", text: content }]);
      const assistantMessage = temporaryMessage("assistant", []);
      setMessages((items) => [...items, userMessage, assistantMessage]);
      const controller = new AbortController();
      abortRef.current = controller;
      await streamMessage({
        baseUrl,
        conversationId: conversation.id,
        content,
        signal: controller.signal,
        onEvent: (event) => {
          // 审批弹窗由审批事件驱动；事件持续累积到临时助手消息上。
          if (event.type === "approval-request") setApproval(event);
          if (event.type === "approval-resolved") setApproval((item) =>
            item?.approvalId === event.approvalId ? null : item);
          setMessages((items) => items.map((message) =>
            message.id === assistantMessage.id ? applyEvent(message, event) : message));
        },
      });
      // 流结束后刷新会话列表，拿到最新标题与顺序。
      await refresh();
    } catch (caught) {
      // 用户主动中止不提示错误。
      if (!abortRef.current?.signal.aborted) {
        setError(caught instanceof Error ? caught.message : "发送失败");
      }
    } finally {
      abortRef.current = null;
      setApproval(null);
      setGenerating(false);
    }
  };

  /**
   * 停止当前生成：先中止本地 SSE 连接，再通知服务端停止 Run。
   * @returns 停止流程完成后的 Promise。
   */
  const stop = async (): Promise<void> => {
    // 先本地中止 SSE 连接，再通知服务端停止 Run（清理模型调用）。
    abortRef.current?.abort();
    setApproval(null);
    if (current) await stopGeneration(baseUrl, current.id).catch(() => undefined);
    setGenerating(false);
  };

  /**
   * 提交当前工具审批的决定。
   * @param approved 是否允许本次工具调用。
   * @returns 提交完成后的 Promise。
   */
  const decideApproval = async (approved: boolean): Promise<void> => {
    const currentApproval = approval;
    if (!currentApproval) return;
    setApproval(null);
    try {
      await resolveApproval(baseUrl, currentApproval.approvalId, approved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提交审批失败");
    }
  };

  /**
   * 删除一个会话（带确认弹窗），删除成功后刷新列表。
   * @param conversation 要删除的会话摘要。
   * @returns 无返回值。
   */
  const remove = (conversation: ConversationSummary): void => {
    Alert.alert("删除对话", `确认删除“${conversation.title}”？`, [
      { text: "取消", style: "cancel" },
      { text: "删除", style: "destructive", onPress: () => void deleteConversation(baseUrl, conversation.id)
        .then(refresh)
        .then(async (items) => {
          if (current?.id === conversation.id) await selectConversation(items[0]?.id);
        })
        .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : "删除失败")) },
    ]);
  };

  return {
    conversations, current, messages, loading, generating, error, approval,
    selectConversation, send, stop, decideApproval, remove,
  };
};
