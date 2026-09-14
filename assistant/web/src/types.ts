export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tokenUsage?: TokenUsage;
};

/** 累计的 token 用量（prompt / completion / total 与缓存统计）。 */
export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  // prompt 缓存命中的 token 数（Provider 未返回时缺失）。
  promptCacheHitTokens?: number;
  // prompt 缓存未命中的 token 数（Provider 未返回时缺失）。
  promptCacheMissTokens?: number;
};

/** 消息内的内容块：文本、Skill、工具审批/执行记录或错误，逐块渲染。 */
export type MessagePart =
  | { type: "text"; text: string }
  | { type: "skill"; name: string; description: string }
  | {
      type: "approval";
      approvalId: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      approved: boolean;
    }
  | {
      type: "tool";
      callId?: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      result: string;
      success?: boolean;
      // 工具实际执行耗时（毫秒，不含审批等待）；历史消息可能缺失。
      durationMs?: number;
      // status 为“运行中/完成”，仅客户端用于展示进度。
      status?: "running" | "done";
    }
  | { type: "error"; message: string };

export type Message = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  createdAt: string;
};

export type Conversation = ConversationSummary & {
  messages: Message[];
};

type McpServerBase = {
  id: string;
  name: string;
  enabled: boolean;
};

export type McpServerConfig = McpServerBase & {
  // http：远端 Streamable HTTP 地址；stdio：本地启动命令。
  transport?: "http" | "stdio";
  url?: string;
  headers: Record<string, string>;
  command?: string;
  args?: string[];
  env: Record<string, string>;
};

export type McpConnectionTest = {
  serverName: string;
  toolCount: number;
  tools: Array<{ name: string; description: string }>;
};

export type ModelConfig = {
  provider: "openai-compatible" | "codex-subscription";
  authType: "api-key" | "chatgpt";
  baseUrl: string;
  model: string;
  systemPrompt: string;
  headers: Record<string, string>;
  temperature?: number;
  contextWindow?: number;
  apiKeyConfigured: boolean;
};

export type CodexAccount = {
  account: null | { type: string; email?: string | null; planType?: string };
  requiresOpenaiAuth: boolean;
};

/** 当前可发现的 Skill 与 MCP 服务视图。 */
export type ExtensionInfo = {
  skills: Array<{ name: string; description: string; enabled: boolean }>;
  servers: Array<{
    id: string;
    name: string;
    transport: "http";
    endpoint: string;
    enabled: boolean;
    toolCount: number;
  }>;
};

export type CodexModel = {
  id: string;
  model: string;
  displayName: string;
  description: string;
};

export type DeviceLogin = {
  type: "chatgptDeviceCode";
  loginId: string;
  verificationUrl: string;
  userCode: string;
};

export type ApprovalRequest = {
  type: "approval-request";
  approvalId: string;
  server: string;
  tool: string;
  arguments: Record<string, unknown>;
  expiresAt: string;
};

export type ModelConfigInput = Omit<ModelConfig, "apiKeyConfigured"> & {
  apiKey?: string;
  clearApiKey?: boolean;
};

/** 服务端推送的上下文占用状态，用于展示模型消耗量与容量比例。 */
export type ContextStatus = {
  usedTokens: number;
  maxTokens: number;
  truncated: boolean;
};

export type StreamEvent = (
  | { type: "message-start"; conversationId: string }
  | { type: "skill-active"; name: string; description: string }
  | {
      type: "tool-start";
      callId?: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
    }
  | { type: "tool-result"; callId?: string; server: string; tool: string; result: string; success?: boolean; durationMs?: number }
  | ApprovalRequest
  | { type: "approval-resolved"; approvalId: string; approved: boolean }
  | { type: "text-delta"; text: string }
  | { type: "reasoning-delta"; text: string }
  | { type: "run-started"; provider: "openai-compatible" | "codex-subscription" }
  | { type: "context-status"; usedTokens: number; maxTokens: number; truncated: boolean }
  | { type: "token-usage"; promptTokens: number; completionTokens: number; totalTokens: number; promptCacheHitTokens?: number; promptCacheMissTokens?: number }
  | { type: "assistant-message"; messageId: string }
  | { type: "run-completed"; messageId: string }
  | { type: "run-failed"; messageId: string; message: string; cancelled: boolean }
  | { type: "error"; message: string }
  | { type: "done"; message: Message }
) & {
  eventId?: string;
  runId?: string;
  conversationId?: string;
  sequence?: number;
  timestamp?: string;
  agentId?: string;
  parentRunId?: string;
};
