import { useEffect, useMemo, useSyncExternalStore } from "react";
import { Alert } from "react-native";
import { fetch } from "expo/fetch";
import { ChatSession, createAssistantClient, type ChatViewState } from "@nubbi/assistant-shared/client";
import type { ConversationSummary } from "../../types.ts";

/** 移动端保留原生删除确认，其他业务行为与 Web 一致。 */
export type MobileChatState = ChatViewState &
  Pick<ChatSession, "selectConversation" | "sendMessage" | "stopGeneration" | "decideApproval"> & {
    deleteConversation: (conversation: ConversationSummary) => void;
  };

/**
 * 为移动端注入 Expo 网络传输与 React 订阅。
 * @param assistantApiBaseUrl Assistant 服务地址。
 * @returns 聊天状态及原生交互动作。
 */
export function useMobileChat(assistantApiBaseUrl: string): MobileChatState {
  const session = useMemo(
    () => new ChatSession(createAssistantClient({ assistantApiBaseUrl, fetchResponse: fetch })),
    [assistantApiBaseUrl],
  );
  const state = useSyncExternalStore(session.store.subscribe, session.store.getSnapshot);
  useEffect(() => {
    void session.initialize(true);
    return () => session.dispose();
  }, [session]);
  /** 删除确认只属于移动 UI，不进入共享业务状态机。 */
  const deleteConversation = (conversation: ConversationSummary): void => {
    Alert.alert("删除对话", `确认删除“${conversation.title}”？`, [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          void session
            .deleteConversation(conversation.id)
            .then(async () => {
              const snapshot = session.store.getSnapshot();
              if (!snapshot.selectedConversation) await session.selectConversation(snapshot.conversations[0]?.id);
            })
            .catch((error: unknown) => Alert.alert("删除失败", error instanceof Error ? error.message : "请求失败"));
        },
      },
    ]);
  };
  return {
    ...state,
    selectConversation: session.selectConversation,
    sendMessage: session.sendMessage,
    stopGeneration: session.stopGeneration,
    decideApproval: session.decideApproval,
    deleteConversation,
  };
}
