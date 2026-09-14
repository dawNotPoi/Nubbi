import { randomUUID } from "node:crypto";
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
  // 创建时可省略，由后端根据名称生成；更新时必填且不可变更。
  id: idSchema.optional(),
  name: z.string().trim().min(1, "名称不能为空").max(64),
  enabled: z.boolean().default(true),
  // http：通过 Streamable HTTP 连接远端；stdio：由本进程拉起子进程通信。
  transport: z.enum(["http", "stdio"]).default("http"),
  url: z.string().url("请输入有效的 MCP URL").optional(),
  headers: stringMapSchema,
  command: z.string().trim().min(1, "请输入启动命令").optional(),
  args: z.array(z.string()).default([]),
  // stdio 子进程的可选工作目录，缺省时继承 Assistant 进程目录。
  cwd: z.string().trim().min(1).optional(),
  env: stringMapSchema,
}).superRefine((server, context) => {
  if (server.transport === "http" && !server.url) {
    context.addIssue({
      code: "custom",
      message: "HTTP 类型的 MCP 服务必须填写 URL",
      path: ["url"],
    });
  }
  if (server.transport === "stdio" && !server.command) {
    context.addIssue({
      code: "custom",
      message: "stdio 类型的 MCP 服务必须填写启动命令",
      path: ["command"],
    });
  }
});

export type McpServerConfig = z.infer<typeof mcpServerSchema>;
const configFile = path.join(projectRoot, "config", "mcp.json");

/**
 * 兼容旧配置：无 transport 字段时由 Schema 默认值为 http，直接透传即可。
 * @param value 配置中的单个服务配置。
 * @returns 原样返回，交给 Schema 做默认值与交叉校验。
 */
const normalizeLegacyServer = (value: unknown): unknown => value;

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
 * 把服务名称转成小写 slug：非字母数字字符替换为连字符并压缩。
 * @param name 服务名称（可能为中文）。
 * @returns slug 化的名称片段；无可保留字符时返回空字符串。
 */
const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/**
 * 生成唯一服务 ID：优先用名称 slug，冲突或为空时追加短随机后缀。
 * @param name 服务名称。
 * @param existing 已存在的服务 ID 集合，用于避让。
 * @returns 满足 ID 规则且不与现有 ID 冲突的标识。
 */
const generateServerId = (name: string, existing: Set<string>): string => {
  const base = slugify(name).slice(0, 24) || "mcp";
  if (!existing.has(base)) return base;
  return base + "-" + randomUUID().slice(0, 6);
};

/**
 * 新建一个 MCP 服务配置；未提供 ID 时按名称自动生成。
 * @param input 服务配置，ID 可省略。
 * @returns 已保存的服务配置（含生成的 ID）；ID 冲突时抛出异常。
 */
export const createMcpServer = async (
  input: McpServerConfig,
): Promise<McpServerConfig> => mutateServers(async (servers) => {
  const id = input.id ?? generateServerId(
    input.name,
    new Set(servers.flatMap((server) => server.id ? [server.id] : [])),
  );
  if (servers.some((server) => server.id === id)) {
    throw new Error('MCP Server ID "' + id + '" 已存在');
  }
  const saved = { ...input, id };
  await writeMcpServers([...servers, saved]);
  return saved;
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
