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

/**
 * 从非 2xx 响应中提取错误消息。
 * @param response 失败的 HTTP 响应。
 * @returns 响应体中的 message，无法解析时回退为带状态码的文案。
 */
const readError = async (response: Response): Promise<string> => {
  const value = await response.json().catch(() => null) as {
    message?: string;
  } | null;
  return value?.message || `请求失败 (${response.status})`;
};

/**
 * 统一 JSON 请求封装：非 2xx 抛错，204 返回 undefined。
 * @param path 接口路径。
 * @param init 可选的原生请求配置。
 * @returns 解析后的 JSON 结果。
 */
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

/**
 * 列出全部对话摘要。
 * @returns 对话摘要列表。
 */
export const listConversations = (): Promise<ConversationSummary[]> =>
  request("/api/conversations");
/**
 * 获取指定对话的完整内容。
 * @param id 对话的唯一 ID。
 * @returns 完整对话对象。
 */
export const getConversation = (id: string): Promise<Conversation> =>
  request(`/api/conversations/${id}`);

/**
 * 创建一个新对话。
 * @returns 新建的对话对象。
 */
export const createConversation = (): Promise<Conversation> =>
  request("/api/conversations", { method: "POST" });

/**
 * 删除指定对话。
 * @param id 对话的唯一 ID。
 * @returns 无返回值。
 */
export const deleteConversation = (id: string): Promise<void> =>
  request(`/api/conversations/${id}`, { method: "DELETE" });

/**
 * 停止指定对话的生成任务。
 * @param conversationId 对话的唯一 ID。
 * @returns 无返回值。
 */
export const stopGeneration = (conversationId: string): Promise<void> =>
  request(`/api/conversations/${conversationId}/generations/stop`, { method: "POST" });
/**
 * 提交工具审批决定。
 * @param id 审批 ID。
 * @param approved 是否允许。
 * @returns 无返回值。
 */
export const resolveApproval = (id: string, approved: boolean): Promise<void> =>
  request(`/api/approvals/${id}`, {
    method: "POST",
    body: JSON.stringify({ approved }),
  });

/**
 * 带管理密钥的 MCP 配置请求。
 * @param token 管理密钥。
 * @param path MCP 接口路径。
 * @param init 可选的原生请求配置。
 * @returns 解析后的 JSON 结果。
 */
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

/**
 * 带管理密钥的模型配置请求。
 * @param token 管理密钥。
 * @param path 模型接口路径。
 * @param init 可选的原生请求配置。
 * @returns 解析后的 JSON 结果。
 */
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
/**
 * 读取模型配置。
 * @param token 管理密钥。
 * @returns 对外可见的模型配置。
 */
export const getModelConfig = (token: string): Promise<ModelConfig> =>
  modelRequest(token, "/config");

/**
 * 保存模型配置。
 * @param token 管理密钥。
 * @param config 新的模型配置。
 * @returns 保存后对外可见的配置。
 */
export const saveModelConfig = (
  token: string,
  config: ModelConfigInput,
): Promise<ModelConfig> => modelRequest(token, "/config", {
  method: "PUT",
  body: JSON.stringify(config),
});

/**
 * 拉取 Provider 可用模型列表。
 * @param token 管理密钥。
 * @param input 连接参数（Base URL、可选的 API Key 与自定义请求头）。
 * @returns 模型 ID 列表。
 */
export const fetchProviderModels = (
  token: string,
  input: { baseUrl: string; apiKey?: string; headers?: Record<string, string> },
): Promise<{ models: string[] }> => modelRequest(token, "/models", {
  method: "POST",
  body: JSON.stringify(input),
});

/**
 * 读取 Codex 账号信息。
 * @param token 管理密钥。
 * @returns 账号状态。
 */
export const getCodexAccount = (token: string): Promise<CodexAccount> =>
  modelRequest(token, "/codex/account");
/**
 * 发起 Codex 设备码登录。
 * @param token 管理密钥。
 * @returns 设备登录信息。
 */
export const startCodexLogin = (token: string): Promise<DeviceLogin> =>
  modelRequest(token, "/codex/login", { method: "POST" });

/**
 * 退出 Codex 登录。
 * @param token 管理密钥。
 * @returns 无返回值。
 */
export const logoutCodex = (token: string): Promise<void> =>
  modelRequest(token, "/codex/logout", { method: "POST" });

/**
 * 拉取全部 Codex 模型。
 * @param token 管理密钥。
 * @returns Codex 模型列表。
 */
export const fetchCodexModels = (token: string): Promise<{ models: CodexModel[] }> =>
  modelRequest(token, "/codex/models");
/**
 * 列出全部 MCP 服务配置。
 * @param token 管理密钥。
 * @returns 服务配置列表。
 */
export const listMcpServers = (token: string): Promise<McpServerConfig[]> =>
  mcpRequest(token, "/servers");

/**
 * 新建 MCP 服务。
 * @param token 管理密钥。
 * @param server 服务配置。
 * @returns 已保存的服务配置。
 */
export const createMcpServer = (
  token: string,
  server: McpServerConfig,
): Promise<McpServerConfig> => mcpRequest(token, "/servers", {
  method: "POST",
  body: JSON.stringify(server),
});

/**
 * 更新 MCP 服务。
 * @param token 管理密钥。
 * @param server 新的服务配置（含原 ID）。
 * @returns 已保存的服务配置。
 */
export const updateMcpServer = (
  token: string,
  server: McpServerConfig,
): Promise<McpServerConfig> => mcpRequest(token, `/servers/${server.id}`, {
  method: "PUT",
  body: JSON.stringify(server),
});

/**
 * 删除 MCP 服务。
 * @param token 管理密钥。
 * @param id 待删除服务的 ID。
 * @returns 无返回值。
 */
export const deleteMcpServer = (
  token: string,
  id: string,
): Promise<void> => mcpRequest(token, `/servers/${id}`, { method: "DELETE" });

/**
 * 测试连接 MCP 服务。
 * @param token 管理密钥。
 * @param server 待测试的服务配置。
 * @returns 连接与工具发现结果。
 */
export const testMcpServer = (
  token: string,
  server: McpServerConfig,
): Promise<McpConnectionTest> => mcpRequest(token, "/test", {
  method: "POST",
  body: JSON.stringify(server),
});

/**
 * 解析 SSE 事件块：空块或格式错误返回 null，正常则合并 data 行并补上 type。
 * @param block 以空行分隔的单个 SSE 事件文本。
 * @returns 解析后的事件对象；格式错误返回 null。
 */
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

/**
 * 以 SSE 方式发送消息并持续回调事件。
 * 逐块读取字节流，按空行切分事件，兼容可能的 \r\n 换行符。
 * @param input 请求参数：对话 ID、消息内容、取消信号与事件回调。
 * @returns 无返回值，事件通过 onEvent 回调持续派发。
 */
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
