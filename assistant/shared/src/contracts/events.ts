import type { RuntimeEventPayload, RuntimeEventMeta } from "./runtime.ts";
import type { Message } from "./messages.ts";

/** 服务端推送的上下文占用状态，用于展示模型消耗量与容量比例。 */
export type ContextStatus = {
  usedTokens: number;
  maxTokens: number;
  truncated: boolean;
};

/** 传输层事件在业务事件之外增加开始、错误和最终消息。 */
export type StreamEvent = (
  | RuntimeEventPayload
  | { type: "message-start"; conversationId: string }
  | { type: "error"; message: string }
  | { type: "done"; message: Message }
) &
  Partial<RuntimeEventMeta>;

/** Run 审计摘要，由服务端从 run_events 聚合而来。 */
export type RunSummary = {
  runId: string;
  conversationId: string;
  agentId: string;
  parentRunId?: string;
  provider: "openai-compatible" | "codex-subscription";
  status: "running" | "completed" | "failed" | "cancelled" | "abandoned";
  startedAt: string;
  finishedAt?: string;
  message?: string;
};

/** 带服务端元信息的完整运行时事件，用于轨迹回放。 */
export type RuntimeEvent = RuntimeEventPayload & RuntimeEventMeta;
