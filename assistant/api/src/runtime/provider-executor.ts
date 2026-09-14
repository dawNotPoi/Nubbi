import type { StoredModelConfig } from "../model/model-config.js";
import type { McpTool } from "../mcp/mcp.js";
import type { Skill } from "../orchestration/skills.js";
import type { AgentEvent, MessagePart } from "../types.js";
import type { AgentContext } from "./context-builder.js";
import type { ToolGateway } from "./tool-gateway.js";

/** 传给各 Provider 执行器的完整上下文，屏蔽不同模型后端的差异。 */
export type ProviderExecutorInput = {
  runId: string;
  conversationId: string;
  currentMessageId: string;
  content: string;
  codexThreadId?: string;
  context: AgentContext;
  modelConfig: StoredModelConfig;
  skills: Skill[];
  tools: McpTool[];
  gateway: ToolGateway;
  signal: AbortSignal;
  emit: (event: AgentEvent) => void;
};

/** Provider 执行器契约：输入统一上下文，产出最终助手消息的 parts。 */
export type ProviderExecutor = {
  execute: (input: ProviderExecutorInput) => Promise<MessagePart[]>;
};
