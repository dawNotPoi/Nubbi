import type { McpServerConfig } from "../../types";

// 表单草稿：请求头/环境变量从对象展开为可编辑的键值对数组。
export type HeaderDraft = { key: string; value: string };
export type McpDraft = Omit<McpServerConfig, "headers" | "env"> & {
  transport: "http" | "stdio";
  url: string;
  headers: HeaderDraft[];
  env: HeaderDraft[];
  argsText: string;
  cwd: string;
};

/**
 * 对象 → 键值对数组。
 * @param record 原始键值对象。
 * @returns 键值对数组。
 */
const toPairs = (record: Record<string, string>): HeaderDraft[] =>
  Object.entries(record).map(([key, value]) => ({ key, value }));

/**
 * 键值对数组 → 对象；过滤空 key。
 * @param pairs 表单中的键值对数组。
 * @returns 过滤后的键值对象。
 */
const fromPairs = (pairs: HeaderDraft[]): Record<string, string> =>
  Object.fromEntries(
    pairs
      .map((item) => ({ key: item.key.trim(), value: item.value }))
      .filter((item) => item.key.length > 0)
      .map((item) => [item.key, item.value]),
  );

/**
 * 生成空的表单草稿。
 * @returns 全空的 MCP 表单草稿，默认 http 传输。
 */
const emptyMcp = (): McpDraft => ({
  id: "",
  name: "",
  enabled: true,
  transport: "http",
  url: "",
  headers: [],
  env: [],
  argsText: "",
  cwd: "",
});

/**
 * 服务端配置 → 表单草稿（headers/env 展开为数组，args 合并为每行一个）。
 * @param server 服务端保存的 MCP 配置，可空。
 * @returns 可用于表单编辑的草稿；server 为空时返回空草稿。
 */
export const toMcpDraft = (server: McpServerConfig | null): McpDraft => server
  ? {
      id: server.id,
      name: server.name,
      enabled: server.enabled,
      transport: server.transport ?? "http",
      url: server.url ?? "",
      headers: toPairs(server.headers),
      env: toPairs(server.env ?? {}),
      argsText: (server.args ?? []).join("\n"),
      cwd: server.cwd ?? "",
    }
  : emptyMcp();

/**
 * 表单草稿 → 服务端配置，按传输类型做基础校验并过滤空键值。
 * @param draft 表单编辑中的草稿。
 * @returns 校验通过的服务端配置；必填缺失或格式非法时抛出异常。
 */
export const fromMcpDraft = (draft: McpDraft): McpServerConfig => {
  const id = draft.id?.trim() ?? "";
  const name = draft.name.trim();
  if (!name) throw new Error("请填写名称");
  const base = {
    // 新增时 id 留空，由后端按名称自动生成。
    id: id || undefined,
    name,
    enabled: draft.enabled,
    transport: draft.transport,
    headers: fromPairs(draft.headers),
    env: fromPairs(draft.env),
    args: draft.argsText.split("\n").map((item) => item.trim()).filter(Boolean),
  };
  if (draft.transport === "stdio") {
    const command = draft.command?.trim() ?? "";
    if (!command) throw new Error("请填写启动命令");
    return { ...base, command };
  }
  const url = draft.url.trim();
  if (!url) throw new Error("请填写 MCP HTTP URL");
  if (!/^https?:\/\//i.test(url)) throw new Error("MCP URL 必须以 http:// 或 https:// 开头");
  return { ...base, url };
};
