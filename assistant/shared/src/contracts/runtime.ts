import type { ApprovalReview } from "./approvals.ts";
/** 运行事件的身份与顺序信息，用于关联会话、任务及回放。 */
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
      // 工具实际执行耗时（毫秒，不含审批等待）；历史事件可能缺失。
      durationMs?: number;
    }
  | {
      type: "approval-request";
      approvalId: string;
      server: string;
      tool: string;
      arguments: Record<string, unknown>;
      expiresAt: string;
      review?: ApprovalReview;
    }
  | { type: "approval-resolved"; approvalId: string; approved: boolean }
  | { type: "text-delta"; text: string }
  | { type: "reasoning-delta"; text: string };

/** 模型可产生的增量类型；新增类型时下面两张映射表会由类型检查强制补齐。 */
export type DeltaType = "text" | "reasoning";
/** 承载增量的流式事件类型，从 AgentEvent 推导以保证取值真实存在。 */
export type DeltaEventType = Extract<AgentEvent, { type: `${string}-delta` }>["type"];

/** 模型增量类型 → 对外流式事件类型，避免各处重复写三元表达式。 */
export const DELTA_EVENT_TYPES: Record<DeltaType, DeltaEventType> = {
  text: "text-delta",
  reasoning: "reasoning-delta",
};
/** 流式事件类型 → 消息 part 类型，落库与前端渲染共用同一份映射。 */
export const DELTA_PART_TYPES: Record<DeltaEventType, DeltaType> = {
  "text-delta": "text",
  "reasoning-delta": "reasoning",
};

/** Run 生命周期事件，与 AgentEvent 一起构成完整的 RuntimeEvent。 */
export type RuntimeEventPayload =
  | AgentEvent
  | {
      type: "run-started";
      provider: "openai-compatible" | "codex-subscription";
      /** 旧运行记录可能未保存模型。 */
      model?: string;
    }
  | {
      type: "context-status";
      usedTokens: number;
      maxTokens: number;
      truncated: boolean;
    }
  | {
      type: "token-usage";
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      promptCacheHitTokens?: number;
      promptCacheMissTokens?: number;
    }
  | { type: "assistant-message"; messageId: string }
  | { type: "run-completed"; messageId: string }
  | { type: "run-failed"; messageId: string; message: string; cancelled: boolean }
  | { type: "run-abandoned"; reason: string };
