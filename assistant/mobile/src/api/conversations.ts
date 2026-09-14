import { fetch } from "expo/fetch";
import { createAssistantClient, type StreamMessageInput } from "@nubbi/assistant-shared/client";
import type { Conversation, ConversationSummary } from "../types.ts";

/**
 * 列出全部对话摘要。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @returns 对话摘要列表。
 */
export const listConversations = (assistantApiBaseUrl: string): Promise<ConversationSummary[]> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).listConversations();

/**
 * 获取指定对话的完整内容。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param id 对话的唯一 ID。
 * @returns 完整对话对象。
 */
export const getConversation = (assistantApiBaseUrl: string, id: string): Promise<Conversation> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).getConversation(id);

/**
 * 创建一个新对话。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @returns 新建的对话对象。
 */
export const createConversation = (assistantApiBaseUrl: string): Promise<Conversation> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).createConversation();

/**
 * 删除指定对话。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param id 对话的唯一 ID。
 * @returns 无返回值。
 */
export const deleteConversation = (assistantApiBaseUrl: string, id: string): Promise<void> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).deleteConversation(id);

/**
 * 停止指定对话的生成任务。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param conversationId 对话的唯一 ID。
 * @returns 无返回值。
 */
export const stopGeneration = (assistantApiBaseUrl: string, conversationId: string): Promise<void> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).stopGeneration(
    conversationId,
  );

/**
 * 提交工具审批决定。
 * @param assistantApiBaseUrl 服务端基础地址。
 * @param id 审批 ID。
 * @param approved 是否允许。
 * @returns 无返回值。
 */
export const resolveApproval = (assistantApiBaseUrl: string, id: string, approved: boolean): Promise<void> =>
  createAssistantClient({ assistantApiBaseUrl: assistantApiBaseUrl, fetchResponse: fetch }).resolveApproval(
    id,
    approved,
  );
/**
 * 发送移动端消息，注入 Expo 流式传输。
 * @param input 服务地址及发送参数。
 * @returns 发送完成的 Promise。
 */
export const streamMessage = (input: StreamMessageInput & { assistantApiBaseUrl: string }): Promise<void> =>
  createAssistantClient({ assistantApiBaseUrl: input.assistantApiBaseUrl, fetchResponse: fetch }).streamMessage(input);
