/** 已配置的技能引用（含启用状态）。 */
export type SkillRef = { name: string; description: string; enabled: boolean };

/** 已配置的 MCP 服务（含启用状态与工具数）。 */
export type McpServerRef = {
  id: string;
  name: string;
  endpoint: string;
  enabled: boolean;
  toolCount: number;
};

/** 顶层 / 命令标识。 */
export type CommandKey = "model" | "skill" | "mcp" | "status";

/** 顶层命令推荐列表：label 是输入提示，hint 是用途说明。 */
export const COMMANDS: Array<{ key: CommandKey; label: string; hint: string }> = [
  { key: "model", label: "/model", hint: "切换模型" },
  { key: "status", label: "/status", hint: "查看模型状态" },
  { key: "skill", label: "/skill", hint: "查看已配置的技能" },
  { key: "mcp", label: "/mcp", hint: "查看已配置的 MCP 服务" },
];
