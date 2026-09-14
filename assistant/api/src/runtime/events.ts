export type {
  AgentEvent,
  ApprovalReview,
  RunSummary,
  RuntimeEvent,
  RuntimeEventMeta,
  RuntimeEventPayload,
} from "@nubbi/assistant-shared/contracts";
/** 已持久化运行记录的状态。 */
export type RunStatus = "running" | "completed" | "failed" | "cancelled" | "abandoned";
