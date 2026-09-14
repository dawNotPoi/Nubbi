import type { StoredModelConfig } from "../model-config.js";
import type { McpTool } from "../mcp.js";
import type { Skill } from "../skills.js";
import type { AgentEvent, MessagePart } from "../types.js";
import type { AgentContext } from "./context-builder.js";
import type { ToolGateway } from "./tool-gateway.js";

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

export type ProviderExecutor = {
  execute: (input: ProviderExecutorInput) => Promise<MessagePart[]>;
};
