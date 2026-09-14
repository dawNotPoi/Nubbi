import type { AgentRunInput } from "../../agent/agent-executor.ts";
import type { StoredModelConfig } from "../../features/settings/model-config.schema.ts";
import type { ToolDefinition } from "../../tools/tool-contracts.ts";
import type { ToolInvoker } from "../../tools/tool-contracts.ts";

/** Codex 线程持久化端口，通信实现不直接访问数据库。 */
export type CodexThreadStore = {
  load: (conversationId: string) => Promise<{ codexThreadId?: string; codexToolSignature?: string } | null>;
  save: (conversationId: string, threadId: string, signature: string) => Promise<unknown>;
};
/** Codex 专属执行上下文，与普通模型单轮输入分离。 */
export type CodexRunInput = Omit<AgentRunInput, "abortSignal" | "publishEvent"> & {
  modelConfig: StoredModelConfig;
  tools: ToolDefinition[];
  gateway: ToolInvoker;
  codexThreadId?: string;
  threadStore: CodexThreadStore;
  signal: AbortSignal;
  emit: AgentRunInput["publishEvent"];
};
