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

const temporaryMessage = (role: Message["role"], parts: MessagePart[]): Message => ({
  id: `temporary-${role}-${Date.now()}`,
  role,
  parts,
  createdAt: new Date().toISOString(),
});

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

export const useChat = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [current, setCurrent] = useState<Conversation | null>(null);
  const [pending, setPending] = useState<Message[]>([]);
  const [approval, setApproval] = useState<ApprovalRequest | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshList = useCallback(async () => {
    setConversations(await listConversations());
  }, []);

  useEffect(() => {
    void refreshList().catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : "加载对话失败"),
    ).finally(() => setLoading(false));
    return () => abortRef.current?.abort();
  }, [refreshList]);

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

  const send = useCallback(async (content: string) => {
    if (generating || !content.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const conversation = current ?? await createConversation();
      if (!current) setCurrent(conversation);
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
      setCurrent(await getConversation(conversation.id));
      setPending([]);
      await refreshList();
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        setError(caught instanceof Error ? caught.message : "发送消息失败");
      }
    } finally {
      abortRef.current = null;
      setApproval(null);
      setGenerating(false);
    }
  }, [current, generating, refreshList]);

  const stop = useCallback(async () => {
    abortRef.current?.abort();
    setApproval(null);
    if (current) await stopGeneration(current.id).catch(() => undefined);
  }, [current]);

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
