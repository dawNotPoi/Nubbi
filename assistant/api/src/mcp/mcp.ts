import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { listMcpServers, type McpServerConfig } from "./mcp-config.js";
import type { ModelTool } from "../types.js";

export type McpTool = {
  modelTool: ModelTool;
  modelName: string;
  server: McpServerConfig;
  originalName: string;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

export type McpCallResult = { content: string; success: boolean };

export type McpConnectionTest = {
  serverName: string;
  toolCount: number;
  tools: Array<{ name: string; description: string }>;
};

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
const expandRecord = (
  record: Record<string, string>,
): Record<string, string> => Object.fromEntries(
  Object.entries(record).map(([key, value]) => [key, expandEnv(value)]),
);

/**
 * 创建 Streamable HTTP 传输层，URL 与请求头均支持环境变量注入。
 * @param server MCP 服务配置。
 * @returns 连接用的传输层实例。
 */
const createTransport = (server: McpServerConfig): Transport => {
  return new StreamableHTTPClientTransport(new URL(expandEnv(server.url)), {
    requestInit: { headers: expandRecord(server.headers) },
  });
};

/**
 * 建立一次 MCP 会话；失败时主动关闭客户端，避免残留连接。
 * @param server MCP 服务配置。
 * @param signal 可选的取消信号，用于中断连接。
 * @returns 已连接的 MCP 客户端。
 */
const connect = async (server: McpServerConfig, signal?: AbortSignal): Promise<Client> => {
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

/**
 * 生成模型可识别的工具名：前缀 serverId 避免不同服务间工具重名，
 * 并清理非法字符、限制长度（部分模型对工具名长度敏感）。
 * @param serverId MCP 服务 ID，作为工具名前缀。
 * @param toolName 工具原始名称。
 * @returns 拼接并清理后的模型工具名。
 */
const safeName = (serverId: string, toolName: string): string =>
  `mcp_${serverId}_${toolName}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);

/**
 * 连接单个 MCP 服务并枚举其工具，转换为模型可用的 function 定义。
 * @param server MCP 服务配置。
 * @returns 该服务的工具列表，含模型名、原始名与 function 定义。
 */
const discoverServerTools = async (server: McpServerConfig): Promise<McpTool[]> => {
  const client = await connect(server);
  try {
    const result = await client.listTools(undefined, { timeout: 10_000 });
    return result.tools.map((tool) => {
      const modelName = safeName(server.id, tool.name);
      return {
        modelName,
        server,
        originalName: tool.name,
        annotations: tool.annotations,
        modelTool: {
          type: "function" as const,
          function: {
            name: modelName,
            description: `[${server.name}] ${tool.description || tool.name}`,
            parameters: tool.inputSchema,
          },
        },
      };
    });
  } finally {
    await client.close();
  }
};

/**
 * 并发发现所有已启用 MCP 服务的工具。
 * 单个服务发现失败只告警并跳过，不影响其他服务与整体对话能力。
 * @returns 全部已启用服务的工具列表。
 */
export const discoverMcpTools = async (): Promise<McpTool[]> => {
  const servers = (await listMcpServers()).filter((server) => server.enabled);
  const groups = await Promise.all(servers.map(async (server) => {
    try {
      return await discoverServerTools(server);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`MCP ${server.name} 工具发现失败: ${message}`);
      return [];
    }
  }));
  return groups.flat();
};

/**
 * 测试连接单个 MCP 服务并返回可展示的工具清单。
 * @param server 待测试的 MCP 服务配置。
 * @returns 服务名、工具数量与工具名/描述列表。
 */
export const testMcpServer = async (
  server: McpServerConfig,
): Promise<McpConnectionTest> => {
  const tools = await discoverServerTools(server);
  return {
    serverName: server.name,
    toolCount: tools.length,
    tools: tools.map((tool) => ({
      name: tool.originalName,
      description: tool.modelTool.function.description,
    })),
  };
};

/**
 * 调用一次 MCP 工具，返回序列化后的内容与成功标记。
 * @param tool 目标 MCP 工具。
 * @param argumentsValue 工具调用参数。
 * @param signal 可选的取消信号。
 * @returns 工具执行结果（内容与是否成功）。
 */
export const callMcpTool = async (
  tool: McpTool,
  argumentsValue: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<McpCallResult> => {
  const client = await connect(tool.server, signal);
  try {
    const result = await client.callTool(
      { name: tool.originalName, arguments: argumentsValue },
      undefined,
      { timeout: 30_000, signal },
    );
    return {
      content: JSON.stringify(result, null, 2).slice(0, 30_000),
      success: result.isError !== true,
    };
  } finally {
    await client.close();
  }
};
