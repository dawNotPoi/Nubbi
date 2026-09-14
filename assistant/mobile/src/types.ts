export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
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

export type Conversation = ConversationSummary & { messages: Message[] };

export type McpServerConfig = {
  id: string;
  name: string;
  enabled: boolean;
  url: string;
  headers: Record<string, string>;
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
  apiKeyConfigured: boolean;
};

export type ModelConfigInput = Omit<ModelConfig, "apiKeyConfigured"> & {
  apiKey?: string;
  clearApiKey?: boolean;
};

export type CodexAccount = {
  account: null | { type: string; email?: string | null; planType?: string };
  requiresOpenaiAuth: boolean;
};

export type CodexModel = {
  id: string;
  model: string;
  displayName: string;
  description: string;
};

/** 设备码登录信息：用户需在浏览器打开 verificationUrl 并输入 userCode。 */
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

/** SSE 流中可能出现的所有事件类型，客户端据此增量渲染消息。 */
export type StreamEvent = (
  | { type: "message-start"; conversationId: string }
  | { type: "skill-active"; name: string; description: string }
  | { type: "tool-start"; callId?: string; server: string; tool: string; arguments: Record<string, unknown> }
  | { type: "tool-result"; callId?: string; server: string; tool: string; result: string; success?: boolean }
  | ApprovalRequest
  | { type: "approval-resolved"; approvalId: string; approved: boolean }
  | { type: "text-delta"; text: string }
  | { type: "reasoning-delta"; text: string }
  | { type: "run-started"; provider: "openai-compatible" | "codex-subscription" }
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
