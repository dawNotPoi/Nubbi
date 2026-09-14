import { createConversationsApi, type ConversationsApi } from "./conversations-api.ts";
import { createModelApi, type ModelApi } from "./model-api.ts";
import { createMcpApi, type McpApi } from "./mcp-api.ts";
import { createExtensionsApi, type ExtensionsApi } from "./extensions-api.ts";
import { createHttpTransport, type AssistantConnection } from "./http-transport.ts";
import { streamAssistantMessage, type StreamMessageInput } from "./message-stream.ts";

/** 完整 Assistant 客户端，不持有平台状态。 */
export type AssistantClient = ConversationsApi &
  ModelApi &
  McpApi &
  ExtensionsApi & { streamMessage: (input: StreamMessageInput) => Promise<void> };

/**
 * 按平台注入连接并组装客户端。
 * @param connection API 地址和 fetch 实现。
 * @returns 业务请求方法。
 */
export function createAssistantClient(connection: AssistantConnection): AssistantClient {
  const transport = createHttpTransport(connection);
  return {
    ...createConversationsApi(transport),
    ...createModelApi(transport),
    ...createMcpApi(transport),
    ...createExtensionsApi(transport),
    streamMessage: (input) => streamAssistantMessage(connection, input),
  };
}
