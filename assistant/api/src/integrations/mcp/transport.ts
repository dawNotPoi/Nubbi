import { Client } from "@modelcontextprotocol/sdk/client/index.js";

import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";

import { type McpServerConfig } from "./mcp-config.ts";

/**
 * 将配置中的 ${ENV_NAME} 占位符展开为进程环境变量，避免把密钥写死在配置文件里。
 * @param value 可能包含占位符的原始字符串。
 * @returns 展开占位符后的字符串。
 */
const expandEnv = (value: string): string =>
  value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, name: string) => {
    return process.env[name] ?? "";
  });

/**
 * 对请求头对象里的每个值做环境变量展开。
 * @param record 请求头键值对。
 * @returns 展开后的请求头对象。
 */
const expandRecord = (record: Record<string, string>): Record<string, string> =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [key, expandEnv(value)]));

/**
 * 创建传输层：stdio 服务拉起子进程通信，HTTP 服务走 Streamable HTTP。
 * command/args/env 与 URL/请求头均支持 ${ENV_NAME} 环境变量展开。
 * @param server MCP 服务配置。
 * @returns 连接用的传输层实例。
 */
export const createTransport = (server: McpServerConfig): Transport => {
  if (server.transport === "stdio") {
    // SDK 会合并安全白名单变量（PATH 等）与这里传入的 env。
    return new StdioClientTransport({
      command: expandEnv(server.command ?? ""),
      args: server.args.map((arg) => expandEnv(arg)),
      env: expandRecord(server.env),
      // 可选工作目录：缺省时继承 Assistant 进程的 cwd。
      cwd: server.cwd ? expandEnv(server.cwd) : undefined,
    });
  }
  return new StreamableHTTPClientTransport(new URL(expandEnv(server.url ?? "")), {
    requestInit: { headers: expandRecord(server.headers) },
  });
};

/**
 * 建立一次 MCP 会话；失败时主动关闭客户端，避免残留连接。
 * @param server MCP 服务配置。
 * @param signal 可选的取消信号，用于中断连接。
 * @returns 已连接的 MCP 客户端。
 */
export const connect = async (server: McpServerConfig, signal?: AbortSignal): Promise<Client> => {
  const client = new Client({
    name: "personal-ai-assistant",
    version: "0.1.0",
  });
  try {
    await client.connect(createTransport(server), { timeout: 10_000, signal });
    return client;
  } catch (error) {
    await client.close().catch(() => undefined);
    throw error;
  }
};
