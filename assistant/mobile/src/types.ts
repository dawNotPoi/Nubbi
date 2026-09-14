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
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      result: string;
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

export type StreamEvent =
  | { type: "message-start"; conversationId: string }
  | { type: "skill-active"; name: string; description: string }
  | { type: "tool-start"; server: string; tool: string; arguments: Record<string, unknown> }
  | { type: "tool-result"; server: string; tool: string; result: string }
  | ApprovalRequest
  | { type: "approval-resolved"; approvalId: string; approved: boolean }
  | { type: "text-delta"; text: string }
  | { type: "error"; message: string }
  | { type: "done"; message: Message };
