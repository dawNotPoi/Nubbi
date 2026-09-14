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

/**
 * 从非 2xx 响应中提取错误消息。
 * @param response 失败的 HTTP 响应。
 * @returns 响应体中的 message，无法解析时回退为带状态码的文案。
 */
const readError = async (response: Response): Promise<string> => {
  const value = await response.json().catch(() => null) as { message?: string } | null;
  return value?.message || `请求失败 (${response.status})`;
};

/**
 * 统一 JSON 请求封装：
 * 非 2xx 抛错、204 返回 undefined、非 JSON 内容视为地址填错（如填了 Expo 端口）。
 * @param baseUrl 服务端基础地址。
 * @param path 接口路径。
 * @param init 可选的原生请求配置。
 * @returns 解析后的 JSON 结果。
 */
const request = async <T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  // 只有实际携带 JSON 请求体时才声明 application/json，
  // 避免空 body 的 POST/DELETE 因「JSON content-type + 空 body」被 Fastify 拒绝。
  if (init?.body != null) headers.set("Content-Type", "application/json");
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(await readError(response));
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("目标不是 Assistant API，请勿填写 Expo 使用的 8081 端口");
  }
  return response.json() as Promise<T>;
};

/**
 * 带配置管理密钥的请求封装，用于模型/MCP 设置类接口。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥，写入 x-config-token 请求头。
 * @param path 接口路径。
 * @param init 可选的原生请求配置。
 * @returns 解析后的 JSON 结果。
 */
const configRequest = <T>(baseUrl: string, token: string, path: string, init?: RequestInit): Promise<T> =>
  request<T>(baseUrl, path, { ...init, headers: { ...init?.headers, "x-config-token": token } });

/**
 * 连接前探活：10 秒超时，确保目标确实是 Assistant API。
 * @param baseUrl 服务端基础地址。
 * @returns 无返回值；探活失败或超时抛出异常。
 */
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

/**
 * 列出全部对话摘要。
 * @param baseUrl 服务端基础地址。
 * @returns 对话摘要列表。
 */
export const listConversations = (baseUrl: string): Promise<ConversationSummary[]> =>
  request(baseUrl, "/api/conversations");
/**
 * 获取指定对话的完整内容。
 * @param baseUrl 服务端基础地址。
 * @param id 对话的唯一 ID。
 * @returns 完整对话对象。
 */
export const getConversation = (baseUrl: string, id: string): Promise<Conversation> =>
  request(baseUrl, `/api/conversations/${id}`);
/**
 * 创建一个新对话。
 * @param baseUrl 服务端基础地址。
 * @returns 新建的对话对象。
 */
export const createConversation = (baseUrl: string): Promise<Conversation> =>
  request(baseUrl, "/api/conversations", { method: "POST" });
/**
 * 删除指定对话。
 * @param baseUrl 服务端基础地址。
 * @param id 对话的唯一 ID。
 * @returns 无返回值。
 */
export const deleteConversation = (baseUrl: string, id: string): Promise<void> =>
  request(baseUrl, `/api/conversations/${id}`, { method: "DELETE" });
/**
 * 停止指定对话的生成任务。
 * @param baseUrl 服务端基础地址。
 * @param conversationId 对话的唯一 ID。
 * @returns 无返回值。
 */
export const stopGeneration = (baseUrl: string, conversationId: string): Promise<void> =>
  request(baseUrl, `/api/conversations/${conversationId}/generations/stop`, { method: "POST" });
/**
 * 提交工具审批决定。
 * @param baseUrl 服务端基础地址。
 * @param id 审批 ID。
 * @param approved 是否允许。
 * @returns 无返回值。
 */
export const resolveApproval = (baseUrl: string, id: string, approved: boolean): Promise<void> =>
  request(baseUrl, `/api/approvals/${id}`, { method: "POST", body: JSON.stringify({ approved }) });

/**
 * 读取模型配置。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @returns 对外可见的模型配置。
 */
export const getModelConfig = (baseUrl: string, token: string): Promise<ModelConfig> =>
  configRequest(baseUrl, token, "/api/model/config");
/**
 * 保存模型配置。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @param input 新的模型配置。
 * @returns 保存后对外可见的配置。
 */
