import type { AgentExecutor } from "../agent/agent-executor.ts";
import { runAgentLoop } from "../agent/agent-loop.ts";
import { createChatCompletionsAdapter } from "../llm/chat-completions/adapter.ts";
import { runCodex } from "../integrations/codex/runner.ts";
import type { CodexThreadStore } from "../integrations/codex/run-input.ts";
import type { StoredModelConfig } from "../features/settings/model-config.schema.ts";
import type { McpTool } from "../integrations/mcp/mcp.ts";
import type { Skill } from "../integrations/skills/skill-store.ts";
import type { ToolExecutor } from "../tools/tool-executor.ts";
import type { RegisteredTool } from "../tools/registry.ts";
import { ASK_USER_TOOL_NAME } from "@nubbi/assistant-shared/contracts";
import { InteractiveToolInvoker } from "../agent/interactive-tool-invoker.ts";
import { askUserDefinition, USER_INPUT_INSTRUCTIONS } from "../agent/user-input-tool.ts";

/** 应用组装层所需的具体实现，只在这里选择执行后端。 */
export type ExecutorDependencies = {
  modelConfig: StoredModelConfig;
  mcpTools: McpTool[];
  skills: Skill[];
  toolExecutor: ToolExecutor;
  registeredTools: RegisteredTool[];
  threadStore: CodexThreadStore;
};

/**
 * 绑定连接配置和工具实现，返回不暴露供应商细节的任务执行器。
 * @param dependencies 当前运行的已加载依赖。
 * @returns Codex 或自有循环执行器。
 */
export function createAgentExecutor(dependencies: ExecutorDependencies): AgentExecutor {
  const { modelConfig } = dependencies;
  if (dependencies.registeredTools.some((tool) => tool.definition.name === ASK_USER_TOOL_NAME))
    throw new Error("工具名称 ask_user 为用户交互能力保留");
  const definitions = [...dependencies.registeredTools.map((tool) => tool.definition), askUserDefinition];
  if (modelConfig.provider === "codex-subscription")
    return {
      executeRun: async (input) => {
        const conversation = await dependencies.threadStore.load(input.conversationId);
        return runCodex({
          ...input,
          signal: input.abortSignal,
          emit: input.publishEvent,
          modelConfig,
          tools: [...dependencies.mcpTools.map((tool) => tool.definition), askUserDefinition],
          gateway: new InteractiveToolInvoker({
            runId: input.runId, tools: dependencies.toolExecutor, signal: input.abortSignal, emit: input.publishEvent,
          }),
          codexThreadId: conversation?.codexThreadId,
          threadStore: dependencies.threadStore,
        });
      },
    };
  const modelAdapter = createChatCompletionsAdapter({
    modelBaseUrl: modelConfig.baseUrl,
    modelApiKey: modelConfig.apiKey,
    modelName: modelConfig.model,
    headers: modelConfig.headers,
    temperature: modelConfig.temperature,
  });
  const instructions = [
    modelConfig.systemPrompt || "你是一个简洁、可靠的个人对话助手。按需调用工具，不要虚构结果。",
    USER_INPUT_INSTRUCTIONS,
    "可用 Skill：",
    dependencies.skills.length
      ? dependencies.skills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n")
      : "当前没有可用 Skill。",
  ].join("\n\n");
  return {
    executeRun: (input) =>
      runAgentLoop({
        modelAdapter,
        instructions,
        toolInvoker: new InteractiveToolInvoker({
          runId: input.runId, tools: dependencies.toolExecutor, signal: input.abortSignal, emit: input.publishEvent,
        }),
        toolDefinitions: definitions,
        messages: input.context.messages.map((message) =>
          message.role === "assistant"
            ? { role: "assistant", blocks: [{ type: "text", text: message.content }] }
            : { role: "user", content: message.content },
        ),
        abortSignal: input.abortSignal,
        publishEvent: input.publishEvent,
        runUsage: input.runUsage,
      }),
  };
}
