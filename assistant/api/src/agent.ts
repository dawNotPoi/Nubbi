import { discoverMcpTools } from "./mcp.js";
import { readModelConfig } from "./model-config.js";
import { createAgentGraph } from "./orchestration/agent-graph.js";
import { skillToolName } from "./orchestration/tool-executor.js";
import { listSkills, type Skill } from "./skills.js";
import type {
  AgentEvent,
  MessagePart,
  ModelMessage,
  ModelTool,
} from "./types.js";

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

export const runAgent = async ({
  conversationId,
  history,
  signal,
  emit,
}: {
  conversationId: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  signal: AbortSignal;
  emit: (event: AgentEvent) => void;
}): Promise<MessagePart[]> => {
  const [skills, mcpTools, modelConfig] = await Promise.all([
    listSkills(),
    discoverMcpTools(),
    readModelConfig(),
  ]);
  const modelTools = mcpTools.map((tool) => tool.modelTool);
  if (skills.length) modelTools.push(skillTool(skills));
  const messages: ModelMessage[] = [
    { role: "system", content: systemPrompt(skills, modelConfig.systemPrompt) },
    ...history,
  ];
  const graph = createAgentGraph({
    conversationId,
    skills,
    mcpTools,
    modelTools,
    modelConfig,
    signal,
    emit,
  });
  const result = await graph.invoke({
    messages,
    pendingToolCalls: [],
    parts: [],
    activeSkills: [],
    turn: 0,
  }, { signal });
  return result.parts;
};
