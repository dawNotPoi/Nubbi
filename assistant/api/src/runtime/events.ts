export type RuntimeEventMeta = {
  eventId: string;
  runId: string;
  conversationId: string;
  sequence: number;
  timestamp: string;
  agentId: string;
  parentRunId?: string;
};

/** Agent 运行过程中产生、需要实时推送给客户端的业务事件。 */
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

/** Run 生命周期事件，与 AgentEvent 一起构成完整的 RuntimeEvent。 */
export type RuntimeEventPayload = AgentEvent
  | {
      type: "run-started";
      provider: "openai-compatible" | "codex-subscription";
    }
  | { type: "assistant-message"; messageId: string }
  | { type: "run-completed"; messageId: string }
  | { type: "run-failed"; messageId: string; message: string; cancelled: boolean }
  | { type: "run-abandoned"; reason: string };

/** 带元信息的完整运行时事件，事件发射器统一补全这些字段。 */
export type RuntimeEvent = RuntimeEventPayload & RuntimeEventMeta;

export type RunStatus = "running" | "completed" | "failed" | "cancelled" | "abandoned";

/** Run 的审计摘要，由 run-store 从事件流聚合而来。 */
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
