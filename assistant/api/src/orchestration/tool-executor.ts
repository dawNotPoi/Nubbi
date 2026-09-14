import { loadSkill, type Skill } from "../skills.js";
import type { AgentEvent, MessagePart, ModelToolCall } from "../types.js";
import type { ToolGateway } from "../runtime/tool-gateway.js";

export const skillToolName = "assistant_activate_skill";

type ToolExecutionContext = {
  skills: Skill[];
  activeSkills: Set<string>;
  gateway: ToolGateway;
  emit: (event: AgentEvent) => void;
};

export type ToolExecutionResult = {
  content: string;
  instruction?: string;
  parts: MessagePart[];
};

const activateSkill = async (
  call: ModelToolCall,
  context: ToolExecutionContext,
): Promise<ToolExecutionResult> => {
  const name = typeof call.arguments.name === "string" ? call.arguments.name : "";
  if (!context.skills.some((skill) => skill.name === name)) {
    return { content: `Skill "${name}" 不存在`, parts: [] };
  }
  if (context.activeSkills.has(name)) {
    return { content: `Skill "${name}" 已激活`, parts: [] };
  }
  const skill = await loadSkill(name);
  if (!skill) return { content: `Skill "${name}" 不存在`, parts: [] };
  context.activeSkills.add(name);
  context.emit({
    type: "skill-active",
    name: skill.name,
    description: skill.description,
  });
  return {
    content: `Skill "${name}" 已激活`,
    instruction: `请遵循 Skill「${skill.name}」：\n${skill.instructions}`,
    parts: [{ type: "skill", name: skill.name, description: skill.description }],
  };
};

export const executeToolCalls = async (
  calls: ModelToolCall[],
  context: ToolExecutionContext,
): Promise<ToolExecutionResult[]> => {
  let skillQueue = Promise.resolve();
  return Promise.all(calls.map((call) => {
    if (call.name !== skillToolName) return context.gateway.execute(call);
    const result = skillQueue.then(() => activateSkill(call, context));
    skillQueue = result.then(() => undefined, () => undefined);
    return result;
  }));
};
