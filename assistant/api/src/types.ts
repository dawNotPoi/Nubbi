import type { Conversation as PublicConversation } from "@nubbi/assistant-shared/contracts";
export type {
  Message,
  MessagePart,
  TokenUsage,
  AgentEvent,
  ApprovalReview,
  RunSummary,
  RuntimeEvent,
  RuntimeEventMeta,
  RuntimeEventPayload,
} from "@nubbi/assistant-shared/contracts";
export type { RunStatus } from "./runtime/events.ts";

/** 数据库存储的对话；Codex 续接信息仅由后端维护。 */
export type Conversation = PublicConversation & { codexThreadId?: string; codexToolSignature?: string };
