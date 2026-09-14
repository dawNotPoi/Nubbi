import type { McpServerConfig } from "../../types";

export type HeaderDraft = { key: string; value: string };
export type McpDraft = Omit<McpServerConfig, "headers"> & { headers: HeaderDraft[] };

const emptyMcp = (): McpDraft => ({
  id: "",
  name: "",
  enabled: true,
  url: "",
  headers: [],
});

export const toMcpDraft = (server: McpServerConfig | null): McpDraft => server
  ? { ...server, headers: Object.entries(server.headers).map(([key, value]) => ({ key, value })) }
  : emptyMcp();

export const fromMcpDraft = (draft: McpDraft): McpServerConfig => {
  const id = draft.id.trim();
  const name = draft.name.trim();
  const url = draft.url.trim();
  if (!id || !name || !url) throw new Error("请填写名称、ID 和 MCP URL");
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("ID 只能包含小写字母、数字和连字符");
  if (!/^https?:\/\//i.test(url)) throw new Error("MCP URL 必须以 http:// 或 https:// 开头");
  return {
    id,
    name,
    url,
    enabled: draft.enabled,
    headers: Object.fromEntries(draft.headers
      .map((item) => [item.key.trim(), item.value])
      .filter(([key]) => Boolean(key))),
  };
};
