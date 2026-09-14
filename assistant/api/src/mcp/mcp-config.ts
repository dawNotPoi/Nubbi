import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { projectRoot } from "../config/env.js";

const idSchema = z.string().regex(
  /^[a-z0-9-]+$/,
  "ID 只能包含小写字母、数字和连字符",
);
const stringMapSchema = z.record(z.string()).default({});

export const mcpServerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1, "名称不能为空").max(64),
  enabled: z.boolean().default(true),
  url: z.string().url("请输入有效的 MCP URL"),
  headers: stringMapSchema,
});

export type McpServerConfig = z.infer<typeof mcpServerSchema>;
const configFile = path.join(projectRoot, "config", "mcp.json");

/**
 * 兼容旧的 stdio 配置：遇到不支持的类型直接丢弃，其余字段按新 Schema 校验。
 * @param value 旧配置中的单个服务配置。
 * @returns 标准化后的服务配置；不支持的 stdio 类型返回 null。
 */
const normalizeLegacyServer = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (record.transport === "stdio") return null;
  const { transport: _transport, ...server } = record;
  return server;
};

/**
 * 读取并校验全部 MCP 服务配置。
 * @returns 配置中的有效服务列表，文件缺失或单条非法时自动跳过。
 */
export const listMcpServers = async (): Promise<McpServerConfig[]> => {
  const source = await readFile(configFile, "utf8").catch(() => "");
  if (!source) return [];
  const parsed = z.object({ servers: z.array(z.unknown()).default([]) })
    .parse(JSON.parse(source));
  // 逐条校验：单条非法配置只丢弃，不影响其余服务可用。
  return parsed.servers.flatMap((server) => {
    const result = mcpServerSchema.safeParse(normalizeLegacyServer(server));
    return result.success ? [result.data] : [];
  });
};

/**
 * 将服务列表写入配置文件。
 * @param servers 待写入的服务配置列表。
 * @returns 无返回值。
 */
const writeMcpServers = async (servers: McpServerConfig[]): Promise<void> => {
  await mkdir(path.dirname(configFile), { recursive: true });
  await writeFile(configFile, `${JSON.stringify({ servers }, null, 2)}\n`, "utf8");
};

let mutationQueue: Promise<void> = Promise.resolve();

/**
 * 串行化所有配置变更：文件读写没有事务，
 * 通过排队保证“读 - 改 - 写”不被并发请求交错，防止覆盖丢失。
 * @param operation 读改写的具体业务操作。
 * @returns operation 的执行结果。
 */
const mutateServers = async <T>(
  operation: (servers: McpServerConfig[]) => Promise<T>,
): Promise<T> => {
  const previous = mutationQueue;
  let release: () => void = () => undefined;
  mutationQueue = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await operation(await listMcpServers());
  } finally {
    release();
  }
};

/**
 * 新建一个 MCP 服务配置。
 * @param input 服务配置，ID 必须唯一。
 * @returns 已保存的服务配置；ID 已存在时抛出异常。
 */
export const createMcpServer = async (
  input: McpServerConfig,
): Promise<McpServerConfig> => mutateServers(async (servers) => {
  if (servers.some((server) => server.id === input.id)) {
    throw new Error(`MCP Server ID "${input.id}" 已存在`);
  }
  await writeMcpServers([...servers, input]);
  return input;
});

/**
 * 更新一个 MCP 服务配置。
 * @param id 待更新服务的 ID。
 * @param input 新的服务配置，ID 不可变更。
 * @returns 已保存的服务配置；服务不存在或 ID 被修改时抛出异常。
 */
export const updateMcpServer = async (
  id: string,
  input: McpServerConfig,
): Promise<McpServerConfig> => mutateServers(async (servers) => {
  const index = servers.findIndex((server) => server.id === id);
  if (index < 0) throw new Error("MCP Server 不存在");
  if (input.id !== id) throw new Error("MCP Server ID 不可修改");
  const next = [...servers];
  next[index] = input;
  await writeMcpServers(next);
  return input;
});

/**
 * 删除一个 MCP 服务配置。
 * @param id 待删除服务的 ID。
 * @returns 是否确实删除了服务。
 */
export const deleteMcpServer = async (id: string): Promise<boolean> =>
  mutateServers(async (servers) => {
    const next = servers.filter((server) => server.id !== id);
    if (next.length === servers.length) return false;
    await writeMcpServers(next);
    return true;
  });
