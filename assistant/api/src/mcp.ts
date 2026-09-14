import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { listMcpServers, type McpServerConfig } from "./mcp-config.js";
import type { ModelTool } from "./types.js";

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

const expandEnv = (value: string): string =>
  value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, name: string) => {
    return process.env[name] ?? "";
  });

const expandRecord = (
  record: Record<string, string>,
): Record<string, string> => Object.fromEntries(
  Object.entries(record).map(([key, value]) => [key, expandEnv(value)]),
);

const createTransport = (server: McpServerConfig): Transport => {
  return new StreamableHTTPClientTransport(new URL(expandEnv(server.url)), {
    requestInit: { headers: expandRecord(server.headers) },
  });
};

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

const safeName = (serverId: string, toolName: string): string =>
  `mcp_${serverId}_${toolName}`
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 64);

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
