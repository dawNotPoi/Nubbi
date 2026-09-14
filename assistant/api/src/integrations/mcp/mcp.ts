import { runWithClient } from "./client-pool.ts";

import { listMcpServers, type McpServerConfig } from "./mcp-config.ts";
import type { ToolDefinition } from "../../tools/tool-contracts.ts";

/** 发现后的工具定义及调用定位信息，不携带模型厂商包装。 */
export type McpTool = {
  definition: ToolDefinition;
  registeredName: string;
  server: McpServerConfig;
  originalName: string;
  annotations?: {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
  };
};

/** MCP 工具执行结果，失败标记来自工具协议。 */
export type McpCallResult = { content: string; success: boolean };

/** MCP 连接检查的展示结果，不包含鉴权信息。 */
export type McpConnectionTest = {
  serverName: string;
  toolCount: number;
  tools: Array<{ name: string; description: string }>;
};

/**
 * 生成模型可识别的工具名：前缀 serverId 避免不同服务间工具重名，
 * 并清理非法字符、限制长度（部分模型对工具名长度敏感）。
 * @param serverId MCP 服务 ID，作为工具名前缀。
 * @param toolName 工具原始名称。
 * @returns 拼接并清理后的模型工具名。
 */
const safeName = (serverId: string, toolName: string): string =>
  `mcp_${serverId}_${toolName}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);

/**
 * 连接单个 MCP 服务并枚举其工具，转换为模型可用的 function 定义。
 * @param server MCP 服务配置。
 * @param signal 当前任务的取消信号。
 * @returns 该服务的工具列表，含模型名、原始名与 function 定义。
 */
const discoverServerTools = async (server: McpServerConfig, signal?: AbortSignal): Promise<McpTool[]> =>
  runWithClient(server, signal, async (client) => {
    const result = await client.listTools(undefined, { timeout: 10_000, signal });
    return result.tools.map((tool) => {
      // 配置中的 id 保存后必有值，这里兜底避免 undefined 污染工具名。
      const registeredName = safeName(server.id ?? "mcp", tool.name);
      return {
        registeredName,
        server,
        originalName: tool.name,
        annotations: tool.annotations,
        definition: {
          name: registeredName,
          description: `[${server.name}] ${tool.description || tool.name}`,
          inputSchema: tool.inputSchema,
        },
      };
    });
  });

/**
 * 并发发现所有已启用 MCP 服务的工具。
 * 单个服务发现失败只告警并跳过，不影响其他服务与整体对话能力。
 * @param signal 当前任务的取消信号，取消不能被当作单服务故障忽略。
 * @returns 全部已启用服务的工具列表。
 */
export const discoverMcpTools = async (signal?: AbortSignal): Promise<McpTool[]> => {
  signal?.throwIfAborted();
  const servers = (await listMcpServers()).filter((server) => server.enabled);
  const groups = await Promise.all(
    servers.map(async (server) => {
      try {
        return await discoverServerTools(server, signal);
      } catch (error) {
        signal?.throwIfAborted();
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`MCP ${server.name} 工具发现失败: ${message}`);
        return [];
      }
    }),
  );
  return groups.flat();
};

/**
 * 测试连接单个 MCP 服务并返回可展示的工具清单。
 * @param server 待测试的 MCP 服务配置。
 * @returns 服务名、工具数量与工具名/描述列表。
 */
export const testMcpServer = async (server: McpServerConfig): Promise<McpConnectionTest> => {
  const tools = await discoverServerTools(server);
  return {
    serverName: server.name,
    toolCount: tools.length,
    tools: tools.map((tool) => ({
      name: tool.originalName,
      description: tool.definition.description,
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
): Promise<McpCallResult> =>
  runWithClient(tool.server, signal, async (client) => {
    const result = await client.callTool({ name: tool.originalName, arguments: argumentsValue }, undefined, {
      timeout: 30_000,
      signal,
    });
    return {
      content: JSON.stringify(result, null, 2).slice(0, 30_000),
      success: result.isError !== true,
    };
  });
