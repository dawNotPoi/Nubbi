import type { McpServerConfig } from "../../types";

// 表单草稿：请求头从对象展开为可编辑的键值对数组。
export type HeaderDraft = { key: string; value: string };
export type McpDraft = Omit<McpServerConfig, "headers"> & { headers: HeaderDraft[] };

/**
 * 生成空的表单草稿。
 * @returns 全空的 MCP 表单草稿。
 */
const emptyMcp = (): McpDraft => ({
  id: "",
  name: "",
  enabled: true,
  url: "",
  headers: [],
});

/**
 * 服务端配置 → 表单草稿（headers 展开为数组）。
 * @param server 服务端保存的 MCP 配置，可空。
 * @returns 可用于表单编辑的草稿；server 为空时返回空草稿。
 */
export const toMcpDraft = (server: McpServerConfig | null): McpDraft => server
  ? { ...server, headers: Object.entries(server.headers).map(([key, value]) => ({ key, value })) }
  : emptyMcp();

/**
 * 表单草稿 → 服务端配置，做基础校验并过滤空请求头。
 * @param draft 表单编辑中的草稿。
 * @returns 校验通过的服务端配置；必填缺失或格式非法时抛出异常。
 */
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
