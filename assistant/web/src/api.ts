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
import { apiUrl } from "./api-base";

const readError = async (response: Response): Promise<string> => {
  const value = await response.json().catch(() => null) as {
    message?: string;
  } | null;
  return value?.message || `请求失败 (${response.status})`;
};

const request = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
};

export const listConversations = (): Promise<ConversationSummary[]> =>
  request("/api/conversations");
export const getConversation = (id: string): Promise<Conversation> =>
  request(`/api/conversations/${id}`);

export const createConversation = (): Promise<Conversation> =>
  request("/api/conversations", { method: "POST" });

export const deleteConversation = (id: string): Promise<void> =>
  request(`/api/conversations/${id}`, { method: "DELETE" });

export const stopGeneration = (conversationId: string): Promise<void> =>
  request(`/api/conversations/${conversationId}/generations/stop`, { method: "POST" });
export const resolveApproval = (id: string, approved: boolean): Promise<void> =>
  request(`/api/approvals/${id}`, {
    method: "POST",
    body: JSON.stringify({ approved }),
  });

const mcpRequest = <T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> => request<T>(`/api/mcp${path}`, {
  ...init,
  headers: {
    ...init?.headers,
    "x-config-token": token,
  },
});

const modelRequest = <T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> => request<T>(`/api/model${path}`, {
  ...init,
  headers: {
    ...init?.headers,
    "x-config-token": token,
  },
});
export const getModelConfig = (token: string): Promise<ModelConfig> =>
  modelRequest(token, "/config");

export const saveModelConfig = (
  token: string,
  config: ModelConfigInput,
): Promise<ModelConfig> => modelRequest(token, "/config", {
  method: "PUT",
  body: JSON.stringify(config),
});

export const fetchProviderModels = (
  token: string,
  input: { baseUrl: string; apiKey?: string },
): Promise<{ models: string[] }> => modelRequest(token, "/models", {
  method: "POST",
  body: JSON.stringify(input),
});

export const getCodexAccount = (token: string): Promise<CodexAccount> =>
  modelRequest(token, "/codex/account");
export const startCodexLogin = (token: string): Promise<DeviceLogin> =>
  modelRequest(token, "/codex/login", { method: "POST" });

export const logoutCodex = (token: string): Promise<void> =>
  modelRequest(token, "/codex/logout", { method: "POST" });

export const fetchCodexModels = (token: string): Promise<{ models: CodexModel[] }> =>
  modelRequest(token, "/codex/models");
export const listMcpServers = (token: string): Promise<McpServerConfig[]> =>
  mcpRequest(token, "/servers");

export const createMcpServer = (
  token: string,
  server: McpServerConfig,
): Promise<McpServerConfig> => mcpRequest(token, "/servers", {
  method: "POST",
  body: JSON.stringify(server),
});

export const updateMcpServer = (
  token: string,
  server: McpServerConfig,
): Promise<McpServerConfig> => mcpRequest(token, `/servers/${server.id}`, {
  method: "PUT",
  body: JSON.stringify(server),
});

export const deleteMcpServer = (
  token: string,
  id: string,
): Promise<void> => mcpRequest(token, `/servers/${id}`, { method: "DELETE" });

export const testMcpServer = (
  token: string,
  server: McpServerConfig,
): Promise<McpConnectionTest> => mcpRequest(token, "/test", {
  method: "POST",
  body: JSON.stringify(server),
});

const parseEvent = (block: string): StreamEvent | null => {
  const lines = block.split("\n");
  const type = lines
    .find((line) => line.startsWith("event:"))
    ?.slice(6)
    .trim();
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!type || !data) return null;
  try {
    const payload = JSON.parse(data) as Record<string, unknown>;
    return { ...payload, type } as StreamEvent;
  } catch {
    return null;
  }
};

export const streamMessage = async ({
  conversationId,
  content,
  signal,
  onEvent,
}: {
  conversationId: string;
  content: string;
  signal: AbortSignal;
  onEvent: (event: StreamEvent) => void;
}): Promise<void> => {
  const response = await fetch(
    apiUrl(`/api/conversations/${conversationId}/messages`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal,
    },
  );
  if (!response.ok) throw new Error(await readError(response));
  if (!response.body) throw new Error("浏览器不支持流式响应");

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
      if (event) onEvent(event);
    });
    if (done) break;
  }
  const finalEvent = parseEvent(buffer);
  if (finalEvent) onEvent(finalEvent);
};
