import { createAgentGraph } from "./orchestration/agent-graph.js";
import { skillToolName } from "./orchestration/tool-executor.js";
import type { Skill } from "./skills.js";
import type { MessagePart, ModelMessage, ModelTool } from "./types.js";
import type { ProviderExecutorInput } from "./runtime/provider-executor.js";

/** 为 Skill 激活构造一个专用 function 工具，名称枚举当前可用 Skill。 */
const skillTool = (skills: Skill[]): ModelTool => ({
  type: "function",
  function: {
    name: skillToolName,
    description: "按需激活最适合当前任务的 Skill，同一个 Skill 不要重复激活。",
    parameters: {
      type: "object",
      properties: { name: { type: "string", enum: skills.map((skill) => skill.name) } },
      required: ["name"],
    },
  },
});

const systemPrompt = (skills: Skill[], configuredPrompt: string): string => [
  configuredPrompt || "你是一个简洁、可靠的个人对话助手。按需调用工具，不要虚构结果。",
  "可用 Skill：",
  skills.length
    ? skills.map((skill) => `- ${skill.name}: ${skill.description}`).join("\n")
    : "当前没有可用 Skill。",
].join("\n\n");

/**
 * OpenAI 兼容 Provider 的 Agent 执行入口：
 * 组装系统提示与工具，通过 LangGraph 编排“模型 ↔ 工具”循环，返回最终消息 parts。
 */
export const runAgent = async (input: ProviderExecutorInput): Promise<MessagePart[]> => {
  const modelTools = input.tools.map((tool) => tool.modelTool);
  if (input.skills.length) modelTools.push(skillTool(input.skills));
  const messages: ModelMessage[] = [
    { role: "system", content: systemPrompt(input.skills, input.modelConfig.systemPrompt) },
    ...input.context.messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
  const graph = createAgentGraph({
    skills: input.skills,
    modelTools,
    gateway: input.gateway,
    modelConfig: input.modelConfig,
    signal: input.signal,
    emit: input.emit,
  });
  const result = await graph.invoke({
    messages,
    pendingToolCalls: [],
    parts: [],
    activeSkills: [],
    turn: 0,
  }, { signal: input.signal });
  return result.parts;
};
