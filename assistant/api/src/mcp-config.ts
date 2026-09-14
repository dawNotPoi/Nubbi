import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { projectRoot } from "./env.js";

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

const normalizeLegacyServer = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  if (record.transport === "stdio") return null;
  const { transport: _transport, ...server } = record;
  return server;
};

export const listMcpServers = async (): Promise<McpServerConfig[]> => {
  const source = await readFile(configFile, "utf8").catch(() => "");
  if (!source) return [];
  const parsed = z.object({ servers: z.array(z.unknown()).default([]) })
    .parse(JSON.parse(source));
  return parsed.servers.flatMap((server) => {
    const result = mcpServerSchema.safeParse(normalizeLegacyServer(server));
    return result.success ? [result.data] : [];
  });
};

const writeMcpServers = async (servers: McpServerConfig[]): Promise<void> => {
  await mkdir(path.dirname(configFile), { recursive: true });
  await writeFile(configFile, `${JSON.stringify({ servers }, null, 2)}\n`, "utf8");
};

let mutationQueue: Promise<void> = Promise.resolve();

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

export const createMcpServer = async (
  input: McpServerConfig,
): Promise<McpServerConfig> => mutateServers(async (servers) => {
  if (servers.some((server) => server.id === input.id)) {
    throw new Error(`MCP Server ID "${input.id}" 已存在`);
  }
  await writeMcpServers([...servers, input]);
  return input;
});

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

export const deleteMcpServer = async (id: string): Promise<boolean> =>
  mutateServers(async (servers) => {
    const next = servers.filter((server) => server.id !== id);
    if (next.length === servers.length) return false;
    await writeMcpServers(next);
    return true;
  });
