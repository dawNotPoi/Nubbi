/** MCP 策略版本号，API Key 元数据中校验，升级需同步 */
export const MCP_POLICY_VERSION = 1;

/** MCP Agent 允许执行的笔记操作 */
export const MCP_NOTE_ACTIONS = [
  "read",
  "create",
  "update",
  "move",
  "archive",
  "trash",
  "restore",
] as const;

export type McpNoteAction = (typeof MCP_NOTE_ACTIONS)[number];

/** MCP Token 的固定元数据标记 */
export const MCP_TOKEN_METADATA = {
  kind: "mcp",
  policyVersion: MCP_POLICY_VERSION,
} as const;

/** 创建 MCP API Key 的默认笔记权限集 */
export const createMcpPermissions = (): Record<string, string[]> => ({
  note: [...MCP_NOTE_ACTIONS],
});

/** 判断 permissions 是否为 MCP 的标准权限指纹（仅 note + 全量动作） */
export const hasMcpPermissionFingerprint = (
  permissions: Record<string, string[]> | null | undefined,
): boolean => {
  if (!permissions || Object.keys(permissions).length !== 1) return false;
  const noteActions = permissions.note;
  return Boolean(
    noteActions &&
      noteActions.length === MCP_NOTE_ACTIONS.length &&
      MCP_NOTE_ACTIONS.every((action) => noteActions.includes(action)),
  );
};

/** MCP 请求的规模限制：分页与内容截断阈值 */
export const MCP_LIMITS = {
  defaultPageSize: 20,
  maxPageSize: 50,
  contentChunkSize: 20_000,
  maxResponseChars: 25_000,
} as const;
