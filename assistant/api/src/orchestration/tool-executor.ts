import { loadSkill, type Skill } from "../skills.js";
import type { AgentEvent, MessagePart, ModelToolCall } from "../types.js";
import type { ToolGateway } from "../runtime/tool-gateway.js";

/** 激活 Skill 的专用工具名，模型通过调用它按需启用技能。 */
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

/**
 * 处理激活 Skill 的调用：校验存在性、防重复激活、
 * 加载指令正文并通过 instruction 字段注入下一轮模型输入。
 * @param call 模型发起的工具调用，arguments 中携带要激活的 Skill 名。
 * @param context 工具执行上下文，包含可用 Skill、已激活集合与事件回调。
 * @returns 工具执行结果：content 回传给模型，instruction 注入下轮，parts 收集到消息历史。
 */
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

/**
 * 执行一批工具调用。普通 MCP 工具交给 gateway；
 * Skill 激活调用串行执行，避免并发激活时读到不完整的 Skill 集合。
 * @param calls 本回合待执行的工具调用列表。
 * @param context 工具执行上下文，供 gateway 与 Skill 激活共用。
 * @returns 每个工具调用对应的执行结果数组，顺序与 calls 一致。
 */
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
