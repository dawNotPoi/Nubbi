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
    }
  | { type: "error"; message: string };

export type Message = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  createdAt: string;
};

export type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
  codexThreadId?: string;
};

export type ModelTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ModelMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    }
  | { role: "tool"; tool_call_id: string; content: string };

export type ModelToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type AgentEvent =
  | { type: "skill-active"; name: string; description: string }
  | {
      type: "tool-start";
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
    }
  | { type: "tool-result"; server: string; tool: string; result: string }
  | {
      type: "approval-request";
      approvalId: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      expiresAt: string;
    }
  | {
      type: "approval-resolved";
      approvalId: string;
      approved: boolean;
    }
  | { type: "text-delta"; text: string };
