import type { McpServerConfig } from "../../types.ts";

/** 请求头编辑行；ID 保持编辑过程中的组件身份稳定。 */
export type KeyValuePair = { key: string; value: string };

/**
 * 对象 → 键值对数组，用于表单编辑。
 * @param record 原始键值对象。
 * @returns 键值对数组。
 */
export const recordToPairs = (record: Record<string, string>): KeyValuePair[] =>
  Object.entries(record).map(([key, value]) => ({ key, value }));

/**
 * 键值对数组 → 对象；过滤空 key，key 做去空白处理。
 * @param pairs 表单编辑中的键值对数组。
 * @returns 过滤后的键值对象。
 */
export const pairsToRecord = (pairs: KeyValuePair[]): Record<string, string> =>
  Object.fromEntries(
    pairs
      .map((pair) => ({ key: pair.key.trim(), value: pair.value }))
      .filter((pair) => pair.key.length > 0)
      .map((pair) => [pair.key, pair.value]),
  );

/** MCP 服务表单草稿：http/stdio 两种传输的可编辑字段。 */
export type McpDraft = {
  // 仅编辑已有服务时携带，新增时留空由后端生成。
  id?: string;
  name: string;
  enabled: boolean;
  transport: "http" | "stdio";
  url: string;
  headers: KeyValuePair[];
  command: string;
  // 启动参数：每行一个，便于含空格参数编辑。
  argsText: string;
  // stdio 子进程可选工作目录。
  cwd: string;
  env: KeyValuePair[];
};

/**
 * 生成空的 MCP 表单草稿。
 * @returns 全空的草稿，默认 http 传输。
 */
export const emptyDraft = (): McpDraft => ({
  id: "",
  name: "",
  enabled: true,
  transport: "http",
  url: "",
  headers: [],
  command: "",
  argsText: "",
  cwd: "",
  env: [],
});

/**
 * 服务端配置 → 表单草稿（headers/env 展开为数组，args 合并为每行一个）。
 * @param server 服务端保存的 MCP 配置，可空。
 * @returns 可用于表单编辑的草稿。
 */
export const toDraft = (server: McpServerConfig | null): McpDraft =>
  server
    ? {
        id: server.id ?? "",
        name: server.name,
        enabled: server.enabled,
        transport: server.transport ?? "http",
        url: server.url ?? "",
        headers: recordToPairs(server.headers),
        command: server.command ?? "",
        argsText: (server.args ?? []).join("\n"),
        cwd: server.cwd ?? "",
        env: recordToPairs(server.env ?? {}),
      }
    : emptyDraft();

/**
 * 表单草稿 → 服务端配置，按传输类型做基础校验。
 * @param draft 表单编辑中的草稿。
 * @returns 校验通过的服务端配置；必填缺失或格式非法时抛出异常。
 */
export const toConfig = (draft: McpDraft): McpServerConfig => {
  const id = draft.id?.trim() ?? "";
  const name = draft.name.trim();
  if (!name) throw new Error("请填写名称");
  const base = {
    // 新增时 id 留空，由后端按名称自动生成。
    id: id || undefined,
    name,
    enabled: draft.enabled,
    transport: draft.transport,
    headers: pairsToRecord(draft.headers),
    args: draft.argsText
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean),
    env: pairsToRecord(draft.env),
  } as const;
  if (draft.transport === "stdio") {
    const command = draft.command.trim();
    if (!command) throw new Error("请填写启动命令");
    const cwd = draft.cwd.trim();
    return cwd ? { ...base, command, cwd } : { ...base, command };
  }
  const url = draft.url.trim();
  if (!url) throw new Error("请填写 MCP HTTP URL");
  // URL 必须为 http/https，用 URL 构造函数做完整校验。
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error();
    }
  } catch {
    throw new Error("MCP URL 必须使用 http:// 或 https://");
  }
  return { ...base, url };
};