export const saveModelConfig = (
  baseUrl: string,
  token: string,
  input: ModelConfigInput,
): Promise<ModelConfig> => configRequest(baseUrl, token, "/api/model/config", {
  method: "PUT",
  body: JSON.stringify(input),
});
/**
 * 拉取 Provider 可用模型列表。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @param input 连接参数（Base URL、可选的 API Key 与自定义请求头）。
 * @returns 模型 ID 列表。
 */
export const fetchProviderModels = (
  baseUrl: string,
  token: string,
  input: { baseUrl: string; apiKey?: string; headers?: Record<string, string> },
): Promise<{ models: string[] }> => configRequest(baseUrl, token, "/api/model/models", {
  method: "POST",
  body: JSON.stringify(input),
});
/**
 * 读取 Codex 账号信息。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @returns 账号状态。
 */
export const getCodexAccount = (baseUrl: string, token: string): Promise<CodexAccount> =>
  configRequest(baseUrl, token, "/api/model/codex/account");
/**
 * 发起 Codex 设备码登录。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @returns 设备登录信息。
 */
export const startCodexLogin = (baseUrl: string, token: string): Promise<DeviceLogin> =>
  configRequest(baseUrl, token, "/api/model/codex/login", { method: "POST" });
/**
 * 退出 Codex 登录。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @returns 无返回值。
 */
export const logoutCodex = (baseUrl: string, token: string): Promise<void> =>
  configRequest(baseUrl, token, "/api/model/codex/logout", { method: "POST" });
/**
 * 拉取全部 Codex 模型。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @returns Codex 模型列表。
 */
export const fetchCodexModels = (
  baseUrl: string,
  token: string,
): Promise<{ models: CodexModel[] }> => configRequest(baseUrl, token, "/api/model/codex/models");

/**
 * 列出全部 MCP 服务配置。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @returns 服务配置列表。
 */
export const listMcpServers = (baseUrl: string, token: string): Promise<McpServerConfig[]> =>
  configRequest(baseUrl, token, "/api/mcp/servers");
/**
 * 新建 MCP 服务。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @param server 服务配置。
 * @returns 已保存的服务配置。
 */
export const createMcpServer = (
  baseUrl: string,
  token: string,
  server: McpServerConfig,
): Promise<McpServerConfig> => configRequest(baseUrl, token, "/api/mcp/servers", {
  method: "POST",
  body: JSON.stringify(server),
});
/**
 * 更新 MCP 服务。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @param server 新的服务配置（含原 ID）。
 * @returns 已保存的服务配置。
 */
export const updateMcpServer = (
  baseUrl: string,
  token: string,
  server: McpServerConfig,
): Promise<McpServerConfig> => configRequest(baseUrl, token, `/api/mcp/servers/${server.id ?? ""}`, {
  method: "PUT",
  body: JSON.stringify(server),
});
/**
 * 删除 MCP 服务。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @param id 待删除服务的 ID。
 * @returns 无返回值。
 */
export const deleteMcpServer = (baseUrl: string, token: string, id: string): Promise<void> =>
  configRequest(baseUrl, token, `/api/mcp/servers/${id}`, { method: "DELETE" });
/**
 * 测试连接 MCP 服务。
 * @param baseUrl 服务端基础地址。
 * @param token 管理密钥。
 * @param server 待测试的服务配置。
 * @returns 连接与工具发现结果。
 */
export const testMcpServer = async (
  baseUrl: string,
  token: string,
  server: McpServerConfig,
): Promise<McpConnectionTest> => {
  const result = await configRequest<McpConnectionTest>(baseUrl, token, "/api/mcp/test", {
    method: "POST",
    body: JSON.stringify(server),
  });
  // 旧版服务端可能只返回 tools 或只返回 toolCount，这里统一补全，避免界面显示“发现 个工具”或渲染崩溃。
  return {
    ...result,
    toolCount: result.toolCount ?? result.tools?.length ?? 0,
    tools: result.tools ?? [],
  };
};

/**
 * 解析 SSE 事件块：空块或格式错误返回 null，正常则合并 data 行并补上 type。
 * @param block 以空行分隔的单个 SSE 事件文本。
 * @returns 解析后的事件对象；格式错误返回 null。
 */
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

/**
 * 以 SSE 方式发送消息并持续回调事件。
 * 逐块读取字节流，按空行切分事件，兼容可能的 \r\n 换行符。
 * @param input 请求参数：服务地址、对话 ID、消息内容、取消信号与事件回调。
 * @returns 无返回值，事件通过 onEvent 回调持续派发。
 */
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
