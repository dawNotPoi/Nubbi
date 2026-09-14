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

// 生成过程中的临时消息：尚未落库，ID 用本地时间戳区分，发送完成后被服务端数据替换。
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

  const refresh = useCallback(async (): Promise<ConversationSummary[]> => {
    const result = await listConversations(baseUrl);
    setConversations(result);
    return result;
  }, [baseUrl]);

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

  const stop = async (): Promise<void> => {
    // 先本地中止 SSE 连接，再通知服务端停止 Run（清理模型调用）。
    abortRef.current?.abort();
    setApproval(null);
    if (current) await stopGeneration(baseUrl, current.id).catch(() => undefined);
    setGenerating(false);
  };

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
