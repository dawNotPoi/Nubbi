import { requestApproval } from "../approvals.js";
import { callMcpTool, type McpTool } from "../mcp.js";
import { loadSkill, type Skill } from "../skills.js";
import type {
  AgentEvent,
  MessagePart,
  ModelToolCall,
} from "../types.js";

export const skillToolName = "assistant_activate_skill";

type ToolExecutionContext = {
  conversationId: string;
  skills: Skill[];
  mcpTools: McpTool[];
  activeSkills: Set<string>;
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

const executeMcpTool = async (
  call: ModelToolCall,
  tool: McpTool,
  context: ToolExecutionContext,
): Promise<ToolExecutionResult> => {
  const approval = await requestApproval({
    threadId: context.conversationId,
    server: tool.server.name,
    tool: tool.originalName,
    arguments: call.arguments,
    emit: context.emit,
  });
  const approvalPart: MessagePart = {
    type: "approval",
    approvalId: approval.approvalId,
    server: tool.server.name,
    tool: tool.originalName,
    arguments: call.arguments,
    approved: approval.approved,
  };
  if (!approval.approved) {
    return { content: "用户拒绝了这次工具调用。", parts: [approvalPart] };
  }

  context.emit({
    type: "tool-start",
    server: tool.server.name,
    tool: tool.originalName,
    arguments: call.arguments,
  });
  let content: string;
  try {
    content = await callMcpTool(tool, call.arguments);
  } catch (error) {
    content = error instanceof Error ? `工具执行失败：${error.message}` : "工具执行失败";
  }
  const clipped = content.slice(0, 2_000);
  context.emit({
    type: "tool-result",
    server: tool.server.name,
    tool: tool.originalName,
    result: clipped,
  });
  return {
    content,
    parts: [
      approvalPart,
      {
        type: "tool",
        server: tool.server.name,
        tool: tool.originalName,
        arguments: call.arguments,
        result: clipped,
      },
    ],
  };
};

export const executeToolCall = async (
  call: ModelToolCall,
  context: ToolExecutionContext,
): Promise<ToolExecutionResult> => {
  if (call.name === skillToolName) return activateSkill(call, context);
  const tool = context.mcpTools.find((item) => item.modelName === call.name);
  if (!tool) return { content: `未知工具：${call.name}`, parts: [] };
  return executeMcpTool(call, tool, context);
};
