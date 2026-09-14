import type { McpTool } from "../mcp/mcp.ts";

import type { StoredModelConfig } from "../../features/settings/model-config.schema.ts";

import { codexClient, codexWorkspace } from "./client.ts";

import { toDynamicTools } from "./dynamic-tools.ts";

import { type ThreadResponse } from "./protocol.ts";

/**
 * 生成动态工具签名，用于判断 Codex 线程是否仍使用最新 MCP 工具集。
 * @param tools MCP 工具列表。
 * @returns 工具签名；空工具集返回空字符串。
 */
export const toolSignature = (tools: McpTool[]): string =>
  tools
    .map((tool) => `${tool.server.id ?? tool.server.name}:${tool.registeredName}`)
    .sort()
    .join("|");

/**
 * 创建新的 Codex 线程，只读沙箱、审批交给用户，工具只提供动态工具。
 * @param modelConfig 模型配置，用于指定模型与系统提示。
 * @param tools MCP 工具列表，转换为动态工具随线程创建传入。
 * @returns 新建线程的 ID。
 */
export const startThread = async (modelConfig: StoredModelConfig, tools: McpTool[]): Promise<string> => {
  const response = await codexClient.request<ThreadResponse>("thread/start", {
    model: modelConfig.model || null,
    cwd: codexWorkspace,
    // 关闭 Codex 自身的审批与写操作，能力边界统一由 ToolExecutor 控制。
    approvalPolicy: "never",
    approvalsReviewer: "user",
    sandbox: "read-only",
    developerInstructions: [
      modelConfig.systemPrompt,
      "你是 Nubbi Assistant。按需使用已安装 Skill；调用外部能力时优先使用提供的动态工具；可以使用内置联网搜索，但不使用命令执行或文件变更工具。",
    ]
      .filter(Boolean)
      .join("\n\n"),
    dynamicTools: toDynamicTools(tools),
  });
  return response.thread.id;
};

/**
 * 续接已有线程；续接失败（如本地 Codex 数据被清理）时回退为新线程。
 * 返回是否新建，供调用方决定是否注入历史上下文。
 * @param currentId 已保存的 Codex 线程 ID，可空。
 * @param modelConfig 模型配置，用于创建新线程时使用。
 * @param tools MCP 工具列表，仅在新建线程时使用。
 * @param storedToolSignature 上次保存的工具签名，旧记录可以缺失。
 * @returns 解析后的线程 ID 与是否新建的标记。
 */
export const resolveThread = async (
  currentId: string | undefined,
  modelConfig: StoredModelConfig,
  tools: McpTool[],
  storedToolSignature?: string,
): Promise<{ threadId: string; isNew: boolean }> => {
  // 旧线程没有签名时保持原行为（续接），避免老对话每次都被迫新建线程；
  // 有签名且与当前 MCP 工具集不一致时才强制新建线程。
  if (currentId && (storedToolSignature === undefined || storedToolSignature === toolSignature(tools))) {
    try {
      await codexClient.request<ThreadResponse>("thread/resume", {
        threadId: currentId,
        model: modelConfig.model || null,
        cwd: codexWorkspace,
        approvalPolicy: "never",
        approvalsReviewer: "user",
        sandbox: "read-only",
      });
      return { threadId: currentId, isNew: false };
    } catch {
      // 本地 Codex 数据被清理后，通过新线程恢复可用性。
    }
  }
  return { threadId: await startThread(modelConfig, tools), isNew: true };
};
