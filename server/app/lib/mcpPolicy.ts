export const MCP_POLICY_VERSION = 1;

export const MCP_NOTE_ACTIONS = [
  "read",
  "create",
  "update",
  "move",
  "archive",
  "trash",
  "restore",
] as const;

export const MCP_TOKEN_METADATA = {
  kind: "mcp",
  policyVersion: MCP_POLICY_VERSION,
} as const;

export const createMcpPermissions = (): Record<string, string[]> => ({
  note: [...MCP_NOTE_ACTIONS],
});

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

export const MCP_LIMITS = {
  defaultPageSize: 20,
  maxPageSize: 50,
  contentChunkSize: 20_000,
  maxResponseChars: 25_000,
} as const;
