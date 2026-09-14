import { useEffect, useMemo, useSyncExternalStore } from "react";
import { ChatSession, createAssistantClient, type ChatViewState } from "@nubbi/assistant-shared/client";

/** Web 聊天状态和业务动作。 */
export type WebChatState = ChatViewState &
  Pick<ChatSession, "userInputResponder" | "modelSelection" | "selectConversation" | "sendMessage" | "stopGeneration" | "decideApproval" | "deleteConversation">;

/**
 * 订阅聊天业务状态，浏览器 Hook 仅管理 React 生命周期。
 * @returns 聊天视图和操作。
 */
export function useChat(): WebChatState {
  const session = useMemo(
    () =>
      new ChatSession(
        createAssistantClient({
          assistantApiBaseUrl: "",
          fetchResponse: window.fetch.bind(window),
        }),
      ),
    [],
  );
  const state = useSyncExternalStore(session.store.subscribe, session.store.getSnapshot);
  useEffect(() => {
    void session.initialize(false);
    return () => session.dispose();
  }, [session]);
  return {
    ...state,
    modelSelection: session.modelSelection,
    userInputResponder: session.userInputResponder,
    selectConversation: session.selectConversation,
    sendMessage: session.sendMessage,
    stopGeneration: session.stopGeneration,
    decideApproval: session.decideApproval,
    deleteConversation: session.deleteConversation,
  };
}
