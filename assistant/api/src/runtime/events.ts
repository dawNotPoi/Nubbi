export type RuntimeEventMeta = {
  eventId: string;
  runId: string;
  conversationId: string;
  sequence: number;
  timestamp: string;
  agentId: string;
  parentRunId?: string;
};

export type AgentEvent =
  | { type: "skill-active"; name: string; description: string }
  | {
      type: "tool-start";
      callId?: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
    }
  | {
      type: "tool-result";
      callId?: string;
      server: string;
      tool: string;
      result: string;
      success: boolean;
    }
  | {
      type: "approval-request";
      approvalId: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      expiresAt: string;
    }
  | { type: "approval-resolved"; approvalId: string; approved: boolean }
  | { type: "text-delta"; text: string };

export type RuntimeEventPayload = AgentEvent
  | {
      type: "run-started";
      provider: "openai-compatible" | "codex-subscription";
    }
  | { type: "assistant-message"; messageId: string }
  | { type: "run-completed"; messageId: string }
  | { type: "run-failed"; messageId: string; message: string; cancelled: boolean }
  | { type: "run-abandoned"; reason: string };

export type RuntimeEvent = RuntimeEventPayload & RuntimeEventMeta;
export type RunStatus = "running" | "completed" | "failed" | "cancelled" | "abandoned";

export type RunSummary = {
  runId: string;
  conversationId: string;
  agentId: string;
  parentRunId?: string;
  provider: "openai-compatible" | "codex-subscription";
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  message?: string;
};
