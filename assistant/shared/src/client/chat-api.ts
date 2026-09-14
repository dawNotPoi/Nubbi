import type { AssistantClient } from "./assistant-client.ts";
/** 一次发送的身份，切换对话后旧回调不能更新界面。 */
export type ActiveGeneration = {
  revision: number;
  controller: AbortController;
  conversationId?: string;
  runId?: string;
  stopRequest?: Promise<void>;
};
/** 聊天业务依赖的最小接口。 */
export type ChatApi = Pick<
  AssistantClient,
  | "listConversations"
  | "getConversation"
  | "createConversation"
  | "updateConversationModel"
  | "deleteConversation"
  | "streamMessage"
  | "stopGeneration"
  | "resolveApproval"
  | "submitUserInput"
>;
