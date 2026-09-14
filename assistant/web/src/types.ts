export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

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
  apiKeyConfigured: boolean;
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
  | { type: "tool-result"; callId?: string; server: string; tool: string; result: string; success?: boolean }
  | ApprovalRequest
  | { type: "approval-resolved"; approvalId: string; approved: boolean }
  | { type: "text-delta"; text: string }
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
