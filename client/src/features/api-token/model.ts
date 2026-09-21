export type TokenPurpose = "general" | "mcp";

export type ApiTokenItem = {
  id: string;
  name: string | null;
  start: string | null;
  createdAt: string | Date | null;
  lastRequest: string | Date | null;
  expiresAt: string | Date | null;
  metadata?: unknown;
  permissions?: unknown;
};

const MCP_PERMISSION_LABELS: Record<string, string> = {
  read: "读取",
  create: "创建",
  update: "编辑",
  move: "移动",
  archive: "归档",
  trash: "移入回收站",
  restore: "恢复",
};

const DEFAULT_MCP_PERMISSIONS = Object.values(MCP_PERMISSION_LABELS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseRecord = (value: unknown): Record<string, unknown> | null => {
  if (isRecord(value)) return value;
  if (typeof value !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const optionalDate = (value: unknown) =>
  typeof value === "string" || value instanceof Date ? value : null;

export const normalizeApiTokens = (value: unknown): ApiTokenItem[] => {
  const items = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.apiKeys)
      ? value.apiKeys
      : [];

  return items.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string") return [];

    return [{
      id: item.id,
      name: typeof item.name === "string" ? item.name : null,
      start: typeof item.start === "string" ? item.start : null,
      createdAt: optionalDate(item.createdAt),
      lastRequest: optionalDate(item.lastRequest),
      expiresAt: optionalDate(item.expiresAt),
      metadata: item.metadata,
      permissions: item.permissions,
    }];
  });
};

export const getTokenPurpose = (token: ApiTokenItem): TokenPurpose => {
  const metadata = parseRecord(token.metadata);
  return metadata?.kind === "mcp" ? "mcp" : "general";
};

export const getTokenPermissionLabels = (token: ApiTokenItem) => {
  const metadata = parseRecord(token.metadata);
  const permissions =
    parseRecord(token.permissions) ?? parseRecord(metadata?.permissions);
  const notePermissions = permissions?.note;

  if (Array.isArray(notePermissions)) {
    return notePermissions.flatMap((permission) =>
      typeof permission === "string" && MCP_PERMISSION_LABELS[permission]
        ? [MCP_PERMISSION_LABELS[permission]]
        : [],
    );
  }

  return getTokenPurpose(token) === "mcp" ? DEFAULT_MCP_PERMISSIONS : [];
};
