import { fetch } from "expo/fetch";
import type {
  CodexAccount,
  CodexModel,
  Conversation,
  ConversationSummary,
  DeviceLogin,
  McpConnectionTest,
  McpServerConfig,
  ModelConfig,
  ModelConfigInput,
  StreamEvent,
} from "./types";

const readError = async (response: Response): Promise<string> => {
  const value = await response.json().catch(() => null) as { message?: string } | null;
  return value?.message || `请求失败 (${response.status})`;
};

const request = async <T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("目标不是 Assistant API，请勿填写 Expo 使用的 8081 端口");
  }
  return response.json() as Promise<T>;
};

const configRequest = <T>(baseUrl: string, token: string, path: string, init?: RequestInit): Promise<T> =>
  request<T>(baseUrl, path, { ...init, headers: { ...init?.headers, "x-config-token": token } });

export const testApiConnection = async (baseUrl: string): Promise<void> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const result = await request<{ status: string }>(baseUrl, "/api/health", { signal: controller.signal });
    if (result.status !== "ok") throw new Error("目标不是 Assistant API");
  } catch (error) {
    if (controller.signal.aborted) throw new Error("连接 Assistant API 超时");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const listConversations = (baseUrl: string): Promise<ConversationSummary[]> =>
  request(baseUrl, "/api/conversations");
export const getConversation = (baseUrl: string, id: string): Promise<Conversation> =>
  request(baseUrl, `/api/conversations/${id}`);
export const createConversation = (baseUrl: string): Promise<Conversation> =>
  request(baseUrl, "/api/conversations", { method: "POST" });
export const deleteConversation = (baseUrl: string, id: string): Promise<void> =>
  request(baseUrl, `/api/conversations/${id}`, { method: "DELETE" });
export const stopGeneration = (baseUrl: string): Promise<void> =>
  request(baseUrl, "/api/generations/stop", { method: "POST" });
export const resolveApproval = (baseUrl: string, id: string, approved: boolean): Promise<void> =>
  request(baseUrl, `/api/approvals/${id}`, { method: "POST", body: JSON.stringify({ approved }) });

export const getModelConfig = (baseUrl: string, token: string): Promise<ModelConfig> =>
  configRequest(baseUrl, token, "/api/model/config");
export const saveModelConfig = (
  baseUrl: string,
  token: string,
  input: ModelConfigInput,
): Promise<ModelConfig> => configRequest(baseUrl, token, "/api/model/config", {
  method: "PUT",
  body: JSON.stringify(input),
});
export const fetchProviderModels = (
  baseUrl: string,
  token: string,
  input: { baseUrl: string; apiKey?: string },
): Promise<{ models: string[] }> => configRequest(baseUrl, token, "/api/model/models", {
  method: "POST",
  body: JSON.stringify(input),
});
export const getCodexAccount = (baseUrl: string, token: string): Promise<CodexAccount> =>
  configRequest(baseUrl, token, "/api/model/codex/account");
export const startCodexLogin = (baseUrl: string, token: string): Promise<DeviceLogin> =>
  configRequest(baseUrl, token, "/api/model/codex/login", { method: "POST" });
export const logoutCodex = (baseUrl: string, token: string): Promise<void> =>
  configRequest(baseUrl, token, "/api/model/codex/logout", { method: "POST" });
export const fetchCodexModels = (
  baseUrl: string,
  token: string,
): Promise<{ models: CodexModel[] }> => configRequest(baseUrl, token, "/api/model/codex/models");

export const listMcpServers = (baseUrl: string, token: string): Promise<McpServerConfig[]> =>
  configRequest(baseUrl, token, "/api/mcp/servers");
export const createMcpServer = (
  baseUrl: string,
  token: string,
  server: McpServerConfig,
): Promise<McpServerConfig> => configRequest(baseUrl, token, "/api/mcp/servers", {
  method: "POST",
  body: JSON.stringify(server),
});
export const updateMcpServer = (
  baseUrl: string,
  token: string,
  server: McpServerConfig,
): Promise<McpServerConfig> => configRequest(baseUrl, token, `/api/mcp/servers/${server.id}`, {
  method: "PUT",
  body: JSON.stringify(server),
});
export const deleteMcpServer = (baseUrl: string, token: string, id: string): Promise<void> =>
  configRequest(baseUrl, token, `/api/mcp/servers/${id}`, { method: "DELETE" });
export const testMcpServer = (
  baseUrl: string,
  token: string,
  server: McpServerConfig,
): Promise<McpConnectionTest> => configRequest(baseUrl, token, "/api/mcp/test", {
  method: "POST",
  body: JSON.stringify(server),
});

const parseEvent = (block: string): StreamEvent | null => {
  const lines = block.split("\n");
  const type = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim()).join("\n");
  if (!type || !data) return null;
  try {
    return { ...(JSON.parse(data) as object), type } as StreamEvent;
  } catch {
    return null;
  }
};

export const streamMessage = async (input: {
  baseUrl: string;
  conversationId: string;
  content: string;
  signal: AbortSignal;
  onEvent: (event: StreamEvent) => void;
}): Promise<void> => {
  const response = await fetch(`${input.baseUrl}/api/conversations/${input.conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ content: input.content }),
    signal: input.signal,
  });
  if (!response.ok) throw new Error(await readError(response));
  if (!response.body) throw new Error("当前设备不支持流式响应");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";
    blocks.forEach((block) => {
      const event = parseEvent(block);
      if (event) input.onEvent(event);
    });
    if (done) break;
  }
  const finalEvent = parseEvent(buffer);
  if (finalEvent) input.onEvent(finalEvent);
};
