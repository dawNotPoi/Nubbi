import { useCallback, useEffect, useRef, useState } from "react";
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  resolveApproval,
  stopGeneration,
  streamMessage,
} from "./api";
import type {
  ApprovalRequest,
  Conversation,
  ConversationSummary,
  Message,
  MessagePart,
  StreamEvent,
} from "./types";

/**
 * 生成过程中的临时消息：发送完成前占位展示，结束后用服务端数据替换。
 * @param role 消息角色（用户或助手）。
 * @param parts 消息内容块列表。
 * @returns 带临时 ID 的消息对象。
 */
const temporaryMessage = (role: Message["role"], parts: MessagePart[]): Message => ({
  id: `temporary-${role}-${Date.now()}`,
  role,
  parts,
  createdAt: new Date().toISOString(),
});

/**
 * 把单个 SSE 事件增量折叠进助手消息的 parts 数组。
 * @param parts 当前累积的 parts 数组。
 * @param event 收到的单个 SSE 事件。
 * @returns 应用事件后的新 parts 数组。
 */
const reduceEvent = (parts: MessagePart[], event: StreamEvent): MessagePart[] => {
  if (event.type === "text-delta") {
    const last = parts.at(-1);
    return last?.type === "text"
      ? [...parts.slice(0, -1), { ...last, text: last.text + event.text }]
      : [...parts, { type: "text", text: event.text }];
  }
  if (event.type === "skill-active") {
    return [...parts, { type: "skill", name: event.name, description: event.description }];
  }
  if (event.type === "tool-start") {
    return [...parts, {
      type: "tool",
      server: event.server,
      tool: event.tool,
      arguments: event.arguments,
      result: "",
      status: "running",
    }];
  }
  if (event.type === "tool-result") {
    let index = -1;
    for (let candidate = parts.length - 1; candidate >= 0; candidate -= 1) {
      const part = parts[candidate];
      if (part?.type === "tool" && part.server === event.server
        && part.tool === event.tool && part.status === "running") {
        index = candidate;
        break;
      }
    }
    return parts.map((part, partIndex) =>
      partIndex === index && part.type === "tool"
        ? { ...part, result: event.result, status: "done" }
        : part,
    );
  }
  return event.type === "error"
    ? [...parts, { type: "error", message: event.message }]
    : parts;
};

/**
 * Web 聊天页的聚合状态：会话列表、当前对话、消息流与生成控制。
 * @returns 聊天所需的状态与操作（选择会话、发送、停止、审批、删除）。
 */
export const useChat = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [current, setCurrent] = useState<Conversation | null>(null);
  // pending 保存正在生成的临时消息（用户 + 助手各一条），结束后清空。
  const [pending, setPending] = useState<Message[]>([]);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 保存当前请求的 AbortController，供“停止生成”与卸载时中断。
  const abortRef = useRef<AbortController | null>(null);

  /**
   * 重新拉取会话列表。
   * @returns 拉取完成后的 Promise。
   */
  const refreshList = useCallback(async () => {
    setConversations(await listConversations());
  }, []);

  // 首次进入拉取会话列表；卸载时中止进行中的请求。
  useEffect(() => {
    void refreshList().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "加载对话失败"),
    ).finally(() => setLoading(false));
    return () => abortRef.current?.abort();
  }, [refreshList]);

  /**
   * 选择并加载指定对话；不传 ID 时清空当前对话。
   * @param id 对话的唯一 ID，可空。
   * @returns 加载完成后的 Promise。
   */
  const select = useCallback(async (id?: string) => {
    setLoading(true);
    setError(null);
    try {
      setCurrent(id ? await getConversation(id) : null);
      setPending([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "加载对话失败");
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 发送一条消息：必要时先建对话，随后流式接收助手回复。
   * @param content 用户输入的文本内容。
   * @returns 发送流程完成后的 Promise。
   */
  const send = useCallback(async (content: string) => {
    if (generating || !content.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const conversation = current ?? await createConversation();
      if (!current) setCurrent(conversation);
      // 先渲染临时消息，再建立 SSE 流持续更新。
      const user = temporaryMessage("user", [{ type: "text", text: content.trim() }]);
      const assistant = temporaryMessage("assistant", []);
      setPending([user, assistant]);
      const controller = new AbortController();
      abortRef.current = controller;
      await streamMessage({
        conversationId: conversation.id,
        content: content.trim(),
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === "approval-request") setApproval(event);
          if (event.type === "approval-resolved") setApproval((item) =>
            item?.approvalId === event.approvalId ? null : item);
          setPending((messages) => messages.map((message) =>
            message.id === assistant.id
              ? { ...message, parts: reduceEvent(message.parts, event) }
              : message));
        },
      });
      // 流结束后拉取服务端保存的完整消息，替换临时消息。
      setCurrent(await getConversation(conversation.id));
      setPending([]);
      await refreshList();
    } catch (caught) {
      // 用户主动中止（AbortError）不提示错误。
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        setError(caught instanceof Error ? caught.message : "发送消息失败");
      }
    } finally {
      abortRef.current = null;
      setApproval(null);
      setGenerating(false);
    }
  }, [current, generating, refreshList]);

  /**
   * 停止当前生成：先中止本地 SSE 连接，再通知服务端停止 Run。
   * @returns 停止流程完成后的 Promise。
   */
  const stop = useCallback(async () => {
    abortRef.current?.abort();
    setApproval(null);
    if (current) await stopGeneration(current.id).catch(() => undefined);
  }, [current]);

  /**
   * 提交当前工具审批的决定。
   * @param approved 是否允许本次工具调用。
   * @returns 提交完成后的 Promise。
   */
  const decideApproval = useCallback(async (approved: boolean) => {
    if (!approval) return;
    const id = approval.approvalId;
    setApproval(null);
    try {
      await resolveApproval(id, approved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "提交审批失败");
    }
  }, [approval]);

  /**
   * 删除指定对话并刷新列表。
   * @param id 对话的唯一 ID。
   * @returns 删除完成后的 Promise。
   */
  const remove = useCallback(async (id: string) => {
    await deleteConversation(id);
    if (current?.id === id) setCurrent(null);
    await refreshList();
  }, [current?.id, refreshList]);

  return {
    conversations,
    current,
    messages: [...(current?.messages ?? []), ...pending],
    approval,
    generating,
    loading,
    error,
    select,
    send,
    stop,
    decideApproval,
    remove,
  };
};
