import type { UserInputPart } from "./user-input.ts";
/** 会话列表所需摘要，不携带完整消息历史。 */
export type ConversationSummary = {
  /** 会话下次发送选择的模型，旧会话可能缺失。 */
  model?: string;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  tokenUsage?: TokenUsage;
};

/** 累计的 token 用量（prompt / completion / total 与缓存统计）。 */
export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  // prompt 缓存命中的 token 数（Provider 未返回时缺失）。
  promptCacheHitTokens?: number;
  // prompt 缓存未命中的 token 数（Provider 未返回时缺失）。
  promptCacheMissTokens?: number;
};

/** 消息内的内容块：文本、Skill、工具审批/执行记录或错误，逐块渲染。 */
export type MessagePart =
  | UserInputPart
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
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
      // 工具实际执行耗时（毫秒，不含审批等待）；历史消息可能缺失。
      durationMs?: number;
    }
  | { type: "error"; message: string };

/** 持久化消息协议，不包含客户端临时运行状态。 */
export type Message = {
  id: string;
  role: "user" | "assistant";
  parts: MessagePart[];
  /** 本次 Run 配置的模型；旧消息缺失时保持未知。 */
  model?: string;
  provider?: "openai-compatible" | "codex-subscription";
  createdAt: string;
};

/** 客户端可读取的完整会话与累计用量。 */
export type Conversation = ConversationSummary & {
  messages: Message[];
};
