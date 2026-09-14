import type { AgentEvent, TokenUsage } from "@nubbi/assistant-shared/contracts";
import { callMcpTool, type McpTool } from "../integrations/mcp/mcp.ts";
import { loadSkill, type Skill } from "../integrations/skills/skill-store.ts";
import type { RegisteredTool } from "../tools/registry.ts";
import { buildApprovalReview } from "../integrations/nubbi/approval-review.ts";

/** 工具组装依赖，仅运行层接触 MCP、技能文件和统计读取。 */
export type RunToolsInput = {
  mcpTools: McpTool[];
  skills: Skill[];
  publishEvent: (event: AgentEvent) => void;
  readUsage: () => Promise<TokenUsage | null>;
};

/**
 * 把外部工具和本地能力注册为同一种执行契约。
 * @param input 当前运行可用的能力与事件回调。
 * @returns 完整工具集合。
 */
export function createRunTools(input: RunToolsInput): RegisteredTool[] {
  const tools: RegisteredTool[] = input.mcpTools.map((tool) => ({
    definition: tool.definition,
    serverName: tool.server.name,
    originalName: tool.originalName,
    readOnly: tool.annotations?.readOnlyHint === true && tool.annotations.destructiveHint !== true,
    buildApprovalReview: (argumentsValue) => buildApprovalReview(tool, argumentsValue),
    invoke: (invocation) => callMcpTool(tool, invocation.arguments, invocation.abortSignal),
  }));
  tools.push({
    definition: {
      name: "assistant_session_cache_stats",
      description: "查询当前会话的模型 prompt 缓存命中率及用量；未报告时返回 null。",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    serverName: "assistant",
    originalName: "assistant_session_cache_stats",
    readOnly: true,
    invoke: async ({ abortSignal }) => {
      abortSignal.throwIfAborted();
      const usage = await input.readUsage();
      const hit = usage?.promptCacheHitTokens;
      const miss = usage?.promptCacheMissTokens;
      return {
        success: true,
        content: JSON.stringify({
          hit_tokens: hit ?? null,
          miss_tokens: miss ?? null,
          hit_rate: hit !== undefined && miss !== undefined && hit + miss > 0 ? hit / (hit + miss) : null,
        }),
      };
    },
  });
  if (input.skills.length) tools.push(createSkillTool(input));
  return tools;
}

/** 按运行隔离已激活技能；文件加载和事件发布不进入 Agent 循环。 */
function createSkillTool(input: RunToolsInput): RegisteredTool {
  const activeSkills = new Set<string>();
  return {
    definition: {
      name: "assistant_activate_skill",
      description: "按需激活适合当前任务的 Skill，同一 Skill 不要重复激活。",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string", enum: input.skills.map((skill) => skill.name) } },
        required: ["name"],
        additionalProperties: false,
      },
    },
    serverName: "assistant",
    originalName: "assistant_activate_skill",
    readOnly: true,
    presentation: "skill",
    invoke: async ({ arguments: argumentsValue, abortSignal }) => {
      abortSignal.throwIfAborted();
      const name = String(argumentsValue.name);
      if (activeSkills.has(name)) return { success: true, content: `Skill "${name}" 已激活` };
      const skill = await loadSkill(name);
      abortSignal.throwIfAborted();
      if (!skill) return { success: false, content: `Skill "${name}" 不存在或已禁用` };
      activeSkills.add(name);
      input.publishEvent({ type: "skill-active", name, description: skill.description });
      return {
        success: true,
        content: `Skill "${name}" 已激活`,
        instruction: `请遵循 Skill「${name}」：\n${skill.instructions}`,
        parts: [{ type: "skill", name, description: skill.description }],
      };
    },
  };
}
